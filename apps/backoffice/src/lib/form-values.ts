import { formatDate } from "@bullhaus/core";
import type { Property } from "@bullhaus/db";

const cl = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

/** Convierte una propiedad de la base de datos en los textos del formulario (formato chileno). */
export function propertyToFormValues(p: Property & { broker: { email: string } }): Record<string, string> {
  const n = (v: { toString(): string } | number | null) => (v === null ? "" : cl.format(Number(v.toString())));
  const b = (v: boolean | null) => (v === null ? "" : v ? "si" : "no");
  return {
    code: p.code,
    operation: p.operation,
    type: p.type,
    status: p.status,
    comuna: p.comuna,
    sector: p.sector ?? "",
    price: n(p.price),
    currency: p.currency,
    m2Useful: n(p.m2Useful),
    m2Land: n(p.m2Land),
    bedrooms: n(p.bedrooms),
    bathrooms: n(p.bathrooms),
    parking: n(p.parking),
    storage: n(p.storage),
    commonExpensesClp: n(p.commonExpensesClp),
    availableFrom: p.availableFrom ? formatDate(p.availableFrom) : "",
    pets: p.pets ?? "",
    furnished: b(p.furnished),
    brokerEmail: p.broker.email,
    publishWeb: p.publishWeb ? "si" : "no",
    addressPrivate: p.addressPrivate ?? "",
    instagramUrl: p.instagramUrl ?? "",
    adIds: p.adIds.join(", "),
    description: p.description ?? "",
  };
}
