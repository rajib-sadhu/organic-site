import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <>
      <h1>About {siteConfig.name}</h1>

      <p>
        {siteConfig.name} brings honest, certified-organic food from farm to your kitchen. We work
        directly with growers who farm without synthetic pesticides or additives, so every grain,
        oil and jar of honey we sell is something we&apos;d happily feed our own families.
      </p>

      <h2>Our promise</h2>
      <ul>
        <li>Genuinely organic, traceable sourcing.</li>
        <li>Minimal processing — nothing artificial added.</li>
        <li>Fair prices and dependable delivery.</li>
      </ul>

      <h2>Get in touch</h2>
      <p>
        We&apos;d love to hear from you at{" "}
        <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a> or{" "}
        {siteConfig.contact.phone}.
      </p>
    </>
  );
}
