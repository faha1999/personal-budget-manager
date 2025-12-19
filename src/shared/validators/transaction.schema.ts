// TODO: Replace with Zod schema for transactions (create/update) including validation rules.
import { z } from "zod";
import type { TxType } from "@/shared/types/models";

const txType = z.enum(["INCOME", "EXPENSE"]) satisfies z.ZodType<TxType>;

export const transactionCreateSchema = z.object({
  account_id: z.string().min(1, "Account is required"),
  type: txType,
  category: z.string().min(1, "Category is required").max(40, "Category too long"),
  amount_minor: z.number().int().positive("Amount must be greater than 0"),
  note: z.string().max(240, "Note too long").nullable().optional(),
  occurred_at: z.string().min(10, "Date/time is required"), // ISO string expected
});

export const transactionUpdateSchema = z.object({
  account_id: z.string().min(1).optional(),
  type: txType.optional(),
  category: z.string().min(1).max(40).optional(),
  amount_minor: z.number().int().positive().optional(),
  note: z.string().max(240).nullable().optional(),
  occurred_at: z.string().min(10).optional(),
});

export const transactionsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  start: z.string().min(10).optional(),
  end: z.string().min(10).optional(),
  type: txType.optional(),
  category: z.string().min(1).max(40).optional(),
  accountId: z.string().min(1).optional(),
});
