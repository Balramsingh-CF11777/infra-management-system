import type { FinancialYearChoice } from "@/types/api";

/** Indian financial year start (April–March), matching Desk pbi_setup_year_options. */
export function fyStart(day = new Date()): number {
  return day.getMonth() >= 3 ? day.getFullYear() : day.getFullYear() - 1;
}

/** Canonical PBIU year string: 2026-2027 */
export function pbiYear(start = fyStart()): string {
  return `${start}-${start + 1}`;
}

export function fyLabel(start: number): string {
  return `FY ${start}-${String(start + 1).slice(-2)}`;
}

export function fyOptions(day = new Date()) {
  const current = fyStart(day);
  return [
    { id: "all" as const, label: "All", range: "" },
    { id: "current" as const, label: "Current Year", range: fyLabel(current) },
    { id: "last" as const, label: "Last Year", range: fyLabel(current - 1) },
  ];
}

export function yearValuesFor(choice: FinancialYearChoice, day = new Date()): string[] | null {
  const current = fyStart(day);
  if (choice === "all") return null;
  const start = choice === "last" ? current - 1 : current;
  return [
    pbiYear(start),
    `${start}-${String(start + 1).slice(-2)}`,
    `FY ${start}-${start + 1}`,
    `FY ${start}-${String(start + 1).slice(-2)}`,
  ];
}
