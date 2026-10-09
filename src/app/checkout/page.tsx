"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, ShoppingBag, Truck, CreditCard, Banknote, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/ui/Container";
import { formatPaise } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/indian-states";
import { checkoutSchema, type CheckoutInput } from "@/schema/checkout";
import { fetchCart, type ServerCart } from "@/lib/cart-api";
import { useCart } from "@/store/cart";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const clearLocal = useCart((s) => s.clear);
  const [cart, setCart] = useState<ServerCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rzpReady, setRzpReady] = useState(false);
  // COD-OTP: set once a code has been sent to this phone; the next submit carries the code.
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    let stale = false;
    fetchCart()
      .then((c) => {
        if (!stale) setCart(c);
      })
      .catch(() => {
        // no cart
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => { stale = true; };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "COD" },
  });

  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const phone = useWatch({ control, name: "phone" });

  const codFee = cart?.totals.codFeePaise ?? 0;
  const totals = cart?.totals;
  const baseTotalWithoutCod = (totals?.totalPaise ?? 0) - (totals?.codFeePaise ?? 0);
  const displayTotal = paymentMethod === "COD" ? baseTotalWithoutCod + codFee : baseTotalWithoutCod;

  const openRazorpay = (rzpConfig: Record<string, unknown>, orderNo: string) => {
    const options = {
      key: rzpConfig.keyId,
      amount: rzpConfig.amount,
      currency: rzpConfig.currency,
      name: "Verdant",
      description: `Order ${orderNo}`,
      order_id: rzpConfig.orderId,
      prefill: { name: rzpConfig.name, email: rzpConfig.email, contact: rzpConfig.phone },
      theme: { color: "#24503a" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const verifyRes = await fetch("/api/payment/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const json = await verifyRes.json();
          if (!verifyRes.ok) {
            toast.error(json.error ?? "Payment verification failed.");
            return;
          }
          clearLocal();
          router.push(`/order-confirmation?orderNo=${json.orderNo}&token=${json.trackingToken}&method=razorpay`);
        } catch {
          toast.error("Payment verification failed. Contact support if debited.");
        }
      },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled. Your order is saved — you can retry.");
          setSubmitting(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const requestOtp = async (phone: string) => {
    setSendingOtp(true);
    try {
      const res = await fetch("/api/checkout/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Couldn't send the code. Please try again.");
        return;
      }
      setOtpPhone(phone);
      setOtpCode("");
      toast.success(`We sent a 6-digit code to ${phone}.`);
    } catch {
      toast.error("Couldn't send the code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (data: CheckoutInput) => {
    setSubmitting(true);
    // A code only counts for the phone it was sent to.
    const codeForPhone = data.paymentMethod === "COD" && otpPhone === data.phone ? otpCode : undefined;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, otpCode: codeForPhone }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.otpRequired && !codeForPhone) {
          setSubmitting(false);
          await requestOtp(data.phone);
          return;
        }
        toast.error(json.error ?? "Checkout failed.");
        setSubmitting(false);
        return;
      }

      if (json.requiresPayment && json.razorpay) {
        openRazorpay(json.razorpay, json.orderNo);
        return;
      }

      clearLocal();
      router.push(`/order-confirmation?orderNo=${json.orderNo}&token=${json.trackingToken}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center gap-2 py-24 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading checkout…
        </div>
      </Container>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Container>
        <div className="flex flex-col items-center py-24 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
            <ShoppingBag className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl text-forest-dark">Nothing to checkout</h1>
          <p className="mt-2 text-muted">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            Browse products
          </Link>
        </div>
      </Container>
    );
  }

  const hasRzpKey = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const otpStepActive = paymentMethod === "COD" && otpPhone !== null && otpPhone === phone;

  return (
    <div className="py-12 sm:py-16">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRzpReady(true)} />
      <Container>
        <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
          <ArrowLeft className="h-4 w-4" /> Back to cart
        </Link>
        <h1 className="mt-4 font-display text-4xl text-forest-dark sm:text-5xl">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            {/* Contact */}
            <section>
              <h2 className="font-display text-xl text-forest-dark">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Email" error={errors.email?.message}>
                  <input type="email" autoComplete="email" {...register("email")} className={inputCn} />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <input type="tel" autoComplete="tel" {...register("phone")} className={inputCn} />
                </Field>
              </div>
            </section>

            {/* Shipping address */}
            <section>
              <h2 className="font-display text-xl text-forest-dark">Shipping address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Full name" error={errors.shipName?.message}>
                    <input type="text" autoComplete="name" {...register("shipName")} className={inputCn} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 1" error={errors.shipLine1?.message}>
                    <input type="text" autoComplete="address-line1" {...register("shipLine1")} className={inputCn} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 2 (optional)" error={errors.shipLine2?.message}>
                    <input type="text" autoComplete="address-line2" {...register("shipLine2")} className={inputCn} />
                  </Field>
                </div>
                <Field label="City" error={errors.shipCity?.message}>
                  <input type="text" autoComplete="address-level2" {...register("shipCity")} className={inputCn} />
                </Field>
                <Field label="State" error={errors.shipState?.message}>
                  <select {...register("shipState")} className={inputCn} defaultValue="">
                    <option value="" disabled>Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Pincode" error={errors.shipPincode?.message}>
                  <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={6} {...register("shipPincode")} className={inputCn} />
                </Field>
              </div>
            </section>

            {/* Payment method */}
            <section>
              <h2 className="font-display text-xl text-forest-dark">Payment method</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    paymentMethod === "COD" ? "border-forest bg-leaf-soft" : "border-line bg-paper hover:border-forest/40"
                  }`}
                >
                  <input type="radio" value="COD" {...register("paymentMethod")} className="accent-forest" />
                  <Banknote className="h-5 w-5 text-forest" />
                  <div>
                    <p className="text-sm font-medium text-ink">Cash on Delivery</p>
                    {codFee > 0 && <p className="text-xs text-muted">+{formatPaise(codFee)} COD fee</p>}
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    paymentMethod === "RAZORPAY" ? "border-forest bg-leaf-soft" : "border-line bg-paper hover:border-forest/40"
                  } ${!hasRzpKey ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    value="RAZORPAY"
                    {...register("paymentMethod")}
                    disabled={!hasRzpKey}
                    className="accent-forest"
                  />
                  <CreditCard className="h-5 w-5 text-forest" />
                  <div>
                    <p className="text-sm font-medium text-ink">Pay online</p>
                    <p className="text-xs text-muted">{hasRzpKey ? "UPI, cards, netbanking" : "Configure Razorpay keys to enable"}</p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Order summary sidebar */}
          <aside className="h-fit space-y-5 rounded-2xl border border-line bg-cream p-6">
            <h2 className="font-display text-xl text-forest-dark">Order summary</h2>

            <ul className="divide-y divide-line text-sm">
              {cart.items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-3 py-2">
                  <span className="text-ink">
                    {item.productName} <span className="text-muted">x {item.qty}</span>
                    <br />
                    <span className="text-xs text-muted">{item.variantLabel}</span>
                  </span>
                  <span className="shrink-0 font-medium text-ink">{formatPaise(item.linePaise)}</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-ink">{formatPaise(totals?.subtotalPaise ?? 0)}</dd>
              </div>
              {(totals?.discountPaise ?? 0) > 0 && (
                <div className="flex justify-between text-forest">
                  <dt>Discount</dt>
                  <dd className="font-medium">-{formatPaise(totals!.discountPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-medium text-ink">
                  {totals?.shippingPaise === 0 ? <span className="text-forest">Free</span> : formatPaise(totals?.shippingPaise ?? 0)}
                </dd>
              </div>
              {paymentMethod === "COD" && codFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">COD fee</dt>
                  <dd className="font-medium text-ink">{formatPaise(codFee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                <dt className="text-ink">Total</dt>
                <dd className="text-forest-dark">{formatPaise(displayTotal)}</dd>
              </div>
            </dl>

            <div className="flex items-center gap-2 rounded-lg bg-leaf-soft px-3 py-2 text-xs text-forest">
              <Truck className="h-4 w-4 shrink-0" />
              {totals?.shippingPaise === 0 ? "Free shipping on this order!" : `Free shipping over ${formatPaise(totals?.freeShipThresholdPaise ?? 0)}`}
            </div>

            {otpStepActive && (
              <div className="space-y-2 rounded-xl border border-forest/30 bg-leaf-soft p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-forest-dark">
                  <ShieldCheck className="h-4 w-4" /> Verify your phone
                </p>
                <p className="text-xs text-muted">Enter the 6-digit code sent to {otpPhone}.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputCn} text-center font-mono tracking-[0.5em]`}
                  aria-label="Verification code"
                />
                <button
                  type="button"
                  onClick={() => otpPhone && requestOtp(otpPhone)}
                  disabled={sendingOtp}
                  className="text-xs font-medium text-forest underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {sendingOtp ? "Sending…" : "Resend code"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                sendingOtp ||
                (paymentMethod === "RAZORPAY" && !rzpReady) ||
                (otpStepActive && otpCode.length !== 6)
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-sm font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-60"
            >
              {submitting || sendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {sendingOtp ? "Sending code…" : "Processing…"}
                </>
              ) : otpStepActive ? (
                `Verify & place order · ${formatPaise(displayTotal)}`
              ) : (
                `Place order · ${formatPaise(displayTotal)}`
              )}
            </button>
          </aside>
        </form>
      </Container>
    </div>
  );
}

const inputCn =
  "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-clay">{error}</span>}
    </label>
  );
}
