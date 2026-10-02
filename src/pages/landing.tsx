import { motion } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  FileText,
  Landmark,
  Receipt,
  ScrollText,
  ShoppingCart,
  Store,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const MODULES = [
  {
    icon: ShoppingCart,
    title: "Kasir POS",
    desc: "Checkout cepat: tunai, QRIS, transfer. Kembalian otomatis, struk digital, stok langsung berkurang.",
  },
  {
    icon: Receipt,
    title: "Penjualan",
    desc: "Faktur pelanggan, penerimaan pembayaran, retur dan status lunas dengan umur piutang.",
  },
  {
    icon: Truck,
    title: "Pembelian",
    desc: "Faktur pemasok dengan update biaya rata-rata otomatis, jadwal utang, dan pembayaran.",
  },
  {
    icon: Boxes,
    title: "Persediaan",
    desc: "Multi-gudang, kartu stok, stok opname berselisih otomatis jadi jurnal koreksi.",
  },
  {
    icon: BookOpenCheck,
    title: "Buku Besar",
    desc: "Engine double-entry murni: debit = kredit dijamin, drill-down dari laporan ke jurnal.",
  },
  {
    icon: Wallet,
    title: "Kas & Bank",
    desc: "Penerimaan, pengeluaran, dan transfer antar rekening dengan saldo real-time.",
  },
  {
    icon: BarChart3,
    title: "Laporan",
    desc: "Neraca, laba rugi, arus kas, trial balance — semuanya dari satu sumber ledger.",
  },
  {
    icon: ScrollText,
    title: "Audit Trail",
    desc: "Siapa memposting apa, kapan, dan berapa — terekam untuk kepatuhan dan inspeksi.",
  },
];

const FLOW = [
  { step: "01", title: "Master Data", desc: "COA, pelanggan, pemasok, barang, gudang" },
  { step: "02", title: "Transaksi", desc: "Kasir, faktur jual/beli, pembayaran" },
  { step: "03", title: "Engine Akuntansi", desc: "Jurnal, stok, biaya rata-rata, pajak" },
  { step: "04", title: "Pelaporan", desc: "Neraca, laba rugi, arus kas, KPI" },
];

const PLANS = [
  {
    name: "Starter",
    price: "Gratis",
    note: "Untuk UMKM yang baru rapi",
    features: ["1 gudang", "Kasir POS + Penjualan", "Pembelian & persediaan", "Laporan inti"],
    cta: "Mulai gratis",
    highlight: false,
  },
  {
    name: "Business",
    price: "Rp 149rb",
    note: "bisnis/bulan — fitur terlengkap",
    features: [
      "Multi gudang & multi pengguna",
      "Buku besar + jurnal manual",
      "Kas & bank + rekonsiliasi",
      "Semua laporan + export",
      "Audit trail penuh",
    ],
    cta: "Coba Business",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "multi-cabang & integrasi",
    features: ["API & webhook", "e-Faktur / pajak", "Approval workflow", "Onboarding dibantu"],
    cta: "Hubungi sales",
    highlight: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-900 font-black text-gg-lime">
              GG
            </span>
            <span className="text-base font-bold tracking-tight">POS GG Online</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#modul" className="transition-colors hover:text-foreground">
              Modul
            </a>
            <a href="#alur" className="transition-colors hover:text-foreground">
              Alur Kerja
            </a>
            <a href="#harga" className="transition-colors hover:text-foreground">
              Harga
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth?mode=signIn">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link to="/auth?mode=signUp">
              <Button variant="accent" size="sm">
                Coba Gratis <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-gg-teal/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-gg-lime/10 blur-3xl" />

        <div className="container relative grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <motion.div {...fadeUp}>
              <Badge variant="lime" className="mb-5">
                <Zap className="h-3 w-3" /> Kasir + Akuntansi + Stok dalam satu ledger
              </Badge>
            </motion.div>
            <motion.h1
              {...fadeUp}
              className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
            >
              Bisnis rapi dimulai dari{" "}
              <span className="bg-gradient-to-r from-gg-lime to-gg-teal bg-clip-text text-transparent">
                pembukuan yang benar
              </span>
            </motion.h1>
            <motion.p {...fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
              POS GG Online menyatukan kasir, penjualan, pembelian, persediaan, dan akuntansi
              double-entry — mengikuti struktur modul ERP akuntansi yang sudah terbukti, dibuat
              ringkas untuk bisnis Indonesia.
            </motion.p>
            <motion.div {...fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth?mode=signUp">
                <Button size="lg" variant="accent">
                  Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth?mode=signIn">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  Masuk ke Workspace
                </Button>
              </Link>
            </motion.div>
            <motion.div {...fadeUp} className="mt-5 text-sm text-white/55">
              Ingin mencoba dulu?{" "}
              <Link
                to="/guest"
                className="font-semibold text-gg-lime underline-offset-4 hover:underline"
              >
                Buka Mode Demo gratis
              </Link>{" "}
              — tanpa daftar, maksimal 10 transaksi.
            </motion.div>
            <motion.div {...fadeUp} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-gg-lime" /> Tanpa kartu kredit
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-gg-lime" /> Data contoh siap pakai
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-gg-lime" /> Jurnal otomatis debit = kredit
              </span>
            </motion.div>
          </div>

          {/* Mock register card */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="animate-float rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Kasir POS GG
                </span>
                <span className="rounded-full bg-gg-lime/20 px-2 py-0.5 text-[11px] font-bold text-gg-lime">
                  LIVE
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  { name: "Kopi Susu GG 250ml", qty: "2 × Rp 15.000", total: "Rp 30.000" },
                  { name: "Keripik Singkong", qty: "1 × Rp 18.000", total: "Rp 18.000" },
                  { name: "Beras Premium 5kg", qty: "1 × Rp 78.000", total: "Rp 78.000" },
                ].map((line) => (
                  <div
                    key={line.name}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm"
                  >
                    <span className="text-white/80">{line.name}</span>
                    <span className="num text-white/60">{line.qty}</span>
                    <span className="num font-semibold">{line.total}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span className="num">Rp 126.000</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>PPN 11%</span>
                  <span className="num">Rp 13.860</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="num text-gg-lime">Rp 139.860</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                <div className="rounded-lg bg-gg-lime py-2 text-navy-950">TUNAI</div>
                <div className="rounded-lg bg-white/10 py-2 text-white/70">QRIS</div>
                <div className="rounded-lg bg-white/10 py-2 text-white/70">TRANSFER</div>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-4 hidden rounded-xl border border-white/10 bg-navy-900/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Jurnal otomatis</p>
              <p className="num mt-0.5 text-xs font-semibold text-gg-teal">
                Kas D 139.860 = K 139.860
              </p>
            </div>
          </motion.div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-5 text-xs font-semibold uppercase tracking-widest text-white/35">
            <span className="flex items-center gap-2">
              <Store className="h-4 w-4" /> Toko &amp; minimarket
            </span>
            <span className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Distributor
            </span>
            <span className="flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Grosir &amp; eceran
            </span>
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Jasa &amp; trading
            </span>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modul" className="py-20 sm:py-24">
        <div className="container">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Struktur Modul Lengkap</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Delapan modul inti, satu sumber data
            </h2>
            <p className="mt-4 text-muted-foreground">
              Meniru tata letak ERP akuntansi terbaik: modul transaksi terhubung langsung ke engine
              akuntansi, bukan aplikasi kasir yang terpisah dari pembukuan.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod, index) => (
              <motion.div
                key={mod.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-gg-lime transition-transform group-hover:scale-110">
                  <mod.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold tracking-tight">{mod.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{mod.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section id="alur" className="bg-navy-950 py-20 text-white sm:py-24">
        <div className="container">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <Badge variant="lime" className="mb-4">
              Dibangun dengan urutan yang benar
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Fondasi akuntansi dulu, dashboard kemudian
            </h2>
            <p className="mt-4 text-white/60">
              Urutan pembangunan mengikuti prinsip ERP: tanpa master data dan engine posting yang
              kuat, laporan hanyalah kosmetik.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {FLOW.map((item, index) => (
              <motion.div
                key={item.step}
                {...fadeUp}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <span className="num text-3xl font-black text-gg-lime/30">{item.step}</span>
                <h3 className="mt-3 font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-white/55">{item.desc}</p>
                {index < FLOW.length - 1 ? (
                  <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gg-teal/60 md:block" />
                ) : null}
              </motion.div>
            ))}
          </div>

          <motion.div
            {...fadeUp}
            className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gg-lime/20 bg-gg-lime/5 p-6 text-center"
          >
            <p className="text-sm leading-relaxed text-white/75">
              <span className="font-bold text-gg-lime">Setiap transaksi mengalir otomatis:</span>{" "}
              faktur jual membuat piutang + pendapatan + PPN keluaran + HPP; faktur beli membuat
              persediaan + utang + PPN masukan; stok opname menghasilkan jurnal selisih sendiri.
            </p>
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="harga" className="py-20 sm:py-24">
        <div className="container">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4">Harga Transparan</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bayar sesuai skala</h2>
            <p className="mt-4 text-muted-foreground">
              Mulai gratis untuk pembukuan dasar, naik ke Business saat bisnis tumbuh.
            </p>
          </motion.div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                className={
                  "relative flex flex-col rounded-2xl border p-7 shadow-sm transition-shadow hover:shadow-lg " +
                  (plan.highlight
                    ? "border-navy-900 bg-navy-950 text-white shadow-xl"
                    : "border-border bg-card")
                }
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gg-lime px-3 py-1 text-[11px] font-bold text-navy-950">
                    PALING POPULER
                  </span>
                ) : null}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                </div>
                <p
                  className={
                    "mt-1 text-sm " + (plan.highlight ? "text-white/55" : "text-muted-foreground")
                  }
                >
                  {plan.note}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2
                        className={
                          "mt-0.5 h-4 w-4 shrink-0 " +
                          (plan.highlight ? "text-gg-lime" : "text-gg-teal")
                        }
                      />
                      <span className={plan.highlight ? "text-white/80" : "text-foreground/80"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signUp" className="mt-7">
                  <Button className="w-full" variant={plan.highlight ? "accent" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-secondary/60 py-20 sm:py-24">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center">
            <Badge className="mb-4">Pertanyaan Umum</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Pertanyaan yang sering muncul</h2>
          </motion.div>
          <div className="mt-10 space-y-4">
            {[
              {
                q: "Apakah cocok untuk bisnis kecil yang baru mulai?",
                a: "Ya. Saat mendaftar, workspace otomatis diisi Chart of Accounts, barang contoh, dan saldo awal — Anda bisa langsung mencatat penjualan tanpa setup rumit.",
              },
              {
                q: "Bagaimana akuntansi tetap seimbang?",
                a: "Semua transaksi melewati satu posting engine yang menolak jurnal tidak seimbang. Debit harus sama dengan kredit sebelum data disimpan.",
              },
              {
                q: "Apakah stok otomatis tercatat?",
                a: "Ya. Penjualan mengurangi stok, pembelian menambah dengan biaya rata-rata bergerak, dan stok opname menghasilkan jurnal selisih persediaan otomatis.",
              },
              {
                q: "Bisakah dipakai oleh beberapa orang?",
                a: "Data terisolasi per tenant, dan setiap aktivitas terekam pada audit trail — siapa, kapan, dan aksi apa. Peran lebih rinci masuk roadmap V2.",
              },
            ].map((faq) => (
              <motion.details
                key={faq.q}
                {...fadeUp}
                className="group rounded-xl border border-border bg-card p-5 open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {faq.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900 py-20 text-center text-white">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative container">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Rapikan pembukuan hari ini, bukan akhir tahun
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Buat akun gratis, dan workspace Anda langsung siap dengan COA, master data, dan saldo
            awal.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth?mode=signUp">
              <Button size="lg" variant="accent">
                Daftar Sekarang <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth?mode=signIn">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Sudah punya akun
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-900 text-[11px] font-black text-gg-lime">
              GG
            </span>
            <span className="font-semibold text-foreground">POS GG Online</span>
          </div>
          <p className="text-xs">
            © 2026 POS GG Online. Blueprint UI/UX terinspirasi struktur modul ERP akuntansi modern.
          </p>
        </div>
      </footer>
    </div>
  );
}
