import { Mail, Phone, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <span className="text-sm font-semibold uppercase tracking-wider text-leaf">
              Get in touch
            </span>
            <h2 className="mt-3 font-display text-4xl text-forest-dark sm:text-5xl">
              Questions? We&apos;d love to help.
            </h2>
            <p className="mt-4 max-w-md text-muted">
              Bulk orders, sourcing questions, or feedback — drop us a note and our team will
              respond within a working day.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-soft text-forest">
                  <Mail className="h-5 w-5" />
                </span>
                {siteConfig.contact.email}
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-soft text-forest">
                  <Phone className="h-5 w-5" />
                </span>
                {siteConfig.contact.phone}
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-soft text-forest">
                  <MapPin className="h-5 w-5" />
                </span>
                {siteConfig.contact.address}
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-line bg-cream p-6 sm:p-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
