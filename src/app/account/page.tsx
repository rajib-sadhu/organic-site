import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { LogoutButton, VerifyBanner } from "@/components/account/AccountActions";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/cn";
import { getAccountMode, getCustomerSession } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-honey/15 text-honey",
  CONFIRMED: "bg-leaf-soft text-forest",
  PACKED: "bg-leaf-soft text-forest",
  SHIPPED: "bg-blue-50 text-blue-700",
  DELIVERED: "bg-forest text-cream",
  CANCELLED: "bg-clay/10 text-clay",
  REFUNDED: "bg-clay/10 text-clay",
};

export default async function AccountPage() {
  if ((await getAccountMode()) === "OFF") notFound();
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?next=/account");

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true, orderNo: true, status: true, totalPaise: true, createdAt: true, trackingToken: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  return (
    <div className="py-12 sm:py-16">
      <Container className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-forest-dark sm:text-5xl">
              {customer.name ? `Hi, ${customer.name.split(" ")[0]}` : "My account"}
            </h1>
            <p className="mt-1 text-muted">{customer.email}</p>
          </div>
          <LogoutButton />
        </div>

        {!customer.emailVerifiedAt && <VerifyBanner email={customer.email} />}

        <section>
          <h2 className="font-display text-2xl text-forest-dark">Orders</h2>
          {customer.orders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 text-muted">No orders yet.</p>
              <Link href="/products" className="mt-4 inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-medium text-cream hover:bg-forest-dark">
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {customer.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.trackingToken}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-cream">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{o.orderNo}</p>
                      <p className="text-xs text-muted">
                        {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        {o._count.items} {o._count.items === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[o.status])}>{o.status}</span>
                    <span className="w-20 text-right text-sm font-semibold text-ink">{formatPaise(o.totalPaise)}</span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="mb-4 font-display text-2xl text-forest-dark">Profile</h2>
          <ProfileForm
            name={customer.name}
            phone={customer.phone}
            address={customer.shipLine1 ? {
              shipName: customer.shipName, shipLine1: customer.shipLine1, shipLine2: customer.shipLine2,
              shipCity: customer.shipCity, shipState: customer.shipState, shipPincode: customer.shipPincode,
            } : null}
          />
        </section>

        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="mb-4 font-display text-2xl text-forest-dark">Password</h2>
          <PasswordForm hasPassword={!!customer.passwordHash} />
        </section>
      </Container>
    </div>
  );
}
