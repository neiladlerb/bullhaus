// Driver de Supabase Storage por su API REST (sin SDK). Lo usa storage.ts cuando están
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ambos buckets se crean como privados:
// las fotos salen al navegador solo a través de /media, que filtra qué rutas son públicas.

export interface StorageDriver {
  put(bucket: string, key: string, data: Buffer, contentType: string): Promise<void>;
  get(bucket: string, key: string): Promise<Buffer | null>;
  removePrefix(bucket: string, prefix: string): Promise<void>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ListItem {
  name: string;
  id: string | null;
}

const LIST_PAGE = 100;

export function createSupabaseStorage(baseUrl: string, serviceKey: string, fetchImpl: FetchLike = fetch): StorageDriver {
  const root = `${baseUrl.replace(/\/+$/, "")}/storage/v1`;
  const auth = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const objectUrl = (bucket: string, key: string) =>
    `${root}/object/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;

  async function fail(action: string, res: Response): Promise<never> {
    // No incluimos el cuerpo de la respuesta: puede traer rutas de documentos privados.
    throw new Error(`Supabase Storage: ${action} falló con estado ${res.status}`);
  }

  async function list(bucket: string, prefix: string): Promise<ListItem[]> {
    const items: ListItem[] = [];
    for (let offset = 0; ; offset += LIST_PAGE) {
      const res = await fetchImpl(`${root}/object/list/${encodeURIComponent(bucket)}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: LIST_PAGE, offset }),
      });
      if (!res.ok) await fail("listar", res);
      const page = (await res.json()) as ListItem[];
      items.push(...page);
      if (page.length < LIST_PAGE) return items;
    }
  }

  async function collect(bucket: string, prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const item of await list(bucket, prefix)) {
      const path = `${prefix}/${item.name}`;
      // En la API de Supabase las carpetas vienen con id null.
      if (item.id === null) keys.push(...(await collect(bucket, path)));
      else keys.push(path);
    }
    return keys;
  }

  return {
    async put(bucket, key, data, contentType) {
      const res = await fetchImpl(objectUrl(bucket, key), {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType, "x-upsert": "true" },
        body: new Uint8Array(data),
      });
      if (!res.ok) await fail("subir", res);
    },

    async get(bucket, key) {
      const res = await fetchImpl(objectUrl(bucket, key), { headers: auth });
      if (res.status === 400 || res.status === 404) return null;
      if (!res.ok) await fail("leer", res);
      return Buffer.from(await res.arrayBuffer());
    },

    async removePrefix(bucket, prefix) {
      const clean = prefix.replace(/\/+$/, "");
      const keys = await collect(bucket, clean);
      if (keys.length === 0) return;
      const res = await fetchImpl(`${root}/object/${encodeURIComponent(bucket)}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: keys }),
      });
      if (!res.ok) await fail("borrar", res);
    },
  };
}
