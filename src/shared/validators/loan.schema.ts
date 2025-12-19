// TODO: Replace with Zod schema for loans and payments.
import { z } from "zod";

export const loanCreateSchema = z.object({
  lender: z.string().min(1, "Lender is required").max(64, "Lender too long"),
  principal_minor: z.number().int().positive("Principal must be greater than 0"),
  interest_rate: z.number().min(0).max(100).nullable().optional(),
  start_date: z.string().min(10).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
});

export const loanUpdateSchema = z.object({
  lender: z.string().min(1).max(64).optional(),
  principal_minor: z.number().int().positive().optional(),
  interest_rate: z.number().min(0).max(100).nullable().optional(),
  start_date: z.string().min(10).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
});

export const loanPaymentSchema = z.object({
  amount_minor: z.number().int().positive("Payment must be greater than 0"),
  paid_at: z.string().min(10, "Date/time is required"),
  note: z.string().max(240).nullable().optional(),
});

export const loanPaymentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
