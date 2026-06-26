import Link from "next/link";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-forest-dark text-cream/80">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold text-cream">
              {siteConfig.name}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
            {siteConfig.description}
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-honey" /> {siteConfig.contact.email}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-honey" /> {siteConfig.contact.phone}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-honey" /> {siteConfig.contact.address}
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-cream">
            Shop
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-cream/70 transition-colors hover:text-honey">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-cream">
            Policies
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {siteConfig.legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-cream/70 transition-colors hover:text-honey">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 font-display text-sm font-semibold uppercase tracking-wider text-cream">
            Stay updated
          </h3>
          <p className="mt-2 text-xs text-cream/60">Get recipes, offers & seasonal picks.</p>
          <div className="mt-3">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-cream/60 sm:flex-row">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p>Made with care for healthier kitchens.</p>
        </div>
      </div>
    </footer>
  );
}
