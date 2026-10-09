"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

type Product = {
  id: number; slug: string; name: string; isActive: boolean; isFeatured: boolean;
  category: { name: string };
  variants: { id: number; label: string; pricePaise: number; stock: number; isActive: boolean }[];
  images: { url: string }[];
  createdAt: string;
};

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  // Key of the query whose results are on screen; loading until it matches the current query.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const currentPage = Number(searchParams.get("page") ?? 1);
  const queryKey = `${searchParams.get("q") ?? ""}|${currentPage}`;
  const loading = loadedKey !== queryKey;

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    params.set("page", String(currentPage));
    return fetch(`/api/admin/products?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (isStale()) return;
        setProducts(json.products ?? []);
        setTotal(json.total ?? 0);
        setPages(json.pages ?? 1);
        setLoadedKey(queryKey);
      });
  }, [searchParams, currentPage, queryKey]);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    router.push(`/admin/products?${params}`);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted.");
      load();
    } else {
      const json = await res.json();
      toast.error(json.error ?? "Delete failed.");
    }
  };

  const minPrice = (variants: Product["variants"]) => {
    const active = variants.filter((v) => v.isActive);
    if (!active.length) return null;
    return Math.min(...active.map((v) => v.pricePaise));
  };

  const totalStock = (variants: Product["variants"]) =>
    variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-64 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
        />
        <button type="submit" className="rounded-lg bg-sand px-4 py-2 text-sm font-medium text-ink hover:bg-line">
          Search
        </button>
      </form>

      <p className="text-sm text-muted">{total} product{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img src={p.images[0].url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-sand text-xs text-muted">—</div>
                      )}
                      <div>
                        <Link href={`/admin/products/${p.id}`} className="font-medium text-ink hover:text-forest-dark">{p.name}</Link>
                        <p className="text-xs text-muted">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{p.category.name}</td>
                  <td className="px-4 py-2.5 font-medium">{minPrice(p.variants) != null ? formatPaise(minPrice(p.variants)!) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-medium", totalStock(p.variants) === 0 ? "text-clay" : totalStock(p.variants) <= 5 ? "text-honey-dark" : "text-ink")}>
                      {totalStock(p.variants)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-forest"><Eye className="h-3 w-3" /> Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted"><EyeOff className="h-3 w-3" /> Draft</span>
                    )}
                    {p.isFeatured && <span className="ml-1 text-xs text-honey-dark">★</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              const params = new URLSearchParams();
              const q = searchParams.get("q");
              if (q) params.set("q", q);
              params.set("page", String(currentPage - 1));
              router.push(`/admin/products?${params}`);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-sand disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted">Page {currentPage} of {pages}</span>
          <button
            type="button"
            disabled={currentPage >= pages}
            onClick={() => {
              const params = new URLSearchParams();
              const q = searchParams.get("q");
              if (q) params.set("q", q);
              params.set("page", String(currentPage + 1));
              router.push(`/admin/products?${params}`);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-sand disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
