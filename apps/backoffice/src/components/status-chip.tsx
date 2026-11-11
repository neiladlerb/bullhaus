import { STATUS_LABELS, type PropertyStatus } from "@bullhaus/core";

const STYLES: Record<PropertyStatus, string> = {
  borrador: "bg-stone-100 text-stone-700",
  disponible: "bg-emerald-100 text-emerald-800",
  reservada: "bg-amber-100 text-amber-900",
  vendida: "bg-sky-100 text-sky-900",
  arrendada: "bg-sky-100 text-sky-900",
  retirada: "bg-stone-200 text-stone-600",
};

export function StatusChip({ status }: { status: PropertyStatus }) {
  return <span className={`chip ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
