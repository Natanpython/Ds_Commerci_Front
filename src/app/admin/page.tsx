import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { requireAdmin } from "@/lib/admin-server";
import { ApiError } from "@/lib/server";
import type { User } from "@/lib/types";
import "./admin.css";

export const metadata = { title: "Administração — Natan Commerce", robots: { index: false, follow: false } };

export default async function AdminPage() {
  let user: User;
  try { user = await requireAdmin(); }
  catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) redirect("/");
    return <main className="admin-unavailable"><h1>Painel indisponível</h1><p>Não foi possível verificar seu acesso. Confira a conexão com a loja e tente novamente.</p><a className="button primary" href="/">Voltar à loja</a></main>;
  }
  return <AdminDashboard user={user} />;
}
