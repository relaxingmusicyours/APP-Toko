import { expect, test } from "bun:test";

/**
 * Mirrors the bucketing logic in src/convex/reports.ts (buildAging/bucketKey).
 * The Convex handler is a thin wrapper over these pure helpers; keeping a local
 * copy lets us test the math without booting a Convex runtime.
 */

function daysBetween(fromISO: string, toISO: string): number {
  return Math.floor((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

type Bucket = "d0_14" | "d15_30" | "d30plus";

function bucketKey(days: number): Bucket {
  if (days > 30) return "d30plus";
  if (days > 14) return "d15_30";
  return "d0_14";
}

type AgingRow = {
  key: string;
  name: string;
  count: number;
  d0_14: number;
  d15_30: number;
  d30plus: number;
  oldest: number;
  total: number;
};

function buildAging(
  docs: Array<{ key: string; name: string; dueDate: string; outstanding: number }>,
  asOf: string,
) {
  const byParty = new Map<string, AgingRow>();
  for (const doc of docs) {
    const days = Math.max(0, daysBetween(doc.dueDate, asOf));
    const bucket = bucketKey(days);
    const row: AgingRow =
      byParty.get(doc.key) ??
      { key: doc.key, name: doc.name, count: 0, d0_14: 0, d15_30: 0, d30plus: 0, oldest: 0, total: 0 };
    row.count += 1;
    row[bucket] += doc.outstanding;
    row.total += doc.outstanding;
    row.oldest = Math.max(row.oldest, days);
    byParty.set(doc.key, row);
  }
  const rows = [...byParty.values()].sort((a, b) => b.total - a.total);
  return {
    asOf,
    rows,
    totals: {
      count: rows.reduce((s, r) => s + r.count, 0),
      d0_14: rows.reduce((s, r) => s + r.d0_14, 0),
      d15_30: rows.reduce((s, r) => s + r.d15_30, 0),
      d30plus: rows.reduce((s, r) => s + r.d30plus, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    },
  };
}

test("umur 0-14 hari masuk bucket pertama", () => {
  expect(bucketKey(0)).toBe("d0_14");
  expect(bucketKey(14)).toBe("d0_14");
});

test("umur 15-30 hari masuk bucket kedua", () => {
  expect(bucketKey(15)).toBe("d15_30");
  expect(bucketKey(30)).toBe("d15_30");
});

test("umur di atas 30 hari masuk bucket terakhir", () => {
  expect(bucketKey(31)).toBe("d30plus");
  expect(bucketKey(120)).toBe("d30plus");
});

test("umur negatif (belum jatuh tempo) di-clamp ke 0", () => {
  expect(daysBetween("2026-10-31", "2026-10-01")).toBeLessThan(0);
  expect(bucketKey(Math.max(0, daysBetween("2026-10-31", "2026-10-01")))).toBe("d0_14");
});

test("partial payment mengurangi outstanding per dokumen", () => {
  // Invoice 1.000.000, terbayar 400.000 → outstanding 600.000
  const outstanding = 1_000_000 - 400_000;
  const result = buildAging(
    [{ key: "C-1", name: "Toko A", dueDate: "2026-09-20", outstanding }],
    "2026-10-01",
  );
  expect(result.totals.total).toBe(600_000);
  expect(result.totals.d0_14).toBe(600_000); // 11 hari → bucket pertama
  expect(result.rows[0].count).toBe(1);
});

test("beberapa faktur satu pelanggan teragregasi per pihak", () => {
  const result = buildAging(
    [
      { key: "C-1", name: "Toko A", dueDate: "2026-09-28", outstanding: 200_000 },
      { key: "C-1", name: "Toko A", dueDate: "2026-09-10", outstanding: 300_000 },
      { key: "C-2", name: "Toko B", dueDate: "2026-09-05", outstanding: 100_000 },
    ],
    "2026-10-01",
  );
  expect(result.rows).toHaveLength(2);
  const tokoA = result.rows.find((r) => r.key === "C-1")!;
  expect(tokoA.count).toBe(2);
  expect(tokoA.d0_14).toBe(200_000); // 3 hari
  expect(tokoA.d15_30).toBe(300_000); // 21 hari
  expect(tokoA.total).toBe(500_000);
  expect(tokoA.oldest).toBe(21);
  // Urutan: total terbesar dulu
  expect(result.rows[0].key).toBe("C-1");
  expect(result.totals.count).toBe(3);
  expect(result.totals.total).toBe(600_000);
});

test("lunas penuh tidak masuk aging (handler memfilter outstanding <= 0)", () => {
  const docs = [
    { key: "C-1", name: "Toko A", dueDate: "2026-09-20", outstanding: 0 },
    { key: "C-2", name: "Toko B", dueDate: "2026-09-25", outstanding: 50_000 },
  ].filter((d) => d.outstanding > 0); // sama seperti filter di handler arAging/apAging
  const result = buildAging(docs, "2026-10-01");
  expect(result.rows).toHaveLength(1);
  expect(result.totals.total).toBe(50_000);
});
