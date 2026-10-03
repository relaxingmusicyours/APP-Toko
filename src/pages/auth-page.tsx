import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useConvex, useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/lib/utils";
import { getConvexStatus } from "@/lib/convex-status";

const HIGHLIGHTS = [
  { icon: BookOpenCheck, text: "Jurnal otomatis dari setiap faktur, kasir, dan pembelian" },
  { icon: BadgeCheck, text: "Laporan keuangan siap pakai: laba rugi, neraca, arus kas" },
  { icon: ShieldCheck, text: "Audit trail lengkap untuk tiap posting dan perubahan data" },
];

const DEMO_EMAIL = "demo@posgg.id";
const DEMO_PASSWORD = "demo1234";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/app";
  const [mode, setMode] = React.useState<"signIn" | "signUp">(
    params.get("mode") === "signUp" ? "signUp" : "signIn",
  );
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [demoPending, setDemoPending] = React.useState(false);
  const convexStatus = React.useMemo(() => getConvexStatus(), []);
  const convex = useConvex();
  const prepareDemo = useMutation(api.company.prepareDemo);
  const [backendState, setBackendState] = React.useState<"checking" | "ok" | "error">(
    "checking",
  );

  // Pemeriksaan kesehatan backend: panggil fungsi yang pasti ada di kode ini.
  // Gagal = deployment belum terjangkau atau fungsinya belum di-deploy.
  React.useEffect(() => {
    let active = true;
    convex.query(api.company.me).then(
      () => {
        if (active) setBackendState("ok");
      },
      () => {
        if (active) setBackendState("error");
      },
    );
    return () => {
      active = false;
    };
  }, [convex]);

  const backendBlocked = convexStatus.unreachable || backendState === "error";

  if (!isLoading && isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (backendBlocked) {
      toast.error("Backend belum siap — lihat petunjuk di atas form");
      return;
    }
    setPending(true);
    try {
      await signIn("password", {
        flow: mode,
        email,
        password,
        ...(mode === "signUp" ? { name } : {}),
      });
      toast.success(mode === "signUp" ? "Akun berhasil dibuat" : "Selamat datang kembali");
      navigate(returnTo, { replace: true });
    } catch (error) {
      toast.error(errorMessage(error) || "Gagal masuk, periksa email dan kata sandi");
    } finally {
      setPending(false);
    }
  };

  /**
   * Masuk sebagai akun demo bersama. Database demo dikosongkan lebih dulu,
   * jadi setiap orang yang memakai akun ini mulai dari kondisi yang sama:
   * nol transaksi dan nol master data.
   */
  const startDemo = async () => {
    if (backendBlocked) {
      toast.error("Backend belum siap — lihat petunjuk di atas form");
      return;
    }
    setDemoPending(true);
    try {
      // Akun demo dipakai bersama, jadi boleh Signing up ulang bila belum ada.
      try {
        await signIn("password", {
          flow: "signIn",
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
      } catch {
        await signIn("password", {
          flow: "signUp",
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          name: "Akun Demo POS GG",
        });
      }
      // Sesi Convex menempel sedikit setelah signIn; coba beberapa kali.
      let prepared = false;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await prepareDemo({});
          prepared = true;
          break;
        } catch (err) {
          lastError = err;
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }
      if (!prepared) throw lastError;
      toast.success("Database demo dikosongkan — mulai dari nol");
      navigate("/app", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error) || "Gagal masuk sebagai akun demo");
    } finally {
      setDemoPending(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gg-teal/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-gg-lime/15 blur-3xl" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gg-lime font-black text-navy-950">
              GG
            </span>
            <span className="text-lg font-bold">POS GG Online</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            Satu ledger untuk kasir, stok, pajak, dan laporan keuangan.
          </h1>
          <p className="max-w-md text-sm text-white/60">
            Dibangun mengikuti alur kerja ERP akuntansi modern: master data, transaksi, engine
            akuntansi, lalu pelaporan.
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-white/80">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gg-lime" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          2026 POS GG Online. Struktur modul mengikuti pola ERP akuntansi pada umumnya.
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 font-black text-gg-lime">
              GG
            </span>
            <span className="text-lg font-bold">POS GG Online</span>
          </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "signIn" ? "Masuk ke workspace" : "Buat akun bisnis baru"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signIn"
              ? "Lanjutkan pembukuan dan kasir bisnis Anda."
              : "Database baru dibuat kosong — hanya Chart of Accounts dan satu gudang default."}
          </p>
        </div>

          {backendBlocked ? (
            <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-bold">
                    {convexStatus.unreachable
                      ? "Backend belum terhubung"
                      : "Fungsi backend belum tersedia"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {convexStatus.unreachable
                      ? "Masuk dan Daftar membutuhkan database Convex. Alamat backend saat ini masih mengarah ke localhost, sehingga permintaan dari browser akan gagal."
                      : "Deployment Convex sudah dapat dijangkau, tetapi fungsi-fungsi aplikasi belum di-deploy ke sana. Masuk dan Daftar akan gagal sampai kode di-push."}
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                    {convexStatus.unreachable ? (
                      <>
                        <li>
                          Jalankan <code className="num">npx convex login</code> lalu{" "}
                          <code className="num">npx convex dev --once</code> di terminal workspace.
                        </li>
                        <li>
                          Isi <strong>CONVEX_DEPLOYMENT</strong>,{" "}
                          <strong>VITE_CONVEX_URL</strong>, dan{" "}
                          <strong>CONVEX_ADMIN_KEY</strong> di Settings, lalu Environment.
                        </li>
                      </>
                    ) : (
                      <li>
                        Push kode ke deployment ini, dengan <code className="num">bun convex dev --once</code>
                        {" "}di terminal workspace, atau isi <strong>CONVEX_ADMIN_KEY</strong> di
                        Settings, lalu Environment agar saya bisa push.
                      </li>
                    )}
                    <li>Minta saya push fungsi, lalu uji daftar dan masuk dari ujung ke ujung.</li>
                  </ol>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sementara itu,{" "}
                    <Link
                      to="/guest"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Mode Demo
                    </Link>{" "}
                    tetap bisa dicoba tanpa backend.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
            {(["signIn", "signUp"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
                  (mode === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary")
                }
              >
                {value === "signIn" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            {mode === "signUp" ? (
              <Field label="Nama / Nama Toko">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Toko Berkah Jaya"
                  required
                />
              </Field>
            ) : null}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@bisnis.id"
                required
                autoComplete="email"
              />
            </Field>
            <Field label="Kata Sandi" hint={mode === "signUp" ? "Minimal 8 karakter." : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              />
            </Field>

            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? <Spinner /> : <Lock className="h-4 w-4" />}
              {mode === "signIn" ? "Masuk" : "Daftar & mulai"}
              {!pending ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>

            {/* MODE DEMO — tanpa login */}
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                atau coba dulu
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={startDemo}
              disabled={demoPending}
              className="w-full rounded-xl border border-navy-900/15 bg-navy-900 p-4 text-left text-white transition-all hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-gg-lime" />
                    {demoPending ? "Menyiapkan database demo…" : "Masuk sebagai akun demo"}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Akun demo bersama dengan database kosong. Ikuti tutorial untuk mengisi
                    barang sendiri dari nol.
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gg-lime" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem("posgg:tutorial:v1");
                } catch {
                  // abaikan
                }
                window.dispatchEvent(new Event("posgg:tutorial:start"));
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-gg-lime/60 hover:bg-gg-lime/10"
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <BookOpenCheck className="h-3.5 w-3.5 text-gg-teal" />
                  Tutorial klik setiap menu
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Panduan langkah demi langkah, bisa dilewati kapan saja.
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            </button>

            <Link to="/guest" className="block">
              <div className="w-full rounded-xl border border-gg-lime/60 bg-gg-lime/10 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-gg-lime/20 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-gg-teal" />
                      Buka Mode Demo, tanpa daftar
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lihat seluruh menu program dengan data contoh, tanpa menyentuh database
                      Anda. Maksimal 10 transaksi.
                    </p>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                </div>
              </div>
            </Link>
          </form>

          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gg-teal" />
            Data Anda terisolasi per tenant, satu akun satu perusahaan.
          </p>
        </motion.div>
      </div>
    </div>
  );
}