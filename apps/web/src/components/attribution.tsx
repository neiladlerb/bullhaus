"use client";
import { useEffect } from "react";
import { attributionFromLanding, type Attribution } from "@bullhaus/core";

// Guarda de dónde llegó la persona (UTM, clic de anuncio, sitio de referencia) solo durante la
// visita, en sessionStorage: se borra al cerrar la pestaña y no sale del navegador salvo que
// envíe un formulario. Es lo que permite saber qué campaña trajo cada lead.
const KEY = "bh_origen";

export function readAttribution(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export function AttributionCapture() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, JSON.stringify(attributionFromLanding(window.location.href, document.referrer || undefined)));
    } catch {}
  }, []);
  return null;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Avisa a GA4 y a Meta que hubo un lead. Solo existen si la persona aceptó las cookies. */
export function trackLead(kind: string) {
  window.gtag?.("event", "generate_lead", { lead_type: kind });
  window.fbq?.("track", "Lead", { content_category: kind });
}
