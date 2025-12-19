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
  bank_name: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  opening_balance_bdt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type AccountDefaults = {
  id: string;
  name: string;
  bank_name: string | null;
  type: string;
  currency: string;
  opening_balance_minor?: number;
};

function bdtToMinor(amountBdt: string | undefined) {
  const cleaned = String(amountBdt ?? "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function minorToInput(amountMinor?: number) {
  if (!Number.isFinite(Number(amountMinor))) return "0";
  return String(Number(amountMinor) / 100);
}

export function AccountForm({
  onSuccess,
  redirectTo,
  initialValues,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
  initialValues?: AccountDefaults;
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
      name: initialValues?.name ?? "",
      bank_name: initialValues?.bank_name ?? "",
      type: initialValues?.type ?? "BANK",
      opening_balance_bdt: minorToInput(initialValues?.opening_balance_minor ?? 0),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const openingMinor = bdtToMinor(values.opening_balance_bdt);
    if (!isEdit && openingMinor === null) {
      alert("Opening balance must be a valid number.");
      return;
    }

    const name = sanitizeText(values.name, { maxLength: 120 });
    const bankNameRaw = values.bank_name ? sanitizeText(values.bank_name, { maxLength: 120 }) : "";
    const bankName = bankNameRaw || null;
    const type = sanitizeText(values.type, { maxLength: 50 }) || "BANK";

    if (!name) {
      alert("Account name is required.");
      return;
    }

    const res = await fetch(isEdit ? `/api/accounts/${initialValues!.id}` : "/api/accounts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        bank_name: bankName,
        type,
        currency: "BDT",
        ...(isEdit ? {} : { opening_balance_minor: openingMinor }),
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || `Failed to ${isEdit ? "update" : "create"} account.`);
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
        <div className="text-sm font-semibold">{isEdit ? "Edit Account" : "Add Account"}</div>
        <div className="text-xs subtle">Cash, Bank, or Mobile Wallet</div>
      </div>

      <Input label="Account name" placeholder="e.g., DBBL Savings" {...register("name")} error={errors.name?.message} />
      <Input
        label="Bank name (optional)"
        placeholder="e.g., Dutch-Bangla Bank"
        {...register("bank_name")}
        error={errors.bank_name?.message}
      />

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Type</label>
        <select className="input" {...register("type")}>
          <option value="BANK">Bank</option>
          <option value="CASH">Cash</option>
          <option value="MOBILE_WALLET">Mobile Wallet</option>
          <option value="OTHER">Other</option>
        </select>
        {errors.type?.message && <p className="mt-1 text-xs font-medium text-red-600">{errors.type.message}</p>}
      </div>

      <Input
        label="Opening balance (BDT)"
        placeholder="0"
        inputMode="decimal"
        disabled={isEdit}
        hint={isEdit ? "Opening balance is set when the account is created." : undefined}
        {...register("opening_balance_bdt")}
        error={errors.opening_balance_bdt?.message}
        rightAdornment={<span className="text-xs font-semibold">৳</span>}
      />

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
