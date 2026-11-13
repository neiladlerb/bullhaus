import { describe, expect, it } from "vitest";
import { AttributionSchema, attributionChannel, attributionFromLanding, comunaSlug } from "./attribution";

describe("origen del lead", () => {
  it("lee UTM, identificadores de clic y página de entrada", () => {
    const a = attributionFromLanding("https://www.bullhaus.cl/vender?utm_source=facebook&utm_medium=paid_social&utm_campaign=captacion-nov&fbclid=AbC", "https://l.facebook.com/x?y=1");
    expect(a).toEqual({ utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "captacion-nov", fbclid: "AbC", landingPath: "/vender", referrerHost: "l.facebook.com" });
    expect(attributionChannel(a)).toBe("meta_ads");
  });

  it("guarda solo el dominio de referencia, y nunca el propio", () => {
    expect(attributionFromLanding("https://www.bullhaus.cl/", "https://www.google.com/search?q=corredora+las+condes").referrerHost).toBe("google.com");
    expect(attributionFromLanding("https://www.bullhaus.cl/propiedades", "https://bullhaus.cl/").referrerHost).toBeUndefined();
  });

  it("clasifica el canal", () => {
    expect(attributionChannel({ gclid: "x" })).toBe("google_ads");
    expect(attributionChannel({ utmSource: "google", utmMedium: "cpc" })).toBe("google_ads");
    expect(attributionChannel({ referrerHost: "google.cl" })).toBe("google_organico");
    expect(attributionChannel({ utmSource: "instagram", utmMedium: "bio" })).toBe("redes_organico");
    expect(attributionChannel({ referrerHost: "l.instagram.com" })).toBe("redes_organico");
    expect(attributionChannel({ utmMedium: "email" })).toBe("email");
    expect(attributionChannel({ referrerHost: "portalinmobiliario.com" })).toBe("referencia");
    expect(attributionChannel({})).toBe("directo");
  });

  it("una URL inválida no rompe nada y el esquema corta valores largos", () => {
    expect(attributionFromLanding("no es url", undefined)).toEqual({});
    expect(AttributionSchema.safeParse({ utmSource: "x".repeat(121) }).success).toBe(false);
  });
});

describe("comunaSlug", () => {
  it("quita tildes y espacios", () => {
    expect(comunaSlug("Lo Barnechea")).toBe("lo-barnechea");
    expect(comunaSlug("Ñuñoa")).toBe("nunoa");
    expect(comunaSlug("Viña del Mar")).toBe("vina-del-mar");
  });
});
