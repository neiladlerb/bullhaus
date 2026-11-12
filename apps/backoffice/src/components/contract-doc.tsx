// Muestra un contrato generado (Markdown sencillo de las plantillas) como documento imprimible.
import { Fragment } from "react";

function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[VALIDAR ABOGADO\]|\[FALTA: [^\]]+\]|<br>)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p === "[VALIDAR ABOGADO]") return <mark key={`${key}-${i}`} className="rounded bg-amber-100 px-1 text-xs text-amber-900 print:bg-transparent">[validar con abogado]</mark>;
    if (p.startsWith("[FALTA")) return <mark key={`${key}-${i}`} className="bg-red-100 text-red-800">{p}</mark>;
    if (p === "<br>") return <br key={`${key}-${i}`} />;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}

export function ContractDoc({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <div className="space-y-3 font-serif text-[15px] leading-relaxed text-[#222]">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        const lines = b.split("\n");
        if (b.startsWith("# ")) return <h1 key={k} className="text-center font-sans text-lg font-bold tracking-wide">{inline(b.slice(2), k)}</h1>;
        if (b.startsWith("## ")) return <h2 key={k} className="pt-2 font-sans text-sm font-bold uppercase tracking-wide">{inline(b.slice(3), k)}</h2>;
        if (b.startsWith("### ")) return <h3 key={k} className="pt-1 font-sans text-sm font-semibold">{inline(b.slice(4), k)}</h3>;
        if (b.trim() === "---") return <hr key={k} className="my-6 border-line" />;
        if (lines.every((l) => l.startsWith("|"))) {
          const rows = lines.filter((l) => !/^\|\s*-+/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
          return (
            <table key={k} className="w-full border-collapse font-sans text-sm">
              <tbody>
                {rows.map((cells, ri) => (
                  <tr key={ri} className={ri === 0 ? "bg-paper font-semibold" : ""}>
                    {cells.map((c, ci) => (
                      <td key={ci} className="border border-line px-2 py-1 align-top">
                        {inline(c, `${k}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (lines.every((l) => /^(- |\d+\. )/.test(l))) {
          const ordered = /^\d+\. /.test(lines[0]!);
          const items = lines.map((l, li) => <li key={li}>{inline(l.replace(/^(- |\d+\. )/, ""), `${k}-${li}`)}</li>);
          return ordered ? <ol key={k} className="list-decimal space-y-1 pl-6">{items}</ol> : <ul key={k} className="list-disc space-y-1 pl-6">{items}</ul>;
        }
        return (
          <p key={k}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${k}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
