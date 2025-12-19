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
  title: z.string().min(1, "Title is required"),
  target_bdt: z.string().min(1, "Target amount is required"),
  target_date: z.string().optional(), // YYYY-MM-DD
  note: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

type FormValues = z.infer<typeof schema>;

type GoalDefaults = {
  id: string;
  title: string;
  target_minor: number;
  target_date: string | null;
  note: string | null;
  status: "ACTIVE" | "COMPLETED";
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

export function GoalForm({
  onSuccess,
  redirectTo,
  initialValues,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
  initialValues?: GoalDefaults;
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
      title: initialValues?.title ?? "",
      target_bdt: minorToInput(initialValues?.target_minor),
      target_date: initialValues?.target_date ?? "",
      note: initialValues?.note ?? "",
      status: initialValues?.status ?? "ACTIVE",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const targetMinor = bdtToMinor(values.target_bdt);
    if (targetMinor === null) {
      alert("Target amount must be a valid number.");
      return;
    }

    const title = sanitizeText(values.title, { maxLength: 200 });
    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240, preserveNewLines: true }) : "";
    const note = noteRaw || null;
    if (!title) {
      alert("Goal title is required.");
      return;
    }

    const res = await fetch(isEdit ? `/api/goals/${initialValues!.id}` : "/api/goals", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        target_minor: targetMinor,
        target_date: values.target_date?.trim() || null,
        note,
        status: values.status || undefined,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} goal.`);
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
        <div className="text-sm font-semibold">{isEdit ? "Edit Goal" : "Create Goal"}</div>
        <div className="text-xs subtle">Track progress with contributions</div>
      </div>

      <Input label="Goal title" placeholder="e.g., Emergency Fund" {...register("title")} error={errors.title?.message} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Target amount (BDT)"
          placeholder="e.g., 50000"
          inputMode="decimal"
          {...register("target_bdt")}
          error={errors.target_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
        <Input label="Target date (optional)" type="date" {...register("target_date")} error={errors.target_date?.message} />
      </div>

      <Input label="Note (optional)" placeholder="Why this goal matters" {...register("note")} error={errors.note?.message} />

      {isEdit ? (
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Status</label>
          <select className="input" {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>
          {errors.status?.message && <p className="mt-1 text-xs font-medium text-red-600">{errors.status.message}</p>}
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
