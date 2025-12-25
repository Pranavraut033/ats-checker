import { ParsedDateRange } from "../types/parser";

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
};

interface ParsedDateToken {
  year: number;
  month?: number;
}

function parseDateToken(raw: string): ParsedDateToken | null {
  const cleaned = raw.trim().toLowerCase();
  const monthMatch = cleaned.match(/([a-z]{3,9})\s*(\d{4})/i);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const year = Number.parseInt(monthMatch[2], 10);
    const month = MONTHS[monthName];
    if (!Number.isNaN(year)) {
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

export function parseDateRange(text: string): ParsedDateRange | null {
  const normalized = text.trim();
  const rangeMatch = normalized.match(/([A-Za-z]{3,9}\s+\d{4}|\d{4})\s*(?:-|to|–|—)\s*(Present|Current|Now|[A-Za-z]{3,9}\s+\d{4}|\d{4})/i);
  if (!rangeMatch) {
    return null;
  }
  const startToken = parseDateToken(rangeMatch[1]);
  const endRaw = rangeMatch[2];
  const isPresent = /present|current|now/i.test(endRaw);
  const endToken = isPresent ? undefined : parseDateToken(endRaw);
  if (!startToken) {
    return null;
  }
  const endTokenResolved: ParsedDateToken = endToken ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const durationInMonths = monthsBetween(startToken, endTokenResolved);
  return {
    raw: normalized,
    start: rangeMatch[1],
    end: isPresent ? "present" : rangeMatch[2],
    durationInMonths: durationInMonths > 0 ? durationInMonths : undefined,
  };
}

export function sumExperienceYears(ranges: ParsedDateRange[]): number {
  const months = ranges
    .map((range) => range.durationInMonths ?? 0)
    .reduce((total, value) => total + value, 0);
  return Number((months / 12).toFixed(2));
}
