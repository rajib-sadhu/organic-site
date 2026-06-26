// Canonical RBAC permission catalog (see ARCHITECTURE.md §7.1).
// This is the single source of truth, imported by both the seed script and
// runtime permission checks. Adding a permission here + re-seeding makes it
// assignable to roles in the admin panel.

export type PermissionDef = {
  key: string;
  label: string;
  group: string;
};

export const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { key: "dashboard.view", label: "View dashboard", group: "Dashboard" },
  { key: "analytics.view", label: "View analytics", group: "Dashboard" },

  // Orders
  { key: "orders.view", label: "View orders", group: "Orders" },
  { key: "orders.edit", label: "Edit orders", group: "Orders" },
  { key: "orders.update_status", label: "Update order status", group: "Orders" },
  { key: "orders.refund", label: "Refund orders", group: "Orders" },
  { key: "orders.resend_email", label: "Resend order emails", group: "Orders" },

  // Products
  { key: "products.view", label: "View products", group: "Products" },
  { key: "products.create", label: "Create products", group: "Products" },
  { key: "products.edit", label: "Edit products", group: "Products" },
  { key: "products.delete", label: "Delete products", group: "Products" },
  { key: "products.manage_stock", label: "Manage stock", group: "Products" },

  // Coupons
  { key: "coupons.view", label: "View coupons", group: "Coupons" },
  { key: "coupons.manage", label: "Create / edit coupons", group: "Coupons" },

  // Settings
  { key: "settings.manage", label: "Manage store settings", group: "Settings" },
  { key: "cache.clear", label: "Clear cache", group: "Settings" },
  { key: "otp.toggle", label: "Toggle COD OTP", group: "Settings" },

  // Users & roles
  { key: "users.view", label: "View admin users", group: "Users" },
  { key: "users.manage", label: "Create / edit admin users", group: "Users" },
  { key: "roles.manage", label: "Create / edit roles", group: "Users" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
