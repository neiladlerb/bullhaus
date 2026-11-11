import Link from "next/link";
import { seesOnlyOwnProperties } from "@bullhaus/core";
import { requireUser } from "@/lib/auth";
import { activeBrokers } from "@/lib/properties";
import { PropertyForm } from "../property-form";

export default async function NewPropertyPage() {
  const user = await requireUser("properties.write");
  const lock = seesOnlyOwnProperties(user.role);
  const brokers = lock ? [{ email: user.email, name: user.name }] : await activeBrokers(user.tenantId);
  return (
    <div className="max-w-5xl">
      <Link href="/propiedades" className="text-sm text-muted hover:underline">← Propiedades</Link>
      <h1 className="mt-2 text-2xl font-semibold">Nueva propiedad</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Queda como borrador hasta que la marques como disponible. Las fotos y el mandato se agregan después de crearla.</p>
      <div className="card p-6">
        <PropertyForm
          values={{ status: "borrador", currency: "UF", operation: "venta", type: "casa", publishWeb: "no", brokerEmail: user.email }}
          brokers={brokers}
          lockBroker={lock}
          readOnly={false}
        />
      </div>
    </div>
  );
}
