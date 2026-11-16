import { STATUS_LABELS, type PropertyStatus } from "@bullhaus/core";

const STYLES: Record<PropertyStatus, string> = {
  borrador: "bg-paper text-muted",
  disponible: "bg-success-soft text-success",
  reservada: "bg-warning-soft text-warning",
  vendida: "bg-info-soft text-info",
  arrendada: "bg-info-soft text-info",
  retirada: "bg-paper text-muted",
};

export function StatusChip({ status }: { status: PropertyStatus }) {
  return <span className={`chip ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
