import { useAction } from "convex/react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import type { SecurityOverviewResult } from "@/convex/github";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const REPO_SETTINGS_URL = "https://github.com/relaxingmusicyours/APP-Toko/settings";

interface Props {
  className?: string;
}

type CheckKey = "alerts" | "dependabot" | "codeql" | "secretScanning" | "pushProtection";

function toneFor(value: string | undefined): "success" | "warning" | "danger" {
  if (!value) return "warning";
  const v = value.toLowerCase();
  if (v.includes("harus diaktifkan manual")) return "warning";
  if (v.includes("tidak aktif") || v.includes("tidak terbaca") || v.includes("tidak tersedia")) {
    return "danger";
  }
  return "success";
}

export function GithubIntegration({ className }: Props) {
  const fetchRepoStatus = useAction(api.github.repoStatus);
  const fetchSecurity = useAction(api.github.securityOverview);

  const [repo, setRepo] = React.useState<{
    configured: boolean;
    repo: string;
    branch: string;
    recentRun: string | null;
    runStatus: string | null;
    runConclusion: string | null;
    error: string | null;
  } | null>(null);
  const [security, setSecurity] = React.useState<SecurityOverviewResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, overview] = await Promise.all([fetchRepoStatus({}), fetchSecurity({})]);
      setRepo(status);
      setSecurity(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchRepoStatus, fetchSecurity]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const checks: Array<{ key: CheckKey; label: string }> = [
    { key: "dependabot", label: "Dependabot alerts" },
    { key: "codeql", label: "CodeQL" },
    { key: "secretScanning", label: "Secret scanning" },
    { key: "pushProtection", label: "Push protection" },
  ];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-gg-teal" /> Integrasi GitHub
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Dependabot, CodeQL, secret scanning, dan push protection tidak bisa diaktifkan lewat API.
            Aktifkan manual di{" "}
            <a
              href={`${REPO_SETTINGS_URL}/code-security`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              Settings → Code security and analysis
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </div>
        <Badge variant={repo?.configured ? "success" : "warning"}>
          {repo?.configured ? "Token terpasang" : "Token belum diset"}
        </Badge>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Repository
          </p>
          <p className="font-mono text-sm text-foreground">
            {repo ? `${repo.repo} @ ${repo.branch}` : loading ? "Memuat…" : "—"}
          </p>
        </div>
        <div className="space-y-1 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Workflow terakhir
          </p>
          <p className="text-sm text-foreground">
            {repo?.recentRun
              ? `${repo.recentRun} — ${repo.runConclusion ?? repo.runStatus ?? "berjalan"}`
              : loading
                ? "Memuat…"
                : "Belum ada run"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => {
          const value = security?.[check.key];
          return (
            <div
              key={check.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{check.label}</span>
              <Badge variant={toneFor(value)}>
                {loading ? "…" : (value ?? "—")}
              </Badge>
            </div>
          );
        })}
      </div>

      {repo?.error ? <p className="mt-3 text-xs text-destructive">{repo.error}</p> : null}
    </Card>
  );
}

export default GithubIntegration;