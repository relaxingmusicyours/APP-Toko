import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { Loading } from "@/components/ui/misc";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const ensureCompany = useMutation(api.company.ensureCompany);

  React.useEffect(() => {
    if (isAuthenticated) {
      void ensureCompany({});
    }
  }, [isAuthenticated, ensureCompany]);

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
