import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(value: number | undefined | null, opts?: { compact?: boolean }): string {
  const amount = Math.round(value ?? 0);
  if (opts?.compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
    if (abs >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} jt`;
    if (abs >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatNumber(value: number | undefined | null, digits = 0): string {
  return (value ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthStartISO(month = currentMonthISO()): string {
  return `${month}-01`;
}

export function monthEndISO(month = currentMonthISO()): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

export function formatDateTime(ts: number | undefined): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function monthLabel(month: string): string {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const [y, m] = month.split("-").map(Number);
  return `${months[(m ?? 1) - 1]} ${y}`;
}

export function downloadCSV(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return value.includes(",") || value.includes('"') || value.includes("\n")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown): string {
  if (!error) return "Terjadi kesalahan";
  const raw = error instanceof Error ? error.message : String(error);
  const cleaned = raw.replace(/^\[CONVEX[^\]]*\]\s*/i, "").replace(/^Server Error\s*/i, "");
  const uncaught = cleaned.match(/Uncaught ConvexError:\s*(.*)/i);
  if (uncaught?.[1]) return uncaught[1];
  return cleaned.split("\n")[0] || "Terjadi kesalahan";
}
