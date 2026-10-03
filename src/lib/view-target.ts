import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Menjalankan aksi ketika halaman dibuka dari pop-up pemilihan dokumen di
 * sidebar, mis. `navigate("/app/pembelian", { state: { view: "form" } })`.
 *
 * Nilai `view` langsung dihapus dari history supaya tidak terulang saat
 * pengguna memuat ulang halaman atau menekan tombol back.
 */
export function useViewTarget(apply: (view: string) => void) {
  const location = useLocation();
  const navigate = useNavigate();

  // Aksi sering memakai state/dialog yang dibuat setelah hook ini dipanggil.
  const applyRef = React.useRef(apply);
  applyRef.current = apply;

  React.useEffect(() => {
    const view = (location.state as { view?: string } | null)?.view;
    if (!view) return;
    applyRef.current(view);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
}