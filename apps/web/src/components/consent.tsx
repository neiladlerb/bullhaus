"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

// Las etiquetas de publicidad (Meta, Google Ads) solo se cargan después de que la persona
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

export function CookieConsent({ metaPixelId }: { metaPixelId?: string }) {
  const [choice, setChoice] = useState<Choice>("no");
  useEffect(() => setChoice(read()), []);

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
      {choice === null && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-2xl bg-coal p-4 text-sm text-white shadow-2xl sm:inset-x-auto sm:left-5">
          <p>
            Usamos cookies propias para que el sitio funcione y, si lo aceptas, cookies de medición y publicidad de Meta y Google.{" "}
            <a href="/privacidad" className="underline">
              Más información
            </a>
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide("si")} className="btn-brand py-2">
              Aceptar
            </button>
            <button onClick={() => decide("no")} className="btn border border-white/30 py-2 hover:bg-white/10">
              Solo necesarias
            </button>
          </div>
        </div>
      )}
    </>
  );
}
