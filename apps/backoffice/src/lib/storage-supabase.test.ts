import { describe, expect, it } from "vitest";
import { createSupabaseStorage } from "./storage-supabase";

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: Call[] = [];
  const fn = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fn, calls };
}

const header = (c: Call, name: string) => new Headers(c.init?.headers).get(name);

describe("createSupabaseStorage", () => {
  it("sube con upsert, tipo de contenido y la clave de servicio", async () => {
    const { fn, calls } = fakeFetch(() => new Response("{}", { status: 200 }));
    const s = createSupabaseStorage("https://abc.supabase.co/", "srv", fn);
    await s.put("fotos", "properties/p1/u1/md.webp", Buffer.from("x"), "image/webp");
    const c = calls[0]!;
    expect(c.url).toBe("https://abc.supabase.co/storage/v1/object/fotos/properties/p1/u1/md.webp");
    expect(c.init?.method).toBe("POST");
    expect(header(c, "Authorization")).toBe("Bearer srv");
    expect(header(c, "x-upsert")).toBe("true");
    expect(header(c, "Content-Type")).toBe("image/webp");
  });

  it("devuelve null si el archivo no existe y el contenido si existe", async () => {
    const { fn } = fakeFetch((url) =>
      url.endsWith("/no.webp") ? new Response("", { status: 400 }) : new Response(new Uint8Array([1, 2, 3])),
    );
    const s = createSupabaseStorage("https://abc.supabase.co", "srv", fn);
    expect(await s.get("fotos", "a/no.webp")).toBeNull();
    expect([...(await s.get("fotos", "a/si.webp"))!]).toEqual([1, 2, 3]);
  });

  it("no expone el cuerpo de la respuesta en los errores", async () => {
    const { fn } = fakeFetch(() => new Response("mandates/secreto.pdf", { status: 500 }));
    const s = createSupabaseStorage("https://abc.supabase.co", "srv", fn);
    await expect(s.get("documentos", "mandates/m1.pdf")).rejects.toThrow("leer falló con estado 500");
    await expect(s.get("documentos", "mandates/m1.pdf")).rejects.not.toThrow("secreto");
  });

  it("borra una carpeta recorriendo sus subcarpetas", async () => {
    const { fn, calls } = fakeFetch((url, init) => {
      if (url.includes("/object/list/")) {
        const { prefix } = JSON.parse(String(init?.body)) as { prefix: string };
        if (prefix === "properties/p1") return Response.json([{ name: "u1", id: null }]);
        if (prefix === "properties/p1/u1") return Response.json([{ name: "sm.webp", id: "1" }, { name: "md.webp", id: "2" }]);
        return Response.json([]);
      }
      return Response.json([]);
    });
    const s = createSupabaseStorage("https://abc.supabase.co", "srv", fn);
    await s.removePrefix("fotos", "properties/p1/");
    const del = calls.find((c) => c.init?.method === "DELETE")!;
    expect(del.url).toBe("https://abc.supabase.co/storage/v1/object/fotos");
    expect(JSON.parse(String(del.init?.body))).toEqual({ prefixes: ["properties/p1/u1/sm.webp", "properties/p1/u1/md.webp"] });
  });

  it("no llama a borrar si la carpeta está vacía", async () => {
    const { fn, calls } = fakeFetch(() => Response.json([]));
    const s = createSupabaseStorage("https://abc.supabase.co", "srv", fn);
    await s.removePrefix("fotos", "properties/vacia");
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(false);
  });
});
