import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import Assets from "@/pages/assets";
import AuthPage from "@/pages/auth-page";
import CashBank from "@/pages/cash-bank";
import Dashboard from "@/pages/dashboard";
import Guest from "@/pages/guest";
import Inventory from "@/pages/inventory";
import Landing from "@/pages/landing";
import Ledger from "@/pages/ledger";
import Masters from "@/pages/masters";
import Pos from "@/pages/pos";
import Purchases from "@/pages/purchases";
import Reports from "@/pages/reports";
import Sales from "@/pages/sales";
import Settings from "@/pages/settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/guest" element={<Guest />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<Pos />} />
        <Route path="penjualan" element={<Sales />} />
        <Route path="pembelian" element={<Purchases />} />
        <Route path="persediaan" element={<Inventory />} />
        <Route path="aset-tetap" element={<Assets />} />
        <Route path="buku-besar" element={<Ledger />} />
        <Route path="kas-bank" element={<CashBank />} />
        <Route path="laporan" element={<Reports />} />
        <Route path="master-data" element={<Masters />} />
        <Route path="pengaturan" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
