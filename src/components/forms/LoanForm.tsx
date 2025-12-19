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
  lender: z.string().min(1, "Lender is required"),
  principal_bdt: z.string().min(1, "Principal is required"),
  interest_rate: z.string().optional(), // annual %
  start_date: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type LoanDefaults = {
  id: string;
  lender: string;
  principal_minor: number;
  interest_rate: number | null;
  start_date: string | null;
  note: string | null;
};

function bdtToMinor(amountBdt: string) {
  const cleaned = amountBdt.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function minorToInput(amountMinor?: number) {
  if (!Number.isFinite(Number(amountMinor))) return "";
  return String(Number(amountMinor) / 100);
}

function toNumberOrNull(v?: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function LoanForm({
  onSuccess,
  redirectTo,
  initialValues,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
  initialValues?: LoanDefaults;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lender: initialValues?.lender ?? "",
      principal_bdt: minorToInput(initialValues?.principal_minor),
      interest_rate: initialValues?.interest_rate != null ? String(initialValues.interest_rate) : "",
      start_date: initialValues?.start_date ?? "",
      note: initialValues?.note ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const principalMinor = bdtToMinor(values.principal_bdt);
    if (principalMinor === null) {
      alert("Principal must be a valid number.");
      return;
    }

    const interest = toNumberOrNull(values.interest_rate);
    const lender = sanitizeText(values.lender, { maxLength: 160 });
    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const note = noteRaw || null;

    if (!lender) {
      alert("Lender is required.");
      return;
    }

    const res = await fetch(isEdit ? `/api/loans/${initialValues!.id}` : "/api/loans", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lender,
        principal_minor: principalMinor,
        interest_rate: interest,
        start_date: values.start_date?.trim() || null,
        note,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} loan.`);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    } else {
      router.refresh();
    }
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-4">
      <div>
        <div className="text-sm font-semibold">{isEdit ? "Edit Loan" : "Add Loan"}</div>
        <div className="text-xs subtle">Track payments & remaining balance</div>
      </div>

      <Input label="Lender" placeholder="e.g., Bank / Person name" {...register("lender")} error={errors.lender?.message} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Principal (BDT)"
          placeholder="e.g., 100000"
          inputMode="decimal"
          {...register("principal_bdt")}
          error={errors.principal_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input
          label="Interest rate (annual %)"
          placeholder="e.g., 9"
          inputMode="decimal"
          {...register("interest_rate")}
          error={errors.interest_rate?.message}
        />
      </div>

      <Input label="Start date (optional)" type="date" {...register("start_date")} error={errors.start_date?.message} />
      <Input label="Note (optional)" placeholder="Any details about the loan" {...register("note")} error={errors.note?.message} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
}
