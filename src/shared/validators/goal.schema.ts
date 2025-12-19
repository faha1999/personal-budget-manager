// TODO: Replace with Zod schema for goals and contributions.
import { z } from "zod";

export const goalCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(64, "Title too long"),
  target_minor: z.number().int().positive("Target must be greater than 0"),
  target_date: z.string().min(10).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
});

export const goalUpdateSchema = z.object({
  title: z.string().min(1).max(64).optional(),
  target_minor: z.number().int().positive().optional(),
  target_date: z.string().min(10).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
});

export const goalContributionSchema = z.object({
  amount_minor: z.number().int().positive("Amount must be greater than 0"),
  contributed_at: z.string().min(10, "Date/time is required"),
  note: z.string().max(240).nullable().optional(),
});

export const goalContribListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
