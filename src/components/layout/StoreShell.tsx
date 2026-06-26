"use client";

import { usePathname } from "next/navigation";
import { PromoStrip } from "./PromoStrip";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { GoToTop } from "@/components/ui/GoToTop";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <PromoStrip />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <GoToTop />
      <CartDrawer />
    </>
  );
}
