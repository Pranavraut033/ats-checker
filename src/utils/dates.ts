import { ParsedDateRange, ParsedExperienceEntry } from "../types/parser";

// ponytail: German/French month names added inline alongside English — same flat map.
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  // German
  januar: 1,
  jänner: 1,
  februar: 2,
  märz: 3,
  maerz: 3,
  mai: 5,
  juni: 6,
  juli: 7,
  oktober: 10,
  dezember: 12,
  // French
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

interface ParsedDateToken {
  year: number;
  month?: number;
}

function parseDateToken(raw: string): ParsedDateToken | null {
  const cleaned = raw.trim().toLowerCase();
  // ponytail: à-ÿ range added so accented German/French month names (März, août) still match.
  const monthMatch = cleaned.match(/([a-zà-ÿ]{3,9})\s*(\d{4})/i);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const year = Number.parseInt(monthMatch[2], 10);
    const month = MONTHS[monthName];
    if (!Number.isNaN(year)) {
      return { year, month };
    }
  }
  // MM/YYYY format (e.g. 10/2022)
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1], 10);
    const year = Number.parseInt(slashMatch[2], 10);
    if (month >= 1 && month <= 12 && !Number.isNaN(year)) {
      return { year, month };
    }
  }
  const yearMatch = cleaned.match(/(20\d{2}|19\d{2})/);
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[1], 10);
    return { year };
  }
  return null;
}

function monthsBetween(start: ParsedDateToken, end: ParsedDateToken): number {
  const startMonth = start.month ?? 1;
  const endMonth = end.month ?? 12;
  return (end.year - start.year) * 12 + (endMonth - startMonth + 1);
}

export function parseDateRange(
  text: string,
  referenceDate?: Date
): ParsedDateRange | null {
  const normalized = text.trim();
  // ponytail: localized range separators (German "bis", French "à"/"jusqu'à") and accented
  // month names (à-ÿ) added inline alongside English so the same regex covers all three.
  const rangeMatch = normalized.match(
    /(\d{1,2}\/\d{4}|[A-Za-zà-ÿ]{3,9}\s+\d{4}|\d{4})\s*(?:-|to|through|until|bis|jusqu'à|à|–|—)\s*(Present|Current|Now|Aktuell|Heute|Actuellement|Présent|\d{1,2}\/\d{4}|[A-Za-zà-ÿ]{3,9}\s+\d{4}|\d{4})/i
  );
  if (!rangeMatch) {
    return null;
  }
  const startToken = parseDateToken(rangeMatch[1]);
  const endRaw = rangeMatch[2];
  const isPresent =
    /present|current|now|aktuell|heute|actuellement|présent|actuel/i.test(
      endRaw
    );
  const endToken = isPresent ? undefined : parseDateToken(endRaw);
  if (!startToken) {
    return null;
  }
  // ponytail: referenceDate injected for determinism; falls back to Date.now() in live use
  const ref = referenceDate ?? new Date();
  const endTokenResolved: ParsedDateToken = endToken ?? {
    year: ref.getFullYear(),
    month: ref.getMonth() + 1,
  };
  const durationInMonths = monthsBetween(startToken, endTokenResolved);
  return {
    raw: normalized,
    start: rangeMatch[1],
    end: isPresent ? "present" : rangeMatch[2],
    durationInMonths: durationInMonths > 0 ? durationInMonths : undefined,
    startYear: startToken.year,
    startMonth: startToken.month,
    endYear: endTokenResolved.year,
    endMonth: endTokenResolved.month,
  };
}

export function sumExperienceYears(ranges: ParsedDateRange[]): number {
  // If all ranges carry year/month data, merge overlapping intervals first so
  // concurrent roles (freelance + full-time) aren't double-counted.
  const withBounds = ranges.filter(
    (r) => r.startYear !== undefined && r.endYear !== undefined
  );
  if (withBounds.length === ranges.length && ranges.length > 0) {
    const toIndex = (year: number, month: number) => year * 12 + month;
    const intervals = withBounds
      .map((r) => ({
        s: toIndex(r.startYear!, r.startMonth ?? 1),
        e: toIndex(r.endYear!, r.endMonth ?? 12),
      }))
      .sort((a, b) => a.s - b.s);

    let totalMonths = 0;
    let curStart = intervals[0].s;
    let curEnd = intervals[0].e;
    for (let i = 1; i < intervals.length; i++) {
      const { s, e } = intervals[i];
      if (s <= curEnd) {
        curEnd = Math.max(curEnd, e);
      } else {
        totalMonths += curEnd - curStart + 1;
        curStart = s;
        curEnd = e;
      }
    }
    totalMonths += curEnd - curStart + 1;
    return Number((totalMonths / 12).toFixed(2));
  }

  // Fallback: naive sum (no overlap detection possible without bounds)
  const months = ranges.reduce(
    (total, r) => total + (r.durationInMonths ?? 0),
    0
  );
  return Number((months / 12).toFixed(2));
}

export interface EmploymentGap {
  /** Title (or company/fallback label) of the role worked immediately before the gap. */
  afterRole: string;
  months: number;
}

/**
 * Detect gaps between consecutive roles (sorted chronologically, with overlapping/
 * concurrent roles merged first — same overlap-merge approach as sumExperienceYears,
 * so a freelance gig running alongside a full-time role doesn't register as a "gap").
 * Only entries with fully resolved date bounds (startYear + endYear) are considered;
 * entries missing bounds are skipped since a gap can't be computed without them.
 */
export function detectEmploymentGaps(
  entries: ParsedExperienceEntry[],
  minGapMonths = 3
): EmploymentGap[] {
  const toIndex = (year: number, month: number) => year * 12 + month;

  const intervals = entries
    .filter(
      (e): e is ParsedExperienceEntry & { dates: ParsedDateRange } =>
        e.dates?.startYear !== undefined && e.dates?.endYear !== undefined
    )
    .map((e) => ({
      s: toIndex(e.dates.startYear!, e.dates.startMonth ?? 1),
      e: toIndex(e.dates.endYear!, e.dates.endMonth ?? 12),
      label: e.title || e.company || "previous role",
    }))
    .sort((a, b) => a.s - b.s || b.e - a.e);

  if (intervals.length < 2) {
    return [];
  }

  const gaps: EmploymentGap[] = [];
  let curEnd = intervals[0].e;
  let curEndLabel = intervals[0].label;

  for (let i = 1; i < intervals.length; i++) {
    const interval = intervals[i];
    if (interval.s <= curEnd + 1) {
      // Overlapping or contiguous — merge, keeping whichever role's end extends furthest.
      if (interval.e > curEnd) {
        curEnd = interval.e;
        curEndLabel = interval.label;
      }
      continue;
    }
    const gapMonths = interval.s - curEnd - 1;
    if (gapMonths >= minGapMonths) {
      gaps.push({ afterRole: curEndLabel, months: gapMonths });
    }
    curEnd = interval.e;
    curEndLabel = interval.label;
  }

  return gaps;
}
