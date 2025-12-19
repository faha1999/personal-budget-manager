  // TODO: client-side form to add investment value in BDT.

  "use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  amount_bdt: z.string().min(1, "Value is required"),
  valued_at: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function bdtToMinor(amountBdt: string) {
  const cleaned = amountBdt.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function InvestmentValueForm({ investmentId, onSuccess }: { investmentId: string; onSuccess?: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valued_at: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const valueMinor = bdtToMinor(values.amount_bdt);
    if (valueMinor === null) {
      alert("Value must be a number in BDT (>= 0).");
      return;
    }

    const res = await fetch(`/api/investments/${investmentId}/value`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_bdt: values.amount_bdt,
        valued_at: values.valued_at?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Failed to add value.");
      return;
    }

    router.refresh();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Add value</p>
        <p className="text-xs text-slate-600">Enter BDT amount and date.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Value (BDT)"
          inputMode="decimal"
          placeholder="e.g., 2500 or 254.56"
          {...register("amount_bdt")}
          error={errors.amount_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input label="Valued at" type="date" {...register("valued_at")} error={errors.valued_at?.message} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Save value
        </Button>
      </div>
    </form>
  );
}
