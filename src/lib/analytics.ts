// GA4 / GTM e-commerce tracking. Both are optional: set NEXT_PUBLIC_GA_ID and/or
// NEXT_PUBLIC_GTM_ID. Nothing is loaded or sent until the visitor accepts the
// cookie banner (Consent Mode v2, basic mode).
// If you set both IDs, don't also add a GA4 tag inside the GTM container, or
// every event is counted twice.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
export const analyticsEnabled = Boolean(GA_ID || GTM_ID);

export type Consent = "granted" | "denied";
const CONSENT_KEY = "verdant-consent";
export const CONSENT_EVENT = "verdant:consent";

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    // storage blocked; the choice lasts for this page only
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** A GA4 e-commerce item. Prices are rupees (GA expects major units), converted from paise. */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity?: number;
  index?: number;
};

export function toItem(i: {
  productSlug: string;
  productName: string;
  variantLabel?: string;
  pricePaise: number;
  qty?: number;
  category?: string;
}): AnalyticsItem {
  return {
    item_id: i.productSlug,
    item_name: i.productName,
    ...(i.variantLabel ? { item_variant: i.variantLabel } : {}),
    ...(i.category ? { item_category: i.category } : {}),
    price: i.pricePaise / 100,
    ...(i.qty ? { quantity: i.qty } : {}),
  };
}

export const rupees = (paise: number) => paise / 100;

type CartLike = {
  items: { productSlug: string; productName: string; variantLabel: string; pricePaise: number; qty: number }[];
  totals: { subtotalPaise: number; discountPaise: number; coupon: { valid: boolean; code?: string } | null };
};

/** Params shared by view_cart / begin_checkout / add_payment_info: value is the goods total after discount. */
export function cartParams(cart: CartLike) {
  const coupon = cart.totals.coupon?.valid ? cart.totals.coupon.code : undefined;
  return {
    currency: "INR",
    value: rupees(cart.totals.subtotalPaise - cart.totals.discountPaise),
    ...(coupon ? { coupon } : {}),
    items: cart.items.map(toItem),
  };
}

type Win = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export type EcommerceEvent =
  | "view_item_list" | "view_item" | "add_to_cart" | "remove_from_cart"
  | "view_cart" | "begin_checkout" | "add_payment_info" | "purchase";

let loaded = false;
let revoked = false;

function loadScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Set up gtag/dataLayer and inject the tags, once per page load. Call only after consent is granted. */
export function loadAnalytics() {
  if (typeof window === "undefined" || !analyticsEnabled) return;
  if (loaded) {
    // Declined earlier on this page, accepted again.
    if (revoked) (window as Win).gtag?.("consent", "update", { analytics_storage: "granted" });
    revoked = false;
    return;
  }
  loaded = true;
  const w = window as Win;
  w.dataLayer = w.dataLayer || [];
  // gtag.js reads the `arguments` object itself, not an array, so this must stay a `function`.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", {
    analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  });
  w.gtag("js", new Date());
  if (GA_ID) {
    w.gtag("config", GA_ID);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
  }
  if (GTM_ID) {
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`);
  }
}

/** Visitor declined after the tags were loaded: tell Google to stop using storage. */
export function revokeAnalytics() {
  if (!loaded || revoked) return;
  revoked = true;
  (window as Win).gtag?.("consent", "update", { analytics_storage: "denied" });
}

export function track(event: EcommerceEvent, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !analyticsEnabled || getConsent() !== "granted") return;
  loadAnalytics();
  const w = window as Win;
  if (GA_ID) w.gtag?.("event", event, params);
  if (GTM_ID) {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ ecommerce: null }); // GTM merges objects; clear the previous ecommerce payload
    w.dataLayer.push({ event, ecommerce: params });
  }
}
