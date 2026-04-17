import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  return authenticated ? <AdminDashboard /> : <AdminLogin />;
}
