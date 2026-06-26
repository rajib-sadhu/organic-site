import { prisma } from "@/lib/prisma";

export type StoreSettings = {
  flatShippingPaise: number;
  freeShipOverPaise: number | null;
  codFeePaise: number;
  codOtpRequired: boolean;
};

export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.setting.findFirst();
  if (!row) {
    return { flatShippingPaise: 4900, freeShipOverPaise: 49900, codFeePaise: 3000, codOtpRequired: false };
  }
  return {
    flatShippingPaise: row.flatShippingPaise,
    freeShipOverPaise: row.freeShipOverPaise,
    codFeePaise: row.codFeePaise,
    codOtpRequired: row.codOtpRequired,
  };
}
