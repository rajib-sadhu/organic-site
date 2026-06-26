import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm">Last updated: [date]</p>

      <p>
        {siteConfig.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy
        explains what personal data we collect when you use our website and place orders, and how
        we use and protect it, in line with applicable Indian data-protection law.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Contact and delivery details you provide at checkout (name, email, phone, shipping address).</li>
        <li>Order and payment metadata (we do not store full card details — payments are processed by our gateway).</li>
        <li>Basic usage analytics to improve the site.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To process, fulfil and deliver your orders.</li>
        <li>To send order confirmations, invoices and service updates.</li>
        <li>To respond to enquiries and improve our products and service.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share data only with service providers needed to run the store (payment gateway,
        delivery partners, email provider) and where required by law. We do not sell your data.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access, correction or deletion of your personal data by writing to{" "}
        <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
      </p>
    </>
  );
}
