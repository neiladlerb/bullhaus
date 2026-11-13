import { describe, expect, it } from "vitest";
import { BrandSchema } from "@bullhaus/core";
import { BULLHAUS_BRAND } from "@bullhaus/core";

describe("ficha de marca de Bull Haus", () => {
  it("pasa el esquema, así la web y la semilla usan una ficha válida", () => {
    const r = BrandSchema.safeParse(BULLHAUS_BRAND);
    expect(r.success ? "ok" : r.error.issues).toBe("ok");
  });
});

describe("migración de la ficha", () => {
  it("inserta la misma ficha que la semilla", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync(new URL("../../prisma/migrations/20261113150000_ficha_marca/migration.sql", import.meta.url), "utf8");
    const json = /SELECT "id", '(.+)'::jsonb/.exec(sql)?.[1]?.replace(/''/g, "'");
    expect(json && JSON.parse(json)).toEqual(BrandSchema.parse(BULLHAUS_BRAND));
  });
});
