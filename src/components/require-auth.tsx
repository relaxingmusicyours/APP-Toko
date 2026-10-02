import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Loading } from "@/components/ui/misc";

/**
 * Sesi Convex ditempelkan ke koneksi setelah state auth tersedia, sehingga
 * panggilan pertama tepat setelah masuk bisa saja belum terotentikasi.
 * Karena itu inisialisasi workspace diulang dengan jeda singkat sampai berhasil.
 */
const MAX_ATTEMPTS = 6;

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const ensureCompany = useMutation(api.company.ensureCompany);

  const bootstrap = React.useCallback(async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await ensureCompany({});
        return;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Workspace belum siap: ${message}`, {
            action: { label: "Coba lagi", onClick: () => void bootstrap() },
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }, [ensureCompany]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    void bootstrap();
  }, [isAuthenticated, bootstrap]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading label="Menyiapkan sesi…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}
