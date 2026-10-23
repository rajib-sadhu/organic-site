"use client";

import { create } from "zustand";

export type AccountMode = "OFF" | "OPTIONAL" | "REQUIRED";
export type PasswordLoginMode = "OFF" | "OPTIONAL" | "REQUIRED";
export type AccountAddress = {
  shipName: string | null; shipLine1: string; shipLine2: string | null;
  shipCity: string | null; shipState: string | null; shipPincode: string | null;
};
export type AccountCustomer = {
  email: string; name: string | null; phone: string | null;
  verified: boolean; hasPassword: boolean; address: AccountAddress | null;
};

type AccountState = {
  loaded: boolean;
  mode: AccountMode;
  passwordLogin: PasswordLoginMode;
  customer: AccountCustomer | null;
  refresh: () => Promise<void>;
};

// Not persisted: the session cookie is the source of truth; this mirrors /api/account/me.
export const useAccount = create<AccountState>()((set) => ({
  loaded: false,
  mode: "OPTIONAL",
  passwordLogin: "OPTIONAL",
  customer: null,
  refresh: async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const json = await res.json();
      set({ loaded: true, mode: json.mode ?? "OPTIONAL", passwordLogin: json.passwordLogin ?? "OPTIONAL", customer: json.customer ?? null });
    } catch {
      set({ loaded: true });
    }
  },
}));
