"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/shared/constants/categories";
import { sanitizeText } from "@/shared/security/sanitize";

const schema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    type: z.enum(["INCOME", "EXPENSE"]),
    category: z.string().min(1, "Category is required"),
    custom_category: z.string().optional(),
    amount_bdt: z.string().min(1, "Amount is required"),
    note: z.string().optional(),
    occurred_at: z.string().optional(), // YYYY-MM-DD
  })
  .superRefine((val, ctx) => {
    if (val.category === "__custom") {
      if (!val.custom_category || !val.custom_category.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["custom_category"],
          message: "Custom category is required",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

type TransactionDefaults = {
  id: string;
  account_id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  note: string | null;
  amount_minor: number;
  occurred_at: string;
};

function bdtToMinor(amountBdt: string) {
  const cleaned = amountBdt.replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function minorToInput(amountMinor?: number) {
  if (!Number.isFinite(Number(amountMinor))) return "";
  return String(Number(amountMinor) / 100);
}

function buildDefaults(
  accounts: Array<{ id: string; name: string }>,
  defaultType: "INCOME" | "EXPENSE",
  initialValues?: TransactionDefaults
): FormValues {
  const type = initialValues?.type ?? defaultType;
  const options: readonly string[] = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const cat = initialValues?.category ?? options[0];
  const isCustom = !options.includes(cat);

  return {
    accountId: initialValues?.account_id ?? accounts?.[0]?.id ?? "",
    type,
    occurred_at: (initialValues?.occurred_at ?? new Date().toISOString()).slice(0, 10),
    category: isCustom ? "__custom" : cat,
    custom_category: isCustom ? cat : "",
    amount_bdt: initialValues ? minorToInput(initialValues.amount_minor) : "",
    note: initialValues?.note ?? "",
  };
}

export function TransactionForm({
  accounts,
  onSuccess,
  redirectTo,
  defaultType = "EXPENSE",
  initialValues,
}: {
  accounts: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  defaultType?: "INCOME" | "EXPENSE";
  redirectTo?: string;
  initialValues?: TransactionDefaults;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(accounts, defaultType, initialValues),
  });

  const type = watch("type");
  const categorySelection = watch("category");
  const categoryOptions: readonly string[] = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isCustomCategory = categorySelection === "__custom";

  React.useEffect(() => {
    const current = getValues("category");
    if (current === "__custom") return;
    if (!categoryOptions.includes(current)) {
      setValue("category", categoryOptions[0], { shouldValidate: true });
      setValue("custom_category", "", { shouldValidate: true });
    }
  }, [type, categoryOptions, getValues, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const minor = bdtToMinor(values.amount_bdt);
    if (minor === null || minor <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    const accountId = sanitizeText(values.accountId, { maxLength: 128 });
    if (!accountId) {
      alert("Account is required.");
      return;
    }

    const category = sanitizeText(
      values.category === "__custom" && values.custom_category?.trim()
        ? values.custom_category
        : values.category,
      { maxLength: 80 }
    );
    const noteRaw = values.note ? sanitizeText(values.note, { maxLength: 240 }) : "";
    const note = noteRaw || null;
    const occurredAt = values.occurred_at?.trim() ? new Date(values.occurred_at).toISOString() : undefined;

    const res = await fetch(isEdit ? `/api/transactions/${initialValues!.id}` : "/api/transactions", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        type: values.type,
        category,
        note,
        amount_minor: minor,
        occurred_at: occurredAt,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} transaction.`);
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
          <div className="text-sm font-semibold">{isEdit ? "Edit Transaction" : "Add Transaction"}</div>
          <div className="text-xs subtle">
            {isEdit ? "Update details and keep your records tidy." : "Fast entry, mobile-friendly"}
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-[rgb(var(--border))] bg-white p-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs rounded-lg hover:bg-[rgba(15,23,42,0.04)] ${
              type === "EXPENSE" ? "font-semibold text-slate-900" : "font-medium text-slate-600"
            }`}
            onClick={() => setValue("type", "EXPENSE")}
          >
            Expense
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs rounded-lg hover:bg-[rgba(15,23,42,0.04)] ${
              type === "INCOME" ? "font-semibold text-slate-900" : "font-medium text-slate-600"
            }`}
            onClick={() => setValue("type", "INCOME")}
          >
            Income
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Account</label>
          <select className="input" {...register("accountId")}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.accountId?.message && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.accountId.message}</p>
          )}
        </div>

        <Input label="Date" type="date" {...register("occurred_at")} error={errors.occurred_at?.message} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Category</label>
          {(() => {
            const categoryField = register("category");
            return (
              <div className="flex gap-2">
                <select
                  className="input w-44"
                  {...categoryField}
                  onChange={(e) => {
                    categoryField.onChange(e);
                    const val = e.target.value;
                    if (val !== "__custom") {
                      setValue("custom_category", "", { shouldValidate: true });
                    }
                  }}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom">Custom…</option>
                </select>
                {isCustomCategory ? (
                  <Input
                    className="flex-1"
                    placeholder="Custom category"
                    {...register("custom_category")}
                    error={errors.custom_category?.message}
                  />
                ) : null}
              </div>
            );
          })()}
          {errors.category?.message ? (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.category.message}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              {type === "INCOME" ? "Income categories" : "Expense categories"} (type to add your own)
            </p>
          )}
        </div>
        <Input
          label="Amount (BDT)"
          placeholder="e.g., 250"
          inputMode="decimal"
          {...register("amount_bdt")}
          error={errors.amount_bdt?.message}
          rightAdornment={<span className="text-xs font-semibold">৳</span>}
        />
      </div>

      <Input
        label="Note (optional)"
        placeholder="e.g., Dinner with friends"
        {...register("note")}
        error={errors.note?.message}
      />

      <div className="flex items-center justify-end gap-2">
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
