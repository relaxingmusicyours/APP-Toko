"use node";

import { action } from "./_generated/server";

/**
 * Status integrasi GitHub untuk kartu Pengaturan → Integrasi.
 *
 * Berjalan di Node runtime ("use node") agar `process.env` (GITHUB_TOKEN &
 * GITHUB_REPOSITORY) terbaca. Semua endpoint GitHub dipanggil di sini, bukan
 * dari browser, sehingga token tidak pernah terekspos ke frontend.
 */

function repoSlug(): string {
  return process.env.GITHUB_REPOSITORY ?? "";
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pos-gg-online",
  };
}

async function githubFetch(path: string, token: string) {
  return fetch(`https://api.github.com${path}`, { headers: authHeaders(token) });
}

export interface RepoStatusResult {
  configured: boolean;
  repo: string;
  branch: string;
  recentRun: string | null;
  runStatus: string | null;
  runConclusion: string | null;
  error: string | null;
}

export const repoStatus = action({
  args: {},
  handler: async (): Promise<RepoStatusResult> => {
    const token = process.env.GITHUB_TOKEN ?? "";
    const slug = repoSlug();

    if (!token || !slug) {
      return {
        configured: false,
        repo: slug || "repo not set",
        branch: "main",
        recentRun: null,
        runStatus: null,
        runConclusion: null,
        error: null,
      };
    }

    const repoRes = await githubFetch(`/repos/${slug}`, token);
    if (!repoRes.ok) {
      return {
        configured: false,
        repo: slug,
        branch: "main",
        recentRun: null,
        runStatus: null,
        runConclusion: null,
        error: `GitHub API ${repoRes.status} ${repoRes.statusText}`,
      };
    }

    const repoData = (await repoRes.json()) as { default_branch?: string; full_name?: string };

    // Workflow run terakhir (opsional — 403 bila Actions tidak diizinkan).
    let recentRun: string | null = null;
    let runStatus: string | null = null;
    let runConclusion: string | null = null;
    const runsRes = await githubFetch(`/repos/${slug}/actions/runs?per_page=1`, token);
    if (runsRes.ok) {
      const runsData = (await runsRes.json()) as {
        workflow_runs?: Array<{ name?: string; status?: string; conclusion?: string | null }>;
      };
      const latest = runsData.workflow_runs?.[0];
      if (latest) {
        recentRun = latest.name ?? "workflow";
        runStatus = latest.status ?? null;
        runConclusion = latest.conclusion ?? null;
      }
    }

    return {
      configured: true,
      repo: repoData.full_name ?? slug,
      branch: repoData.default_branch ?? "main",
      recentRun,
      runStatus,
      runConclusion,
      error: null,
    };
  },
});

export interface SecurityOverviewResult {
  tokenConfigured: boolean;
  alerts: string;
  dependabot: string;
  codeql: string;
  secretScanning: string;
  pushProtection: string;
}

export const securityOverview = action({
  args: {},
  handler: async (): Promise<SecurityOverviewResult> => {
    const token = process.env.GITHUB_TOKEN ?? "";
    const slug = repoSlug();

    if (!token || !slug) {
      const message = "tidak aktif: GITHUB_TOKEN belum diset di backend";
      return {
        tokenConfigured: false,
        alerts: message,
        dependabot: message,
        codeql: message,
        secretScanning: message,
        pushProtection: message,
      };
    }

    const overview: SecurityOverviewResult = {
      tokenConfigured: true,
      alerts: "tidak aktif: GITHUB_TOKEN belum diset di backend",
      dependabot: "tidak aktif: GITHUB_TOKEN belum diset di backend",
      codeql: "tidak aktif: GITHUB_TOKEN belum diset di backend",
      secretScanning: "tidak aktif: GITHUB_TOKEN belum diset di backend",
      pushProtection: "harus diaktifkan manual di Settings repo",
    };

    const checks: Array<{
      key: "dependabot" | "codeql" | "secretScanning";
      path: string;
    }> = [
      { key: "dependabot", path: `/repos/${slug}/dependabot/alerts?per_page=1` },
      { key: "codeql", path: `/repos/${slug}/code-scanning/alerts?per_page=1` },
      { key: "secretScanning", path: `/repos/${slug}/secret-scanning/alerts?per_page=1` },
    ];

    for (const check of checks) {
      try {
        const res = await githubFetch(check.path, token);
        if (res.status === 403 || res.status === 404) {
          overview[check.key] = "tidak aktif: fiturnya belum diaktifkan di repo";
          continue;
        }
        if (!res.ok) {
          overview[check.key] = `tidak terbaca (HTTP ${res.status})`;
          continue;
        }
        const data = (await res.json()) as unknown[];
        overview[check.key] = `${data.length} alert terbuka`;
      } catch (err) {
        overview[check.key] = `tidak tersedia (${(err as Error).message})`;
      }
    }

    // Push protection tidak bisa dibaca lewat API — selalu diarahkan ke UI.
    overview.pushProtection = "harus diaktifkan manual di Settings repo";

    return overview;
  },
});