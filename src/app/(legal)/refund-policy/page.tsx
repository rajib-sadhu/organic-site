import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };

export default function RefundPolicyPage() {
  return (
    <>
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="text-sm">Last updated: [date]</p>

      <h2>Cancellations</h2>
      <p>
        Orders can be cancelled before they are dispatched. Once an order has shipped it cannot be
        cancelled, but it may be eligible for return as below.
      </p>

      <h2>Returns &amp; refunds</h2>
      <ul>
        <li>
          As we sell food products, returns are accepted only for items that arrive damaged,
          defective or incorrect.
        </li>
        <li>
          Report any issue within [X] hours of delivery with photos to{" "}
          <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
        </li>
        <li>
          Approved refunds are issued to the original payment method within [X] business days. For
          COD orders, refunds are made via bank transfer.
        </li>
      </ul>

      <h2>Non-returnable</h2>
      <p>Opened or partially used food items cannot be returned for hygiene and safety reasons.</p>
    </>
  );
}
