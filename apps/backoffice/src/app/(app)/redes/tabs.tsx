import Link from "next/link";

const LABEL = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" } as const;
type Platform = keyof typeof LABEL;

/** Pestañas de las cuentas conectadas (o en demostración). LinkedIn siempre aparece: es donde vive la serie "Bull Haus te asesora". */
export function RedesTabs({ accounts, current }: { accounts: Array<{ id: string; platform: Platform; handle: string }>; current: Platform }) {
  const tabs = (["instagram", "facebook", "linkedin"] as const).map((p) => ({ platform: p, account: accounts.find((a) => a.platform === p) })).filter((t) => t.account || t.platform === "linkedin");
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map(({ platform, account }) => (
        <Link
          key={platform}
          href={platform === "linkedin" ? "/redes/linkedin" : `/redes?red=${platform}`}
          className={`chip px-3 py-1 text-sm ${platform === current ? "bg-ink text-white" : "bg-white"}`}
        >
          {LABEL[platform]}
          {account && platform !== "linkedin" ? ` · ${account.handle}` : ""}
        </Link>
      ))}
    </div>
  );
}
