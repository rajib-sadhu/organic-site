// Central site config — brand strings, navigation, contact, footer links.
// Edit here to retune copy/links across the whole storefront.

export const siteConfig = {
  name: "Verdant",
  tagline: "Pure organic foods, delivered fresh",
  description:
    "Certified organic grains, cold-pressed oils, raw honey and pantry staples — sourced from trusted farms across India.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    email: "hello@verdant.example",
    phone: "+91 89670 63029",
    address: "Kolkata, West Bengal, India",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/#contact" },
    { label: "Track Order", href: "/track" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Refund & Cancellation", href: "/refund-policy" },
    { label: "Shipping & Delivery", href: "/shipping-policy" },
    { label: "About Us", href: "/about" },
  ],
} as const;
