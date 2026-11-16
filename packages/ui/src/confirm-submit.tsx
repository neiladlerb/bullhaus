"use client";
// Botón que pide confirmación antes de enviar su formulario (componentes.md, Diálogo de confirmación).
// Se pone dentro de un <form action={...}>: el botón de confirmar vive en un <dialog> hijo del formulario,
// así que envía ese mismo formulario (o el formAction que reciba) sin JavaScript extra. Sirve con server actions.
import { useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type FormAction = ButtonHTMLAttributes<HTMLButtonElement>["formAction"];

export interface ConfirmSubmitProps {
  /** Texto del botón que abre el diálogo ("Borrar"). */
  children: ReactNode;
  /** Pregunta con la acción y el objeto: "¿Borrar esta foto?". */
  title: string;
  /** Una línea con la consecuencia: "No se puede recuperar." */
  consequence: string;
  /** Verbo del botón que confirma: "Borrar foto". */
  confirmLabel: string;
  /** Acción del formulario si el botón no usa la del <form>. */
  formAction?: FormAction;
  /** Clases del botón que abre el diálogo. */
  className?: string;
  /** Nombre accesible si el botón que abre el diálogo no tiene texto claro. */
  "aria-label"?: string;
  /** Rojo para destruir (por defecto); false para acciones principales irreversibles (publicar, emitir). */
  destructive?: boolean;
}

export function ConfirmSubmit({ children, title, consequence, confirmLabel, formAction, className, destructive = true, ...rest }: ConfirmSubmitProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" className={className} aria-label={rest["aria-label"]} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[10px] bg-white p-6 text-text shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop:bg-black/40"
      >
        <p id={`${id}-t`} className="text-base font-semibold text-heading">
          {title}
        </p>
        <p id={`${id}-d`} className="mt-1 text-sm text-muted">
          {consequence}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            className="min-h-11 rounded-md border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:bg-paper sm:min-h-10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            formAction={formAction}
            onClick={() => ref.current?.close()}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold text-white sm:min-h-10 ${destructive ? "bg-danger hover:brightness-90" : "bg-brand-dark hover:bg-brand-deep"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
