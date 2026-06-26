import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms &amp; Conditions</h1>
      <p className="text-sm">Last updated: [date]</p>

      <p>
        These terms govern your use of {siteConfig.name} and any purchase you make. By placing an
        order you agree to them.
      </p>

      <h2>Orders &amp; pricing</h2>
      <ul>
        <li>All prices are listed in INR and are inclusive of applicable taxes unless stated otherwise.</li>
        <li>We may decline or cancel an order due to stock, pricing errors or suspected fraud.</li>
        <li>Cash on Delivery (COD) may carry an additional handling fee shown at checkout.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Online payments are processed securely by our payment gateway. We do not store your card
        or banking credentials.
      </p>

      <h2>Product information</h2>
      <p>
        We try to describe products accurately, but packaging, weight and appearance of natural
        products may vary slightly.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email{" "}
        <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
      </p>
    </>
  );
}
