"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Las etiquetas de medición y publicidad (GA4, Meta, Google Ads) solo se cargan después de que la persona
// acepta las cookies (CLAUDE.md). Sin aceptación, no se carga nada de terceros.
const KEY = "bh_cookies";
type Choice = "si" | "no" | null;

function read(): Choice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "si" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

export function CookieConsent({ metaPixelId, gaId }: { metaPixelId?: string; gaId?: string }) {
  const ga = gaId?.replace(/[^A-Z0-9-]/gi, "");
  const [choice, setChoice] = useState<Choice>("no");
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => setChoice(read()), []);

  // Mientras el aviso está abierto, el botón flotante de WhatsApp sube su alto para no quedar tapado.
  useEffect(() => {
    const root = document.documentElement;
    const el = banner.current;
    if (choice !== null || !el) {
      root.style.removeProperty("--cookie-offset");
      return;
    }
    const sync = () => root.style.setProperty("--cookie-offset", `${el.offsetHeight + 12}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--cookie-offset");
    };
  }, [choice]);

  const decide = (c: "si" | "no") => {
    try {
      window.localStorage.setItem(KEY, c);
    } catch {}
    setChoice(c);
  };

  return (
    <>
      {choice === "si" && metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId.replace(/\D/g, "")}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === "si" && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag("js",new Date());gtag("config","${ga}");`}
          </Script>
        </>
      )}
      {choice === null && (
        <div ref={banner} role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-[10px] bg-coal p-4 text-sm text-white shadow-[0_8px_24px_rgb(0_0_0/0.12)] sm:inset-x-auto sm:left-5">
          <p>
            Usamos cookies propias para que el sitio funcione y, si lo aceptas, cookies de medición y publicidad de Meta y Google.{" "}
            <a href="/privacidad" className="underline">
              Más información
            </a>
          </p>
          {/* Las dos opciones con el mismo peso visual: el consentimiento debe ser libre (Ley 21.719). */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => decide("si")} className="btn border border-white/60 hover:bg-white/10">
              Aceptar
            </button>
            <button type="button" onClick={() => decide("no")} className="btn border border-white/60 hover:bg-white/10">
              Solo necesarias
            </button>
          </div>
        </div>
      )}
    </>
  );
}
