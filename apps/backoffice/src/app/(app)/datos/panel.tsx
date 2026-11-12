"use client";
import { useState, useTransition } from "react";
import type { ImportResult } from "@/lib/site-import";
import { clearDemoAction, createDraftsAction, importCodeAction, loadDemoAction } from "./actions";

export function ImportPanel({ codes }: { codes: readonly string[] }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);

  async function run() {
    setRunning(true);
    setResults([]);
    // Una ficha por petición: cada una baja sus fotos y cabe en el tiempo de una función de Vercel.
    const queue = [...codes];
    const worker = async () => {
      for (let code = queue.shift(); code; code = queue.shift()) {
        let res: ImportResult;
        try {
          res = await importCodeAction(code);
        } catch {
          res = { code, ok: false, message: "Error del servidor", created: 0, updated: 0, photos: 0 };
        }
        setResults((r) => [...r, res]);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setRunning(false);
  }

  const ok = results.filter((r) => r.ok);
  const sum = (k: "created" | "updated" | "photos") => ok.reduce((a, r) => a + r[k], 0);

  return (
    <div>
      <button className="btn-brand" disabled={running} onClick={run}>
        {running ? `Importando… ${results.length}/${codes.length}` : `Importar ${codes.length} fichas de bullhaus.cl`}
      </button>
      {results.length > 0 && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-brand transition-all" style={{ width: `${(results.length / codes.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm">
            {sum("created")} creadas · {sum("updated")} actualizadas · {sum("photos")} fotos · {results.length - ok.length} con error
          </p>
          <ul className="mt-2 max-h-64 overflow-auto rounded-md border border-line bg-paper/50 p-2 font-mono text-xs">
            {results.map((r) => (
              <li key={r.code} className={r.ok ? "" : "text-red-700"}>
                {r.code} · {r.message}
                {r.photos ? ` · ${r.photos} fotos` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const ACTIONS = { createDraftsAction, loadDemoAction, clearDemoAction };

export function ActionButton({ action: name, label, variant = "btn-ghost", confirm }: { action: keyof typeof ACTIONS; label: string; variant?: string; confirm?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div>
      <button
        className={variant}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setMsg(await ACTIONS[name]()));
        }}
      >
        {pending ? "Procesando…" : label}
      </button>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
