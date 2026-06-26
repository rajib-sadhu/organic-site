import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Renders a single price or a "from" price when variants differ. */
export function Price({
  variants,
  className,
}: {
  variants: { pricePaise: number }[];
  className?: string;
}) {
  if (variants.length === 0) {
    return <span className={cn("text-muted", className)}>—</span>;
  }
  const prices = variants.map((v) => v.pricePaise);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return (
    <span className={cn("font-medium text-forest-dark", className)}>
      {min !== max && <span className="text-sm font-normal text-muted">from </span>}
      {formatPaise(min)}
    </span>
  );
}
