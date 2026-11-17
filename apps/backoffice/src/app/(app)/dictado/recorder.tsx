"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// Web Speech API: viene en Chrome (Android y escritorio) y Safari (iPhone). TypeScript no trae sus tipos.
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "El navegador no tiene permiso para usar el micrófono. Actívalo en la configuración del sitio.",
  "no-speech": "No se escuchó nada. Acerca el celular y vuelve a intentar.",
  network: "Sin conexión: el dictado por voz necesita internet. Puedes escribir o usar el micrófono del teclado.",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-12 w-full sm:w-auto" disabled={pending}>
      {pending ? "Leyendo el dictado..." : "Proponer datos de la ficha"}
    </button>
  );
}

export function Recorder({ properties, defaultProperty }: { properties: { id: string; label: string }[]; defaultProperty?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);

  useEffect(() => setSupported(recognitionCtor() !== null), []);
  useEffect(() => () => rec.current?.stop(), []);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError("");
    const r = new Ctor();
    r.lang = "es-CL";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finals = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        if (res.isFinal) finals += res[0].transcript;
        else partial += res[0].transcript;
      }
      if (finals) setText((t) => `${t}${t && !/\s$/.test(t) ? " " : ""}${finals.trim()}.`);
      setInterim(partial);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "El dictado por voz se detuvo. Vuelve a tocar Dictar.");
      if (e.error === "not-allowed") wanted.current = false;
    };
    // El navegador corta solo tras un silencio: si el corredor no tocó Pausar, se retoma.
    r.onend = () => {
      setInterim("");
      if (wanted.current) {
        try {
          r.start();
          return;
        } catch {
          /* ya estaba iniciado */
        }
      }
      setListening(false);
    };
    rec.current = r;
    wanted.current = true;
    r.start();
    setListening(true);
  }

  function stop() {
    wanted.current = false;
    rec.current?.stop();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="dc-prop">Propiedad</label>
        <select id="dc-prop" name="propertyId" required className="input" defaultValue={defaultProperty ?? ""}>
          <option value="" disabled>Elige la propiedad</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="label mb-0" htmlFor="dc-text">Cómo es la propiedad</label>
          {supported && (
            <button type="button" onClick={listening ? stop : start} className={`${listening ? "btn-danger" : "btn-brand"} min-h-12 min-w-32`} aria-pressed={listening}>
              {listening ? "Pausar" : text ? "Seguir dictando" : "Dictar"}
            </button>
          )}
        </div>
        <textarea
          id="dc-text"
          name="transcript"
          required
          rows={10}
          className="input mt-2 text-base"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej.: Casa en Los Dominicos, 4 dormitorios y 3 baños, unos 220 metros construidos y 800 de terreno. Piscina y quincho, orientación norte."
        />
        {listening && (
          <p className="mt-2 text-sm text-muted" aria-live="polite">
            Escuchando{interim ? `: ${interim}` : "..."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
        <p className="mt-2 text-sm text-muted">
          {supported
            ? "Recorre la propiedad y cuenta lo que ves. Puedes corregir el texto antes de seguir."
            : "Este navegador no dicta por voz: usa el micrófono del teclado del celular o escribe."}{" "}
          Lo que no digas queda vacío en la ficha.
        </p>
      </div>

      <Submit />
    </div>
  );
}
