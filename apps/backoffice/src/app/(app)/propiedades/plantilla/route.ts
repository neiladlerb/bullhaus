import { can } from "@bullhaus/core";
import { getCurrentUser } from "@/lib/auth";
import { buildTemplate } from "@/lib/spreadsheet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "properties.import")) return new Response("No autorizado", { status: 403 });
  const body = await buildTemplate();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="planilla-propiedades-make.xlsx"',
    },
  });
}
