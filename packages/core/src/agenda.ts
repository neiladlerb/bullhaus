// Agenda: visitas, tasaciones y llamadas de cada corredor, horarios libres para agendar desde la web e hitos
// de cada propiedad hasta la venta o el arriendo. Todo en hora de Santiago (America/Santiago), con cambio de
// horario incluido: las fechas se guardan en UTC y se muestran en hora chilena.

import { TIMEZONE } from "./outreach";

export const AGENDA_TZ = TIMEZONE;

export const APPOINTMENT_KINDS = ["visita", "tasacion", "llamada", "reunion", "firma", "otro"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];
export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  visita: "Visita",
  tasacion: "Tasación",
  llamada: "Llamada",
  reunion: "Reunión",
  firma: "Firma",
  otro: "Otro",
};

/** por_confirmar: la pidió el contacto desde la web y el horario queda tomado hasta que el corredor la confirme. */
export const APPOINTMENT_STATUSES = ["por_confirmar", "confirmada", "realizada", "no_asistio", "cancelada"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  por_confirmar: "Por confirmar",
  confirmada: "Confirmada",
  realizada: "Realizada",
  no_asistio: "No asistió",
  cancelada: "Cancelada",
};
/** Estados que ocupan el horario del corredor. */
export const BUSY_STATUSES: readonly AppointmentStatus[] = ["por_confirmar", "confirmada"];

export const APPOINTMENT_SOURCES = ["web", "backoffice", "whatsapp"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export function isAppointmentKind(v: unknown): v is AppointmentKind {
  return typeof v === "string" && (APPOINTMENT_KINDS as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------------------------------------
// Disponibilidad: por día de la semana (0 = domingo), tramos "HH:MM-HH:MM" en hora de Santiago.

export type WeeklyAvailability = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", string[]>;

export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  "0": [],
  "1": ["10:00-13:00", "15:00-19:00"],
  "2": ["10:00-13:00", "15:00-19:00"],
  "3": ["10:00-13:00", "15:00-19:00"],
  "4": ["10:00-13:00", "15:00-19:00"],
  "5": ["10:00-13:00", "15:00-18:00"],
  "6": ["10:00-14:00"],
};

export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

const RANGE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

/** Convierte "10:00-13:00" en minutos desde medianoche. null si el texto no sirve o termina antes de empezar. */
export function parseRange(s: string): [number, number] | null {
  const m = RANGE.exec(s.trim());
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(m[3]) * 60 + Number(m[4]);
  return b > a ? [a, b] : null;
}

/** Lee la disponibilidad guardada (JSON); lo que no calza se descarta y, si no queda nada, usa la por defecto. */
export function normalizeAvailability(raw: unknown): WeeklyAvailability {
  if (!raw || typeof raw !== "object") return DEFAULT_AVAILABILITY;
  const out = { ...DEFAULT_AVAILABILITY };
  let any = false;
  for (const d of ["0", "1", "2", "3", "4", "5", "6"] as const) {
    const v = (raw as Record<string, unknown>)[d];
    if (!Array.isArray(v)) continue;
    out[d] = v.filter((x): x is string => typeof x === "string" && parseRange(x) !== null);
    any = true;
  }
  return any ? out : DEFAULT_AVAILABILITY;
}

// ---------------------------------------------------------------------------------------------------------
// Zona horaria sin librerías: Intl da la hora local de un instante; con eso se calcula el desfase.

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: AGENDA_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(date: Date): LocalParts {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WD[p.weekday as string] ?? 0,
  };
}

/** Instante UTC que corresponde a una fecha y hora de Santiago. */
export function zonedToUtc(year: number, month: number, day: number, minutes: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  const offsetAt = (t: number) => {
    const l = localParts(new Date(t));
    return Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute) - t;
  };
  let t = guess - offsetAt(guess);
  // Segunda pasada por si el desfase cambia entre el intento y el resultado (día del cambio de hora).
  t = guess - offsetAt(t);
  return new Date(t);
}

/** "2026-11-20": la fecha en Santiago, para agrupar por día. */
export function localDayKey(date: Date): string {
  const l = localParts(date);
  return `${l.year}-${String(l.month).padStart(2, "0")}-${String(l.day).padStart(2, "0")}`;
}

/** Inicio (00:00 en Santiago) del día indicado por la clave "aaaa-mm-dd". */
export function dayStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return zonedToUtc(y, m, d, 0);
}

/** Suma días a una clave "aaaa-mm-dd" (calendario, sin horas). */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** Lunes de la semana de la clave dada. */
export function weekStartKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDaysKey(key, wd === 0 ? -6 : 1 - wd);
}

export function formatTime(date: Date): string {
  const l = localParts(date);
  return `${String(l.hour).padStart(2, "0")}:${String(l.minute).padStart(2, "0")}`;
}

/** "jueves 20/11/2026" */
export function formatDayLong(date: Date): string {
  const l = localParts(date);
  return `${WEEKDAY_LABELS[l.weekday]!.toLowerCase()} ${String(l.day).padStart(2, "0")}/${String(l.month).padStart(2, "0")}/${l.year}`;
}

/** "jueves 20/11/2026 a las 11:00" */
export function formatWhen(date: Date): string {
  return `${formatDayLong(date)} a las ${formatTime(date)}`;
}

// ---------------------------------------------------------------------------------------------------------
// Horarios libres

export interface Interval {
  start: Date;
  end: Date;
}

export interface SlotOptions {
  now: Date;
  availability: WeeklyAvailability;
  /** Duración de la visita (AgentSetting.visitMinutes). */
  durationMin: number;
  /** Antelación mínima (AgentSetting.minNoticeHours). */
  minNoticeHours: number;
  /** Citas que ya ocupan al corredor. */
  busy: Interval[];
  /** Cuántos días hacia adelante se ofrecen. */
  days?: number;
  /** Cada cuánto parte un horario. */
  stepMin?: number;
  /** Margen entre citas para trasladarse. */
  bufferMin?: number;
}

export interface DaySlots {
  day: string;
  slots: Date[];
}

export function freeSlots(o: SlotOptions): DaySlots[] {
  const days = o.days ?? 14;
  const step = o.stepMin ?? 60;
  const buffer = (o.bufferMin ?? 15) * 60_000;
  const earliest = o.now.getTime() + o.minNoticeHours * 3_600_000;
  const out: DaySlots[] = [];
  let key = localDayKey(o.now);
  for (let i = 0; i < days; i++, key = addDaysKey(key, 1)) {
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    const wd = String(new Date(Date.UTC(y, m - 1, d)).getUTCDay()) as keyof WeeklyAvailability;
    const slots: Date[] = [];
    for (const r of o.availability[wd]) {
      const range = parseRange(r);
      if (!range) continue;
      for (let min = range[0]; min + o.durationMin <= range[1]; min += step) {
        const start = zonedToUtc(y, m, d, min);
        const end = new Date(start.getTime() + o.durationMin * 60_000);
        if (start.getTime() < earliest) continue;
        const clash = o.busy.some((b) => start.getTime() < b.end.getTime() + buffer && end.getTime() + buffer > b.start.getTime());
        if (!clash) slots.push(start);
      }
    }
    if (slots.length) out.push({ day: key, slots });
  }
  return out;
}

/** ¿Sigue libre este horario? Se vuelve a comprobar al guardar, porque otra persona pudo tomarlo. */
export function isSlotFree(start: Date, o: Omit<SlotOptions, "days">): boolean {
  const days = Math.ceil((start.getTime() - o.now.getTime()) / 86_400_000) + 2;
  return freeSlots({ ...o, days: Math.max(1, days) }).some((d) => d.slots.some((s) => s.getTime() === start.getTime()));
}

// ---------------------------------------------------------------------------------------------------------
// Mensaje de confirmación. Lo envía el corredor desde su WhatsApp (enlace con el texto armado); el sistema no
// escribe solo. La dirección exacta solo va aquí, al confirmar la visita (CLAUDE.md).

export function visitConfirmationText(o: { contactName: string; when: Date; propertyCode: string | null; address: string | null; brokerName: string; brandName: string }): string {
  const first = o.contactName.trim().split(/\s+/)[0] ?? o.contactName;
  const lines = [
    `Hola ${first}, te escribe ${o.brokerName} de ${o.brandName}.`,
    `Te confirmo la visita${o.propertyCode ? ` a la propiedad ${o.propertyCode}` : ""} el ${formatWhen(o.when)}.`,
  ];
  if (o.address) lines.push(`Dirección: ${o.address}.`);
  lines.push("Si necesitas cambiar el horario, respóndeme por aquí.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------------------
// Hitos de la propiedad: lo que hay que hacer desde la captación hasta la entrega.

export interface MilestoneDef {
  key: string;
  label: string;
  /** Se marca solo a partir de los datos del back office; no se edita a mano. */
  auto?: boolean;
}

const COMMON_START: MilestoneDef[] = [
  { key: "tasacion", label: "Tasación realizada" },
  { key: "mandato", label: "Orden de corretaje firmada", auto: true },
  { key: "certificados", label: "Certificados de la propiedad cargados", auto: true },
  { key: "fotos", label: "Fotos cargadas", auto: true },
  { key: "ficha_aprobada", label: "Ficha y descripción aprobadas" },
  { key: "publicada_web", label: "Publicada en la web", auto: true },
  { key: "difusion", label: "Publicada en portales y redes" },
  { key: "primera_visita", label: "Primera visita realizada", auto: true },
];

export const MILESTONES: Record<"venta" | "arriendo", MilestoneDef[]> = {
  venta: [
    ...COMMON_START,
    { key: "oferta", label: "Oferta recibida" },
    { key: "reserva", label: "Reserva firmada" },
    { key: "kyc", label: "KYC de las partes aprobado" },
    { key: "promesa", label: "Promesa de compraventa firmada" },
    { key: "escritura", label: "Escritura firmada" },
    { key: "inscripcion", label: "Inscrita en el Conservador" },
    { key: "entrega", label: "Entrega de la propiedad" },
  ],
  arriendo: [
    ...COMMON_START,
    { key: "postulante", label: "Postulante elegido" },
    { key: "kyc", label: "KYC de las partes aprobado" },
    { key: "contrato", label: "Contrato de arriendo firmado" },
    { key: "entrega", label: "Entrega con inventario" },
  ],
};

export interface MilestoneFacts {
  hasMandate: boolean;
  hasCertificates: boolean;
  photoCount: number;
  publishedOnWeb: boolean;
  doneVisits: number;
}

export interface MilestoneRow extends MilestoneDef {
  doneAt: Date | null;
  dueAt: Date | null;
}

/** Une la lista del tipo de operación con lo guardado y con lo que se deduce de los datos. */
export function milestoneRows(operation: "venta" | "arriendo", stored: { key: string; doneAt: Date | null; dueAt: Date | null }[], facts: MilestoneFacts, now: Date = new Date()): MilestoneRow[] {
  const byKey = new Map(stored.map((s) => [s.key, s]));
  const auto: Record<string, boolean> = {
    mandato: facts.hasMandate,
    certificados: facts.hasCertificates,
    fotos: facts.photoCount > 0,
    publicada_web: facts.publishedOnWeb,
    primera_visita: facts.doneVisits > 0,
  };
  return MILESTONES[operation].map((m) => {
    const s = byKey.get(m.key);
    const done = m.auto ? (auto[m.key] ? (s?.doneAt ?? now) : null) : (s?.doneAt ?? null);
    return { ...m, doneAt: done, dueAt: s?.dueAt ?? null };
  });
}

/** El siguiente hito pendiente: lo que el corredor tiene que hacer ahora con la propiedad. */
export function nextMilestone(rows: MilestoneRow[]): MilestoneRow | null {
  return rows.find((r) => !r.doneAt) ?? null;
}
