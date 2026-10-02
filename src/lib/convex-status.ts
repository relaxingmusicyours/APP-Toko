/**
 * Deteksi apakah backend Convex bisa dijangkau dari browser ini.
 *
 * Di lingkungan workspace, `VITE_CONVEX_URL` sering masih menunjuk ke deployment
 * lokal (localhost:3210) karena belum ada akun Convex yang terhubung. URL seperti
 * itu tidak bisa dijangkau browser pengguna, sehingga seluruh panggilan Convex —
 * termasuk login dan daftar — gagal tanpa pesan yang jelas.
 */

export type ConvexStatus = {
  /** true = VITE_CONVEX_URL kosong atau menunjuk ke localhost/127.0.0.1 */
  urlIsLocal: boolean;
  /** true = halaman ini disajikan dari domainremote (bukan localhost) */
  servedFromRemoteHost: boolean;
  /** true = konfigurasi backend hampir pasti tidak terjangkau dari browser ini */
  unreachable: boolean;
};

export function getConvexStatus(): ConvexStatus {
  const url = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const servedFromRemoteHost =
    hostname !== "" && hostname !== "localhost" && hostname !== "127.0.0.1";
  const urlIsLocal = url === "" || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url);

  return { urlIsLocal, servedFromRemoteHost, unreachable: servedFromRemoteHost && urlIsLocal };
}