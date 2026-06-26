"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Ticket, Settings, Users, LogOut,
  Leaf, Star, FileText, Mail, Image, LayoutGrid, Megaphone, ChevronDown,
  ShoppingBag, Boxes, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminSession } from "@/server/lib/admin-auth";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; permission?: string };
type NavGroup = { label: string | null; icon?: typeof LayoutDashboard; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingBag,
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, permission: "orders.view" },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket, permission: "coupons.view" },
    ],
  },
  {
    label: "Catalog",
    icon: Boxes,
    items: [
      { label: "Products", href: "/admin/products", icon: Package, permission: "products.view" },
      { label: "Reviews", href: "/admin/reviews", icon: Star, permission: "products.view" },
    ],
  },
  {
    label: "Content",
    icon: Sparkles,
    items: [
      { label: "Banners", href: "/admin/banners", icon: Image, permission: "settings.manage" },
      { label: "Feature Cards", href: "/admin/feature-cards", icon: LayoutGrid, permission: "settings.manage" },
      { label: "Promo Strip", href: "/admin/promo-messages", icon: Megaphone, permission: "settings.manage" },
      { label: "Blog", href: "/admin/blog", icon: FileText, permission: "products.view" },
    ],
  },
  {
    label: "Marketing",
    icon: Mail,
    items: [
      { label: "Newsletter", href: "/admin/newsletter", icon: Mail, permission: "products.view" },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: Users, permission: "users.view" },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];

function canSee(session: AdminSession, perm?: string) {
  if (!perm || session.isSystem) return true;
  return session.permissions.includes(perm);
}

function isItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({ session }: { session: AdminSession }) {
  const pathname = usePathname();
  const router = useRouter();

  // Visible groups (those with at least one permitted item).
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((item) => canSee(session, item.permission)),
  })).filter((g) => g.items.length > 0);

  // Open the group containing the active route by default; keep others collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      if (g.label) init[g.label] = g.items.some((i) => isItemActive(pathname, i.href));
    }
    return init;
  });

  const toggle = (label: string) => setOpen((o) => ({ ...o, [label]: !o[label] }));

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  const renderItem = (item: NavItem, nested: boolean) => {
    const active = isItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors",
          nested ? "pl-9 pr-3" : "px-3",
          active ? "bg-forest text-cream" : "text-ink hover:bg-sand",
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-paper">
      <div className="flex items-center gap-2 border-b border-line px-4 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-cream">
          <Leaf className="h-4 w-4" />
        </span>
        <span className="font-display text-lg font-semibold text-forest-dark">Admin</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {groups.map((g, gi) => {
          // Ungrouped items render flat.
          if (!g.label) {
            return g.items.map((item) => renderItem(item, false));
          }

          const GroupIcon = g.icon ?? LayoutGrid;
          const expanded = open[g.label] ?? false;
          const hasActive = g.items.some((i) => isItemActive(pathname, i.href));

          return (
            <div key={g.label} className={cn(gi > 0 && "pt-1")}>
              <button
                type="button"
                onClick={() => toggle(g.label!)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  hasActive && !expanded ? "text-forest" : "text-ink hover:bg-sand",
                )}
              >
                <GroupIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 text-muted transition-transform", expanded && "rotate-180")}
                />
              </button>
              {expanded && (
                <div className="mt-0.5 space-y-0.5">
                  {g.items.map((item) => renderItem(item, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <div className="mb-2 px-1">
          <p className="text-xs font-medium text-ink">{session.name}</p>
          <p className="text-xs text-muted">{session.roleName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-sand hover:text-clay"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
