import { zodResolver } from "@hookform/resolvers/zod";
import { RiErrorWarningLine, RiHandCoinLine } from "@remixicon/react";
import { type FormEvent, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import z from "zod";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { createTransferSchema } from "~/lib/schema";
import { formatMoney } from "~/lib/utils";
import type { CreateTransferSchemaType } from "~/types";

type MemberOption = {
  _id: string;
  name: string;
};

type Balance = {
  total: number;
  pending: number;
  balance: number;
  currency: string;
};

type TransferBody = {
  status?: string;
  transferCode?: string;
  reference?: string;
};

export default function InitiateTransfer({
  members,
  balance,
}: {
  members: MemberOption[];
  balance: Balance;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [phase, setPhase] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState<string>("");
  const [transferCode, setTransferCode] = useState<string>("");
  // Stable per submission intent so a double-click or retried request for the
  // same intent is deduplicated server-side (never sent twice).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createTransferSchema>, any, CreateTransferSchemaType>({
    resolver: zodResolver(createTransferSchema),
    mode: "onChange",
  });

  const actionData = fetcher.data as
    | { success?: boolean; message?: string; body?: TransferBody }
    | undefined;

  const rootError = errors.root as
    | { message?: string }
    | Array<{ message?: string }>
    | undefined;
  const rootErrorMessage =
    (Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
    (errors as Record<string, { message?: string } | undefined>)[""]?.message;

  const resetModal = () => {
    reset();
    setOtp("");
    setTransferCode("");
    setPhase("form");
    setIdempotencyKey(crypto.randomUUID());
  };

  useEffect(() => {
    if (!actionData) return;
    if (!actionData.success) {
      toast.error(actionData.message || "Something went wrong");
      return;
    }
    if (actionData.body?.status === "otp") {
      setTransferCode(actionData.body.transferCode ?? "");
      setPhase("otp");
      fetcher.reset();
      return;
    }
    toast.success(actionData.message || "Transfer initiated successfully");
    resetModal();
    fetcher.reset();
    setIsOpen(false);
  }, [actionData]);

  const onFormSubmit = (data: CreateTransferSchemaType) => {
    fetcher.submit(
      { intent: "initiate-transfer", ...data, idempotencyKey } as any,
      {
        method: "post",
        encType: "application/json",
        action: "/dashboard/transfers",
      },
    );
  };

  const onOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !transferCode) return;
    fetcher.submit(
      { intent: "finalize-transfer", transferCode, otp } as any,
      {
        method: "post",
        encType: "application/json",
        action: "/dashboard/transfers",
      },
    );
  };

  const memberOptions = members.map((member) => ({
    id: member._id,
    name: member.name,
  }));

  return (
    <>
      <Button
        size="sm"
        className="tracking-tight btn"
        onClick={() => setIsOpen(true)}
      >
        <RiHandCoinLine />
        Transfer
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={
          phase === "otp" ? "Confirm with OTP" : "Initiate Transfer"
        }
        description={
          phase === "otp"
            ? "Enter the 6-digit code sent to the business phone or email"
            : "Select a recipient and amount to transfer"
        }
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          {phase === "form" ? (
            <form
              onSubmit={handleSubmit(onFormSubmit)}
              className="mt-6 space-y-4"
              id="initiate-transfer-form"
            >
              {rootErrorMessage && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
                  <span>{rootErrorMessage}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-semibold text-foreground">
                  {formatMoney(balance.total)}
                </span>
              </div>
              <FormBox
                label="Recipient"
                type="select"
                placeholder="Select recipient"
                id="userId"
                register={register}
                errors={errors.userId}
                name="userId"
                control={control}
                options={memberOptions}
              />
              <FormBox
                label="Amount (Naira)"
                type="number"
                placeholder="Enter amount"
                id="amount"
                register={register}
                errors={errors.amount as FieldError | undefined}
                name="amount"
              />
              <FormBox
                label="Reason"
                type="text"
                placeholder="Reason for transfer (optional)"
                id="reason"
                register={register}
                errors={errors.reason}
                name="reason"
              />
            </form>
          ) : (
            <form
              onSubmit={onOtpSubmit}
              className="mt-6 space-y-4"
              id="finalize-transfer-form"
            >
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit OTP"
                className="text-center text-2xl tracking-[0.6em]"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
              <p className="text-xs text-muted-foreground">
                Paystack sent a one-time code to the business phone/email on
                file. It is required before this transfer is sent.
              </p>
            </form>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          {phase === "form" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  resetModal();
                }}
              >
                Cancel
              </Button>
              <ActionBtn
                form="initiate-transfer-form"
                text="Process Transfer"
                type="submit"
                size="sm"
                loading={isSubmitting}
                classname="btn"
              />
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhase("form");
                  fetcher.reset();
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <ActionBtn
                form="finalize-transfer-form"
                text="Confirm OTP"
                type="submit"
                size="sm"
                loading={isSubmitting}
                disabled={otp.length !== 6}
                classname="btn"
              />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}