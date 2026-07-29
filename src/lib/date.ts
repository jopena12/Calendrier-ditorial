/** Utilitaires de dates locales (pas d'UTC : on manipule des jours calendaires). */

export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Lundi de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Grille du mois : semaines complètes de 7 jours, commençant le lundi. */
export function monthGrid(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const weeks: Date[][] = [];

  // `cursor` tombe toujours un lundi : on empile des semaines complètes
  // jusqu'à dépasser le dernier jour du mois.
  let cursor = start;
  do {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  } while (cursor <= last);

  return weeks;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const fullDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function monthLabel(date: Date): string {
  return monthFormatter.format(date);
}

export function dayLabel(date: Date): string {
  return dayFormatter.format(date);
}

export function fullDayLabel(date: Date): string {
  return fullDayFormatter.format(date);
}

export function weekLabel(anchor: Date): string {
  const days = weekDays(anchor);
  return `${dayLabel(days[0])} → ${dayLabel(days[6])}`;
}

/** Bornes ISO inclusives couvrant la vue demandée. */
export function viewRange(
  view: "month" | "week",
  anchor: Date,
): { from: string; to: string } {
  if (view === "week") {
    const days = weekDays(anchor);
    return { from: toISODate(days[0]), to: toISODate(days[6]) };
  }
  const weeks = monthGrid(anchor);
  const flat = weeks.flat();
  return { from: toISODate(flat[0]), to: toISODate(flat[flat.length - 1]) };
}
