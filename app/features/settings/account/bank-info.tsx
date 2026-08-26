import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import type { PaystackBank } from "~/.server/services/paystack.service";
import { Card, CardContent } from "~/components/ui/card";
import { FormSelect } from "~/components/ui/form-select";
import { Input } from "~/components/ui/input";
import { createBankAccountSchema } from "~/lib/schema";
import { cn } from "~/lib/utils";
import type {
  BankDetails,
  CreateBankAccountSchemaType,
  SessionUser,
} from "~/types";

interface UpdateBankProps {
  activeForm:
    "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined;
  setActiveForm: (
    form:
      | "profile-form"
      | "password-form"
      | "privacy-form"
      | "bank-form"
      | undefined,
  ) => void;
  user: SessionUser;
  bankDetails: BankDetails | undefined;
  banks: PaystackBank[];
}
export default function BankInfo({
  activeForm,
  setActiveForm,
  bankDetails,
  banks,
}: UpdateBankProps) {
  const [bankCode, setBankCode] = useState(bankDetails?.bankCode || "");
  const [accountNumber, setAccountNumber] = useState(
    bankDetails?.bankAccountNumber || "",
  );
  const [resolvedName, setResolvedName] = useState(
    bankDetails?.bankAccountName || "",
  );
  const [isResolving, setIsResolving] = useState(false);
  const fetcher = useFetcher({ key: activeForm });
  const bankForm = useForm<CreateBankAccountSchemaType>({
    resolver: zodResolver(createBankAccountSchema),
    defaultValues: {
      bankAccountNumber: bankDetails?.bankAccountNumber || "",
      bankAccountName: bankDetails?.bankAccountName || "",
      bank: bankDetails?.bank || "",
      bankCode: bankDetails?.bankCode || "",
    },
    mode: "onBlur",
  });

  const verifyAccount = useCallback(
    async (signal?: AbortSignal) => {
      if (accountNumber.length !== 10 || !bankCode) return;
      setIsResolving(true);
      try {
        const res = await fetch("/api/banks/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountNumber, bankCode }),
          signal,
        });
        const data = await res.json();
        if (data.success) {
          setResolvedName(data.body?.accountName ?? "");
        } else {
          toast.error(data.message || "Could not verify account");
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error("Could not verify account");
        }
      } finally {
        if (!signal?.aborted) setIsResolving(false);
      }
    },
    [accountNumber, bankCode],
  );

  // Auto-verify shortly after both the bank and a full 10-digit number are in.
  useEffect(() => {
    if (accountNumber.length !== 10 || !bankCode) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void verifyAccount(controller.signal), 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accountNumber, bankCode, verifyAccount]);

  const onFormSubmit = () => {
    const bankName =
      banks.find((bank) => bank.code === bankCode)?.name ||
      bankDetails?.bank ||
      "";
    const formData = {
      bankAccountNumber: accountNumber,
      bankAccountName: resolvedName || bankDetails?.bankAccountName || "",
      bank: bankName,
      bankCode,
      intent: "update-bank",
    };
    fetcher.submit(formData, {
      method: "post",
      action: "/dashboard/settings",
      encType: "application/json",
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold leading-snug text-mainBlack dark:text-white">
        Bank Details
      </h2>
      <Card
        onClick={() => setActiveForm("bank-form")}
        onKeyDown={(e) => e.key === "Enter" && setActiveForm("bank-form")}
        role="button"
        tabIndex={0}
        className={cn(
          "dark:bg-lightGray",
          activeForm === "bank-form" && "border border-mainBlue",
        )}
      >
        <CardContent>
          <fetcher.Form
            id="bank-form"
            onSubmit={bankForm.handleSubmit(onFormSubmit)}
            className="space-y-4"
          >
            <FormSelect
              options={banks.map((bank) => ({
                name: bank.name,
                id: bank.code,
              }))}
              value={bankCode}
              onValueChange={(value) => {
                setBankCode(value ?? "");
                setResolvedName("");
              }}
              placeholder="Select your bank"
              classname="py-5"
            />
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder="Account number"
                className="h-10 px-2.5"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ""));
                  setResolvedName("");
                }}
                onBlur={() => {
                  if (!isResolving && !resolvedName) void verifyAccount();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter your 10-digit account number and we&apos;ll confirm the
                account name automatically.
              </p>
            </div>
            {isResolving && (
              <p className="text-xs font-medium text-primary">
                Verifying account…
              </p>
            )}

            {!isResolving && resolvedName && (
              <div className="rounded-md border border-success/40 bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">Account name</p>
                <p className="text-sm font-medium text-foreground">
                  {resolvedName}
                </p>
              </div>
            )}
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
