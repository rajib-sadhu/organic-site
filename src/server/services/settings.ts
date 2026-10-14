import { prisma } from "@/lib/prisma";
import type { CustomerAccountMode } from "@/generated/prisma/client";

export type StoreSettings = {
  flatShippingPaise: number;
  freeShipOverPaise: number | null;
  codFeePaise: number;
  codOtpRequired: boolean;
  customerAccounts: CustomerAccountMode;
};

export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.setting.findFirst();
  if (!row) {
    return { flatShippingPaise: 4900, freeShipOverPaise: 49900, codFeePaise: 3000, codOtpRequired: false, customerAccounts: "OPTIONAL" };
  }
  return {
    flatShippingPaise: row.flatShippingPaise,
    freeShipOverPaise: row.freeShipOverPaise,
    codFeePaise: row.codFeePaise,
    codOtpRequired: row.codOtpRequired,
    customerAccounts: row.customerAccounts,
  };
}
