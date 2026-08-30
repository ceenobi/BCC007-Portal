import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddFill,
	RiErrorWarningLine,
	RiExternalLinkLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import type z from "zod";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { initializePaymentSchema } from "~/lib/schema";
import type { EventData, InitializePaymentSchemaType } from "~/types";

type NewPaymentProps = {
	events: EventData[];
};

type PaymentActionData =
	| {
			success?: boolean;
			message?: string;
			body?: { authorization_url: string; reference: string };
	  }
	| undefined;

const paymentTypeOptions = [
	{
		id: "membership_dues",
		name: "Membership Dues",
		description: "Monthly levy of ₦2,000",
	},
	{
		id: "donation",
		name: "Donation",
		description: "Voluntary contribution to the group",
	},
	{
		id: "event",
		name: "Event Payment",
		description: "Pay for an upcoming event",
	},
];

const recurringOptions = [
	{
		id: "true",
		name: "Recurring",
		description: "Set up an automatic monthly payment",
	},
	{ id: "false", name: "One-time", description: "Pay a single time" },
];

export default function NewPayment({ events }: NewPaymentProps) {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";

	const {
		handleSubmit,
		register,
		control,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm<
		z.input<typeof initializePaymentSchema>,
		any,
		InitializePaymentSchemaType
	>({
		resolver: zodResolver(initializePaymentSchema),
		mode: "onChange",
		defaultValues: {
			paymentType: "membership_dues",
			amount: 2000,
			isRecurring: false,
		},
	});

	const watchedPaymentType = watch("paymentType");
	const isEventPayment = watchedPaymentType === "event";
	const isMembershipDues = watchedPaymentType === "membership_dues";

	const actionData = fetcher.data as PaymentActionData;
	const rootError = errors.root as
		| { message?: string }
		| Array<{ message?: string }>
		| undefined;
	const rootErrorMessage =
		(Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
		(errors as Record<string, { message?: string } | undefined>)[""]?.message;

	useEffect(() => {
		if (!actionData) return;
		if (actionData.success && actionData.body?.authorization_url) {
			toast.success(actionData.message || "Redirecting to payment gateway...");
			window.location.href = actionData.body.authorization_url;
		} else {
			toast.error(actionData.message || "Something went wrong");
		}
	}, [actionData]);

	useEffect(() => {
		if (isMembershipDues) {
			setValue("amount", 2000);
			setValue("eventId", undefined, { shouldValidate: true });
		}
	}, [isMembershipDues, setValue]);

	useEffect(() => {
		if (isEventPayment) {
			setValue("isRecurring", false, { shouldValidate: true });
		}
	}, [isEventPayment, setValue]);

	const onFormSubmit = (data: InitializePaymentSchemaType) => {
		fetcher.submit({ intent: "initialize-payment", ...data } as any, {
			method: "post",
			encType: "application/json",
			action: "/dashboard/payments",
		});
	};

	const eventOptions = events.map((event) => ({
		id: event._id,
		name: event.title,
	}));

	return (
		<>
			<Button
				size="sm"
				className="tracking-tight btn"
				onClick={() => setIsOpen(true)}
			>
				<RiAddFill />
				New Payment
			</Button>
			<Modal
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				title="Make Payment"
				description="Select from the available payment types"
			>
				<Separator />
				<div className="px-2 max-h-[60vh] overflow-y-auto">
					<fetcher.Form
						onSubmit={handleSubmit(onFormSubmit)}
						className="mt-6 space-y-4"
						id="new-payment-form"
					>
						{rootErrorMessage && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								<RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
								<span>{rootErrorMessage}</span>
							</div>
						)}
						<FormBox
							label="Payment Type"
							type="radio"
							placeholder="Select payment type"
							id="paymentType"
							register={register}
							errors={errors.paymentType as FieldError | undefined}
							name="paymentType"
							control={control}
							options={paymentTypeOptions}
						/>
						<FormBox
							label="Amount (NGN)"
							type="number"
							placeholder="Enter amount"
							id="amount"
							register={register}
							errors={errors.amount as FieldError | undefined}
							name="amount"
							disabled={isMembershipDues}
						/>
						{isEventPayment && (
							<FormBox
								label="Event"
								type="select"
								placeholder="Select an event"
								id="eventId"
								register={register}
								errors={errors.eventId as FieldError | undefined}
								name="eventId"
								control={control}
								options={eventOptions}
							/>
						)}
						{isMembershipDues && (
							<FormBox
								label="Frequency"
								type="radio"
								placeholder="Select frequency"
								id="isRecurring"
								register={register}
								errors={errors.isRecurring as FieldError | undefined}
								name="isRecurring"
								control={control}
								options={recurringOptions}
							/>
						)}
						<FormBox
							label="Note"
							type="textarea"
							placeholder="Optional note (max 50 characters)"
							id="note"
							register={register}
							errors={errors.note as FieldError | undefined}
							name="note"
						/>
					</fetcher.Form>
				</div>
				<div className="flex justify-end gap-3 pt-4">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							setIsOpen(false);
							fetcher.reset();
							reset();
						}}
					>
						Cancel
					</Button>
					<ActionBtn
						form="new-payment-form"
						text={
							<>
								Proceed to Payment
								<RiExternalLinkLine size={14} />
							</>
						}
						type="submit"
						size="sm"
						loading={isSubmitting}
						classname="btn"
					/>
				</div>
			</Modal>
		</>
	);
}
