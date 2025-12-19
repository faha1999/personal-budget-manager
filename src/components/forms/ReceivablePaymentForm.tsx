  // TODO: client-side form to add payments received against receivables.

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
  received_at: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function bdtToMinor(amountBdt: string) {
  const cleaned = amountBdt.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function ReceivablePaymentForm({ receivableId, onSuccess }: { receivableId: string; onSuccess?: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      received_at: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const amountMinor = bdtToMinor(values.amount_bdt);
    if (amountMinor === null) {
      alert("Amount must be a positive number in BDT.");
      return;
    }

    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const res = await fetch(`/api/receivables/${receivableId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_bdt: values.amount_bdt,
        received_at: values.received_at?.trim() || undefined,
        note: noteRaw || undefined,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Failed to record payment.");
      return;
    }

    router.refresh();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Add received payment</p>
        <p className="text-xs text-slate-600">Track money coming back to you.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount (BDT)"
          inputMode="decimal"
          placeholder="e.g., 1000 or 2500.50"
          {...register("amount_bdt")}
          error={errors.amount_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input label="Received on" type="date" {...register("received_at")} error={errors.received_at?.message} />
      </div>

      <Input label="Note (optional)" placeholder="Any details" {...register("note")} error={errors.note?.message} />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Add payment
        </Button>
      </div>
    </form>
  );
}
