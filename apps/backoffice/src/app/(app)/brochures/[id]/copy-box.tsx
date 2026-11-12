"use client";
import { useState } from "react";

export function CopyBox({ title, hint, text }: { title: string; hint: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <p className="mt-2 break-all rounded bg-white p-2 text-sm">{text}</p>
      <button
        type="button"
        className="btn-ghost mt-2 text-sm"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => setDone(true));
        }}
      >
        {done ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
