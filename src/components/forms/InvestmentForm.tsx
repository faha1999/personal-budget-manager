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
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  units: z.string().optional(),
  initial_value_bdt: z.string().optional(),
  valued_at: z.string().optional(),
  note: z.string().optional(),
  close: z.boolean().optional(),
  final_value_bdt: z.string().optional(),
  closed_at: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type InvestmentDefaults = {
  id: string;
  name: string;
  type: string;
  units: number | null;
  note: string | null;
  status?: "ACTIVE" | "CLOSED";
  closedAt?: string | null;
  finalValueMinor?: number | null;
  realizedGainMinor?: number | null;
  initialValueMinor?: number | null;
  initialValuedAt?: string | null;
};

function bdtToMinor(amountBdt: string | undefined) {
  const cleaned = String(amountBdt ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toNumberOrNull(v?: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function InvestmentForm({
  onSuccess,
  redirectTo,
  initialValues,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
  initialValues?: InvestmentDefaults;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      type: initialValues?.type ?? "INVESTMENT",
      units: initialValues?.units != null ? String(initialValues.units) : "",
      initial_value_bdt:
        initialValues?.initialValueMinor != null ? String(initialValues.initialValueMinor / 100) : "",
      valued_at: initialValues
        ? initialValues.initialValuedAt?.slice(0, 10) ?? ""
        : new Date().toISOString().slice(0, 10),
      note: initialValues?.note ?? "",
      close: initialValues?.status === "CLOSED",
      final_value_bdt:
        initialValues?.finalValueMinor != null ? String(initialValues.finalValueMinor / 100) : "",
      closed_at: initialValues?.closedAt?.slice(0, 10) ?? "",
    },
  });

  const closing = watch("close");

  const onSubmit = handleSubmit(async (values) => {
    const units = toNumberOrNull(values.units);
    const hasInitial = Boolean(values.initial_value_bdt?.trim());
    const initialValueMinor = hasInitial ? bdtToMinor(values.initial_value_bdt) : null;
    const hasFinal = Boolean(values.final_value_bdt?.trim());
    const finalValueMinor = hasFinal ? bdtToMinor(values.final_value_bdt) : null;

    if (values.units?.trim() && units === null) {
      alert("Units must be a valid number greater or equal to 0.");
      return;
    }
    if (hasInitial && initialValueMinor === null) {
      alert("Initial value must be a valid number in BDT.");
      return;
    }
    if (closing && !hasFinal) {
      alert("Final value is required when closing an investment.");
      return;
    }
    if (hasFinal && finalValueMinor === null) {
      alert("Final value must be a valid number in BDT.");
      return;
    }

    const name = sanitizeText(values.name, { maxLength: 120 });
    const type = sanitizeText(values.type, { maxLength: 60 }) || "INVESTMENT";
    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const note = noteRaw || null;

    if (!name) {
      alert("Name is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      type,
      units: units ?? undefined,
      note,
    };

    if (hasInitial) payload.initial_value_minor = initialValueMinor ?? undefined;
    if (values.valued_at?.trim()) payload.valued_at = values.valued_at.trim();

    if (isEdit) {
      payload.status = closing ? "CLOSED" : initialValues?.status === "CLOSED" ? "ACTIVE" : undefined;
      if (closing) {
        payload.final_value_minor = finalValueMinor ?? undefined;
        if (values.closed_at?.trim()) payload.closed_at = values.closed_at.trim();
      }
    }

    const res = await fetch(isEdit ? `/api/investments/${initialValues!.id}` : "/api/investments", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} investment.`);
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{isEdit ? "Edit Investment" : "Add Investment"}</div>
          <div className="text-xs subtle">Track holdings with optional units and initial value.</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" placeholder="e.g., ABC Bank DPS" {...register("name")} error={errors.name?.message} />
        <Input label="Type" placeholder="e.g., DPS, FDR, STOCK" {...register("type")} error={errors.type?.message} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Units (optional)"
          placeholder="e.g., 100"
          inputMode="decimal"
          {...register("units")}
          error={errors.units?.message}
        />
        <Input
          label="Initial value (BDT, optional)"
          placeholder="e.g., 50000"
          inputMode="decimal"
          {...register("initial_value_bdt")}
          error={errors.initial_value_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
      </div>

      <Input
        label="Valued at (optional)"
        type="date"
        {...register("valued_at")}
        error={errors.valued_at?.message}
      />

      <Input label="Note (optional)" placeholder="Any details about the investment" {...register("note")} error={errors.note?.message} />

      {isEdit ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <div className="flex items-start justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <input type="checkbox" {...register("close")} className="h-4 w-4" />
              Mark as closed
            </label>
            {initialValues?.realizedGainMinor !== undefined ? (
              <span className="text-xs font-semibold text-slate-700">
                Realized gain/loss: {((initialValues.realizedGainMinor ?? 0) / 100).toFixed(2)} BDT
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-600">Set a final value and date to capture profit or loss, then archive this investment.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Final value (BDT)"
              placeholder="e.g., 75000"
              inputMode="decimal"
              disabled={!closing}
              {...register("final_value_bdt")}
              error={errors.final_value_bdt?.message}
              rightAdornment={<span className="text-xs font-semibold">৳</span>}
            />
            <Input
              label="Closed at"
              type="date"
              disabled={!closing}
              {...register("closed_at")}
              error={errors.closed_at?.message}
            />
          </div>
        </div>
      ) : null}

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
