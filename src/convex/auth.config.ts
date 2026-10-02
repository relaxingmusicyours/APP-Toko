/**
 * Konfigurasi auth yang dibaca platform Convex.
 * Tanpa file ini + env `JWKS`, token dari Convex Auth ditolak server
 * sehingga semua query/mutation berjalan tanpa sesi ("Belum masuk").
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
