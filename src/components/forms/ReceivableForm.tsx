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
  person: z.string().min(1, "Name is required"),
  principal_bdt: z.string().min(1, "Amount is required"),
  start_date: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ReceivableDefaults = {
  id: string;
  person: string;
  principal_minor: number;
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

export function ReceivableForm({
  onSuccess,
  redirectTo,
  initialValues,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
  initialValues?: ReceivableDefaults;
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
      person: initialValues?.person ?? "",
      principal_bdt: minorToInput(initialValues?.principal_minor),
      start_date: initialValues?.start_date ?? "",
      note: initialValues?.note ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const principalMinor = bdtToMinor(values.principal_bdt);
    if (principalMinor === null) {
      alert("Amount must be a valid number.");
      return;
    }

    const person = sanitizeText(values.person, { maxLength: 160 });
    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const note = noteRaw || null;

    if (!person) {
      alert("Person is required.");
      return;
    }

    const res = await fetch(isEdit ? `/api/receivables/${initialValues!.id}` : "/api/receivables", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? {
              person,
              principal_minor: principalMinor,
              start_date: values.start_date?.trim() || null,
              note,
            }
          : {
              person,
              principal_bdt: values.principal_bdt,
              start_date: values.start_date?.trim() || null,
              note,
            }
      ),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} receivable.`);
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
        <div className="text-sm font-semibold">{isEdit ? "Edit receivable" : "Record receivable"}</div>
        <div className="text-xs subtle">Money someone owes you (asset)</div>
      </div>

      <Input label="Person" placeholder="e.g., John Doe" {...register("person")} error={errors.person?.message} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount (BDT)"
          placeholder="e.g., 10000"
          inputMode="decimal"
          {...register("principal_bdt")}
          error={errors.principal_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input label="Start date (optional)" type="date" {...register("start_date")} error={errors.start_date?.message} />
      </div>

      <Input label="Note (optional)" placeholder="Reason or context" {...register("note")} error={errors.note?.message} />

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
