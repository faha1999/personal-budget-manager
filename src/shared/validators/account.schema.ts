// TODO: Replace with Zod schema for accounts (create/update).
import { z } from "zod";
import type { AccountType, CurrencyCode } from "@/shared/types/models";

const accountType = z.enum(["BANK", "CASH", "MOBILE_WALLET", "OTHER"]) satisfies z.ZodType<AccountType>;
const currency = z.enum(["BDT"]) satisfies z.ZodType<CurrencyCode>;

export const accountCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(48, "Name too long"),
  bank_name: z.string().max(64, "Bank name too long").nullable().optional(),
  type: accountType,
  currency: currency.optional().default("BDT"),
  opening_balance_minor: z.number().int().min(0, "Opening balance cannot be negative").optional().default(0),
});

export const accountUpdateSchema = z.object({
  name: z.string().min(1).max(48).optional(),
  bank_name: z.string().max(64).nullable().optional(),
  type: accountType.optional(),
  currency: currency.optional(),
  opening_balance_minor: z.number().int().min(0).optional(),
});
