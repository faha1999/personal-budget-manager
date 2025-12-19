  // TODO: client-side form to add goal contributions in BDT.

  "use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sanitizeText } from "@/shared/security/sanitize";

const schema = z.object({
  amount_bdt: z.string().min(1, "Amount is required"),
  contributed_at: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function bdtToMinor(amountBdt: string) {
  const cleaned = amountBdt.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function GoalContributionForm({
  goalId,
  onSuccess,
}: {
  goalId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contributed_at: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const amountMinor = bdtToMinor(values.amount_bdt);
    if (amountMinor === null) {
      alert("Amount must be a positive number in BDT.");
      return;
    }

    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const res = await fetch(`/api/goals/${goalId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_bdt: values.amount_bdt,
        contributed_at: values.contributed_at?.trim() || undefined,
        note: noteRaw || undefined,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Failed to add contribution.");
      return;
    }

    router.refresh();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Add contribution</p>
        <p className="text-xs text-slate-600">Enter BDT amount and optional note/date.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount (BDT)"
          inputMode="decimal"
          placeholder="e.g., 2500 or 2554.56"
          {...register("amount_bdt")}
          error={errors.amount_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input label="Date" type="date" {...register("contributed_at")} error={errors.contributed_at?.message} />
      </div>

      <Input label="Note (optional)" placeholder="e.g., Salary to savings" {...register("note")} error={errors.note?.message} />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Add contribution
        </Button>
      </div>
    </form>
  );
}
