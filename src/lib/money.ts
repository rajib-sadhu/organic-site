// Money utilities. All monetary values are stored as INTEGER PAISE.
// Never use floats for money — convert only at display/parse boundaries.

/** Format paise as an INR string, e.g. 49900 -> "₹499.00". */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

/** Convert rupees (number or string) to integer paise. */
export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  return Math.round(n * 100);
}

/** Convert integer paise to a rupees number (for display/forms only). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
