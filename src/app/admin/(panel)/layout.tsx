import { redirect } from "next/navigation";
import { getAdminSession } from "@/server/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div data-admin-panel className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <AdminSidebar session={session} />
      <main className="min-w-0 flex-1 overflow-x-auto">
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
