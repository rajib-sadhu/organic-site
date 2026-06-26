import { redirect } from "next/navigation";
import { getAdminSession, hasPermission } from "@/server/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!hasPermission(session, "dashboard.view")) {
    redirect("/admin/orders");
  }

  return <AdminDashboard />;
}
