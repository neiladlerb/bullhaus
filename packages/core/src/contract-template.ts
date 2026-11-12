// Motor de plantillas de contratos (docs/contratos.md): {{campo}}, {{#if}}, {{#unless}},
// {{else}} y {{#each}} con @last, al estilo Handlebars. Un campo que falta no se inventa:
// queda marcado y se informa, y el back office no genera el documento.

type Data = Record<string, unknown>;

type Node =
  | { t: "text"; v: string }
  | { t: "var"; path: string }
  | { t: "if" | "unless"; path: string; yes: Node[]; no: Node[] }
  | { t: "each"; path: string; body: Node[] };

const TAG = /\{\{\s*([#/]?)(if|unless|each|else)?\s*([^}]*?)\s*\}\}/g;

function parse(src: string): Node[] {
  const root: Node[] = [];
  const stack: { node: Node | null; list: Node[]; inElse: boolean }[] = [{ node: null, list: root, inElse: false }];
  let last = 0;
  const top = () => stack[stack.length - 1]!;
  const push = (n: Node) => top().list.push(n);
  for (const m of src.matchAll(TAG)) {
    if (m.index! > last) push({ t: "text", v: src.slice(last, m.index) });
    last = m.index! + m[0].length;
    const [, sigil, kw, rest] = m;
    if (sigil === "#" && (kw === "if" || kw === "unless" || kw === "each")) {
      const node: Node = kw === "each" ? { t: "each", path: rest!, body: [] } : { t: kw, path: rest!, yes: [], no: [] };
      push(node);
      stack.push({ node, list: node.t === "each" ? node.body : node.yes, inElse: false });
    } else if (sigil === "/" && stack.length > 1) {
      stack.pop();
    } else if (!sigil && kw === "else" && !rest) {
      const cur = top();
      if (cur.node && (cur.node.t === "if" || cur.node.t === "unless")) {
        cur.list = cur.node.no;
        cur.inElse = true;
      }
    } else if (!sigil && !kw && rest) {
      push({ t: "var", path: rest });
    }
  }
  if (last < src.length) push({ t: "text", v: src.slice(last) });
  return root;
}

function lookup(path: string, scopes: Data[]): unknown {
  for (let i = scopes.length - 1; i >= 0; i--) {
    let cur: unknown = scopes[i];
    let ok = true;
    for (const key of path.split(".")) {
      if (cur && typeof cur === "object" && key in (cur as Data)) cur = (cur as Data)[key];
      else {
        ok = false;
        break;
      }
    }
    if (ok) return cur;
  }
  return undefined;
}

const truthy = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

export interface RenderResult {
  text: string;
  missing: string[];
}

export function renderTemplate(src: string, data: Data): RenderResult {
  const missing = new Set<string>();
  const body = src.replace(/<!--[\s\S]*?-->\s*/g, "");
  const walk = (nodes: Node[], scopes: Data[]): string =>
    nodes
      .map((n) => {
        if (n.t === "text") return n.v;
        if (n.t === "var") {
          const v = lookup(n.path, scopes);
          if (v === undefined || v === null || v === "") {
            missing.add(n.path);
            return `[FALTA: ${n.path}]`;
          }
          return String(v);
        }
        if (n.t === "each") {
          const list = lookup(n.path, scopes);
          if (!Array.isArray(list)) {
            missing.add(n.path);
            return "";
          }
          return list.map((item, i) => walk(n.body, [...scopes, { ...(item as Data), "@last": i === list.length - 1, "@index": i }])).join("");
        }
        const cond = truthy(lookup(n.path, scopes));
        return walk((n.t === "if" ? cond : !cond) ? n.yes : n.no, scopes);
      })
      .join("");
  const text = walk(parse(body), [data]).replace(/\n{3,}/g, "\n\n").trim();
  return { text, missing: [...missing] };
}

export const CONTRACT_KIND_LABELS = {
  orden_corretaje: "Orden de corretaje",
  carta_oferta: "Carta oferta y reserva",
  contrato_arriendo: "Contrato de arrendamiento",
  minuta_promesa: "Minuta de promesa",
} as const;

export const CONTRACT_STATUS_LABELS = {
  borrador: "Borrador",
  enviado: "Enviado a firma",
  firmado: "Firmado",
  anulado: "Anulado",
} as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "12 de noviembre de 2026" (fecha larga de los contratos). */
export function longDate(d: Date): string {
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export type ContractKind = keyof typeof CONTRACT_KIND_LABELS;
