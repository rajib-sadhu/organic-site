import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping & Delivery Policy" };

export default function ShippingPolicyPage() {
  return (
    <>
      <h1>Shipping &amp; Delivery Policy</h1>
      <p className="text-sm">Last updated: [date]</p>

      <h2>Coverage &amp; charges</h2>
      <ul>
        <li>We currently ship across India.</li>
        <li>A flat shipping fee applies and is shown at checkout; orders above ₹499 ship free.</li>
        <li>Cash on Delivery, where available, may include a small additional fee.</li>
      </ul>

      <h2>Processing &amp; delivery time</h2>
      <ul>
        <li>Orders are usually processed within [X] business days.</li>
        <li>Delivery typically takes [X–Y] business days depending on your location.</li>
        <li>You will receive tracking details once your order is dispatched.</li>
      </ul>

      <h2>Delays</h2>
      <p>
        Delivery timelines are estimates and may be affected by courier or regional factors outside
        our control.
      </p>
    </>
  );
}
