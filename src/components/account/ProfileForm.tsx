"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { INDIAN_STATES } from "@/lib/indian-states";
import { useAccount, type AccountAddress } from "@/store/account";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

type Props = { name: string | null; phone: string | null; address: AccountAddress | null };

const EMPTY = { shipName: "", shipLine1: "", shipLine2: "", shipCity: "", shipState: "", shipPincode: "" };

export function ProfileForm({ name: initialName, phone: initialPhone, address }: Props) {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [addr, setAddr] = useState({ ...EMPTY, ...Object.fromEntries(Object.entries(address ?? {}).map(([k, v]) => [k, v ?? ""])) });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  // A blank address means "no saved address"; a partly filled one is validated as a whole.
  const hasAddress = Object.entries(addr).some(([k, v]) => k !== "shipLine2" && v.trim() !== "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postJson("/api/account/profile", {
        name,
        phone,
        address: hasAddress ? { ...addr, shipLine2: addr.shipLine2 || undefined } : null,
      }, "PATCH");
      await refresh();
      toast.success("Saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCn} /></Field>
        <Field label="Phone"><input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCn} /></Field>
      </div>
      <p className="pt-2 text-sm font-semibold text-ink">Saved delivery address <span className="font-normal text-muted">· fills in checkout</span></p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><input autoComplete="shipping name" value={addr.shipName} onChange={set("shipName")} className={inputCn} /></Field>
        <Field label="Pincode"><input inputMode="numeric" autoComplete="shipping postal-code" value={addr.shipPincode} onChange={set("shipPincode")} className={inputCn} /></Field>
        <Field label="Address line 1"><input autoComplete="shipping address-line1" value={addr.shipLine1} onChange={set("shipLine1")} className={inputCn} /></Field>
        <Field label="Address line 2 (optional)"><input autoComplete="shipping address-line2" value={addr.shipLine2} onChange={set("shipLine2")} className={inputCn} /></Field>
        <Field label="City"><input autoComplete="shipping address-level2" value={addr.shipCity} onChange={set("shipCity")} className={inputCn} /></Field>
        <Field label="State">
          <select value={addr.shipState} onChange={set("shipState")} className={inputCn}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="sm:w-48"><SubmitButton loading={loading}>Save changes</SubmitButton></div>
    </form>
  );
}
