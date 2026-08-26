import { zodResolver } from "@hookform/resolvers/zod";
import { RiArrowLeftLine, RiCameraLine, RiCheckLine } from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldError } from "react-hook-form";
import { useForm } from "react-hook-form";
import { redirect, useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";
import { saveBankAccount } from "~/.server/actions/bank-data";
import { completeOnboardingProfile } from "~/.server/actions/onboarding";
import type { PaystackBank } from "~/.server/services/paystack.service";
import HomeNav from "~/components/navigation/home-nav";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import { FormSelect } from "~/components/ui/form-select";
import { Input } from "~/components/ui/input";
import { onboardingSchema } from "~/lib/schema";
import { buildSeoMeta } from "~/lib/seo";
import { cn } from "~/lib/utils";
import { sessionMiddleware, userContext } from "~/middleware/auth.middleware";
import type {
	CreateBankAccountSchemaType,
	OnboardingSchemaType,
} from "~/types";
import type { Route } from "./+types/route";

export const middleware = [sessionMiddleware];

const genderOptions = [
	{ name: "Male", id: "male" },
	{ name: "Female", id: "female" },
	{ name: "Other", id: "other" },
];

export function meta(_args: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "Complete your profile - BCC007",
			description:
				"Finish setting up your BCC007 account so you can start making payments and transfers with your alumni community.",
			path: "/onboarding",
			noindex: true,
		}),
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	const user = context.get(userContext);
	if (!user) {
		throw Response.json(
			{
				success: false,
				message: "Unauthorized",
			},
			{ status: 401 },
		);
	}
	if (user.isOnboarded) {
		return redirect("/dashboard");
	}
	let banks: PaystackBank[] = [];
	try {
		const { PaystackService } = await import(
			"~/.server/services/paystack.service"
		);
		banks = await PaystackService.getBanks();
	} catch (error) {
		console.error("Failed to load banks during onboarding:", error);
	}
	return { user, banks };
}

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}
	let payload: Record<string, unknown>;
	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json(
			{ success: false, message: "Invalid JSON payload" },
			{ status: 400 },
		);
	}
	if (payload.intent === "profile") {
		return await completeOnboardingProfile(
			request,
			payload as unknown as OnboardingSchemaType,
		);
	}
	if (payload.intent === "bank") {
		return await saveBankAccount(
			request,
			payload as unknown as CreateBankAccountSchemaType,
		);
	}
	return Response.json(
		{ success: false, message: "Invalid request" },
		{ status: 400 },
	);
}

function StepIndicator({ step }: { step: number }) {
	const steps = ["Profile", "Bank details"];
	return (
		<div className="flex items-center gap-3">
			{steps.map((label, index) => {
				const stepNumber = index + 1;
				const active = step === stepNumber;
				const complete = step > stepNumber;
				return (
					<div key={label} className="flex items-center gap-3">
						{index > 0 && <div className="h-px w-10 bg-border" />}
						<div
							className={cn(
								"flex items-center gap-2",
								active ? "text-foreground" : "text-muted-foreground",
							)}
						>
							<span
								className={cn(
									"flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
									complete || active
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
								)}
							>
								{complete ? <RiCheckLine size={14} /> : stepNumber}
							</span>
							<span className="text-sm font-medium">{label}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function Onboarding({ loaderData }: Route.ComponentProps) {
	const { user, banks } = loaderData;
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);
	const lastUploadedRef = useRef<{
		image: string;
		imagePublicId: string;
	} | null>(null);

	const [step, setStep] = useState(1);
	const [isUploading, setIsUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const [bankCode, setBankCode] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [resolvedName, setResolvedName] = useState("");
	const [isResolving, setIsResolving] = useState(false);

	const profileFetcher = useFetcher();
	const bankFetcher = useFetcher();

	const form = useForm<
		z.input<typeof onboardingSchema>,
		any,
		OnboardingSchemaType
	>({
		resolver: zodResolver(onboardingSchema),
		defaultValues: {
			name: user.name || "",
			phone: user.phone || "",
			gender: (user.gender as "male" | "female" | "other") || undefined,
			occupation: user.occupation || "",
			location: user.location || "",
			dateOfBirth: user.dateOfBirth
				? new Date(user.dateOfBirth).toISOString().split("T")[0]
				: undefined,
		},
		mode: "onChange",
	});

	const profileActionData = profileFetcher.data as
		| { success?: boolean; message?: string }
		| undefined;
	const bankActionData = bankFetcher.data as
		| { success?: boolean; message?: string }
		| undefined;

	useEffect(() => {
		if (!profileActionData) return;
		if (profileActionData.success) {
			toast.success(profileActionData.message);
			setStep(2);
		} else {
			toast.error(profileActionData.message || "Something went wrong");
		}
	}, [profileActionData]);

	useEffect(() => {
		if (!bankActionData) return;
		if (bankActionData.success) {
			toast.success(bankActionData.message);
			navigate("/dashboard", { replace: true });
		} else {
			toast.error(bankActionData.message || "Something went wrong");
		}
	}, [bankActionData, navigate]);

	const uploadAvatar = async (file: File) => {
		setIsUploading(true);
		try {
			const sigRes = await fetch("/api/upload-signature", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ folder: "avatars" }),
			});
			const sig = await sigRes.json();
			if (!sig.success) {
				toast.error(sig.message || "Failed to get upload signature");
				return;
			}

			const fd = new FormData();
			fd.append("file", file);
			fd.append("api_key", sig.apiKey);
			fd.append("timestamp", sig.timestamp);
			fd.append("signature", sig.signature);
			fd.append("upload_preset", sig.uploadPreset);
			fd.append("folder", sig.folder);
			if (sig.eager) fd.append("eager", sig.eager);
			if (sig.responsive_breakpoints)
				fd.append("responsive_breakpoints", sig.responsive_breakpoints);

			const uploadRes = await fetch(
				`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
				{ method: "POST", body: fd },
			);
			const result = await uploadRes.json();
			if (!result.secure_url) {
				toast.error(result.error?.message || "Upload failed");
				return;
			}

			lastUploadedRef.current = {
				image: result.secure_url,
				imagePublicId: result.public_id,
			};
			setPreviewUrl(result.secure_url);
			toast.success("Profile picture uploaded");
		} catch {
			toast.error("An error occurred during upload");
		} finally {
			setIsUploading(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setPreviewUrl(URL.createObjectURL(file));
			void uploadAvatar(file);
		}
		e.target.value = "";
	};

	const onSubmit = (data: OnboardingSchemaType) => {
		const uploaded = lastUploadedRef.current;
		const payload = {
			intent: "profile",
			...data,
			...(uploaded
				? { image: uploaded.image, imagePublicId: uploaded.imagePublicId }
				: {}),
		};
		profileFetcher.submit(payload as any, {
			method: "post",
			encType: "application/json",
			action: "/onboarding",
		});
	};

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

	const handleSubmitBank = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!bankCode || accountNumber.length !== 10) {
			toast.error("Please select a bank and enter a valid account number");
			return;
		}
		if (!resolvedName) {
			toast.error("Please verify your account number first");
			return;
		}
		const selectedBankName =
			banks.find((bank) => bank.code === bankCode)?.name ?? "";
		bankFetcher.submit(
			{
				intent: "bank",
				bank: selectedBankName,
				bankCode,
				bankAccountNumber: accountNumber,
				bankAccountName: resolvedName,
			} as any,
			{
				method: "post",
				encType: "application/json",
				action: "/onboarding",
			},
		);
	};

	const isProfileSubmitting = profileFetcher.state === "submitting";
	const isBankSubmitting = bankFetcher.state === "submitting";

	return (
		<>
			<HomeNav user={user} />
			<PageWrapper>
				<PageSection
					index={0}
					className="mx-auto px-4 w-full max-w-xl space-y-8"
				>
					<div className="space-y-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Complete your onboarding
						</h1>
						<p className="text-sm text-muted-foreground">
							Welcome aboard {user.name}. Let&apos;s set up your account so you
							can get started.
						</p>
					</div>

					<StepIndicator step={step} />

					{step === 1 ? (
						<div className="space-y-6 rounded-lg border border-border bg-card p-6">
							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={() => inputRef.current?.click()}
									className="group relative cursor-pointer rounded-full"
									aria-label="Upload profile picture"
								>
									<Avatar size="lg" className="size-24">
										{previewUrl ? (
											<AvatarImage src={previewUrl} />
										) : user.image ? (
											<AvatarImage src={user.image} />
										) : (
											<AvatarFallback>
												{user.name?.charAt(0)?.toUpperCase()}
											</AvatarFallback>
										)}
									</Avatar>
									<span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
										<RiCameraLine size={20} />
									</span>
								</button>
								<input
									ref={inputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleFileChange}
								/>
								<div className="space-y-1">
									<p className="text-sm font-medium text-foreground">
										Profile picture
									</p>
									<p className="text-xs text-muted-foreground">
										Optional. PNG or JPG, max 2MB.
									</p>
									{isUploading && (
										<p className="text-xs font-medium text-primary">
											Uploading…
										</p>
									)}
								</div>
							</div>

							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								<FormBox
									label="Full Name"
									type="text"
									placeholder="Enter your full name"
									id="name"
									register={form.register}
									errors={form.formState.errors.name}
									name="name"
								/>
								<FormBox
									label="Phone"
									type="tel"
									placeholder="+234 (phone number)"
									id="phone"
									register={form.register}
									control={form.control}
									errors={form.formState.errors.phone}
									name="phone"
								/>
								<FormBox
									label="Gender"
									type="radio"
									placeholder="Select gender"
									id="gender"
									register={form.register}
									control={form.control}
									errors={form.formState.errors.gender}
									name="gender"
									options={genderOptions}
								/>
								<FormBox
									label="Occupation"
									type="text"
									placeholder="Enter your occupation"
									id="occupation"
									register={form.register}
									errors={form.formState.errors.occupation}
									name="occupation"
								/>
								<FormBox
									label="Location"
									type="text"
									placeholder="Enter your location"
									id="location"
									register={form.register}
									errors={form.formState.errors.location}
									name="location"
								/>
								<FormBox
									label="Date of Birth"
									type="date"
									placeholder="Select your date of birth"
									id="dateOfBirth"
									register={form.register}
									errors={
										form.formState.errors.dateOfBirth as FieldError | undefined
									}
									name="dateOfBirth"
								/>
								<ActionBtn
									type="submit"
									text="Continue to Bank Details"
									loading={isProfileSubmitting}
									classname="w-full h-10 btn"
								/>
							</form>
						</div>
					) : (
						<div className="space-y-6 rounded-lg border border-border bg-card p-6">
							<div className="space-y-1">
								<h2 className="text-lg font-semibold text-foreground">
									Bank details
								</h2>
								<p className="text-xs text-muted-foreground">
									Your account name will be verified automatically. Please make
									sure the name matches your bank account.
								</p>
							</div>

							<form onSubmit={handleSubmitBank} className="space-y-4">
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
											if (!isResolving && !resolvedName)
												void verifyAccount();
										}}
									/>
									<p className="text-xs text-muted-foreground">
										Enter your 10-digit account number and we&apos;ll confirm
										the account name automatically.
									</p>
								</div>

								{isResolving && (
									<p className="text-xs font-medium text-primary">
										Verifying account…
									</p>
								)}

								{!isResolving && resolvedName && (
									<div className="rounded-md border border-success/40 bg-success/10 p-3">
										<p className="text-xs text-muted-foreground">
											Account name
										</p>
										<p className="text-sm font-medium text-foreground">
											{resolvedName}
										</p>
									</div>
								)}

								<div className="flex items-center gap-3 pt-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setStep(1)}
									>
										<RiArrowLeftLine /> Back
									</Button>
									<ActionBtn
										type="submit"
										text="Complete Onboarding"
										loading={isBankSubmitting}
										classname="flex-1 h-10 btn"
									/>
								</div>
							</form>
						</div>
					)}
				</PageSection>
			</PageWrapper>
		</>
	);
}
