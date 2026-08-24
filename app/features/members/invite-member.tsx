import { zodResolver } from "@hookform/resolvers/zod";
import { RiCloseLine, RiUserAddLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { sendInviteCodeSchema } from "~/lib/schema";
import type { SendInviteCodeSchemaType } from "~/types";

const roleOptions = [
	{
		id: "member",
		name: "member",
		description: "Default role for team members",
	},
	{
		id: "admin",
		name: "admin",
		description: "Administrator role with priviledged access",
	},
];

type InviteMemberFormValues = {
	email: string | string[];
	role: "member" | "admin";
};

export default function InviteMember() {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const {
		handleSubmit,
		register,
		control,
		reset,
		formState: { errors },
	} = useForm<InviteMemberFormValues, any, SendInviteCodeSchemaType>({
		resolver: zodResolver(sendInviteCodeSchema),
		mode: "onChange",
	});
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";
	const actionData = fetcher.data as
		| { success?: boolean; message?: string; email?: string }
		| undefined;

	useEffect(() => {
		if (actionData?.success === true) {
			toast.success(actionData.message);
			fetcher.reset();
			reset({ email: "", role: "member" });
		}
	}, [actionData, fetcher, reset]);

	const onFormSubmit: SubmitHandler<SendInviteCodeSchemaType> = (data) => {
		fetcher.submit(data, {
			method: "post",
			action: "/dashboard/members",
			encType: "application/json",
		});
	};

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger
				render={
					<Button size="sm" className="tracking-tight btn">
						<RiUserAddLine /> Invite Member
					</Button>
				}
			/>
			<SheetContent
				side="right"
				className="w-full sm:max-w-2xl bg-white dark:bg-lightGray p-0"
				showCloseButton={false}
				aria-describedby="drawer"
			>
				<div className="relative flex flex-col h-full py-2">
					<div className="flex justify-between items-start px-4 py-2">
						<div>
							<h1 className="text-foreground font-medium text-base">
								Invite team members
							</h1>
							<p className="text-xs text-balance text-mainGray dark:text-muted-foreground">
								Send invitations and choose the access each new team member
								receives.
							</p>
						</div>
						<SheetClose
							render={
								<button
									type="button"
									aria-label="Close navigation menu"
									className="w-10 h-10 cursor-pointer"
								>
									<RiCloseLine size={18} />
								</button>
							}
						/>
					</div>
					<SheetTitle className="sr-only">Invite member</SheetTitle>
					<Separator />
					<div className="p-4">
						<fetcher.Form
							onSubmit={handleSubmit(onFormSubmit)}
							className="mt-6 xl:mt-10 space-y-4"
							id="invite-member-form"
						>
							<FormBox
								label="Role"
								type="radio"
								placeholder="Select member role"
								id="role"
								register={register}
								errors={errors.role}
								name="role"
								control={control}
								options={roleOptions}
							/>
							<FormBox
								label="Add members email addresses"
								type="textarea"
								placeholder="name@example.com, name2@example.com, ..."
								id="email"
								register={register}
								errors={errors.email}
								name="email"
								control={control}
							/>
						</fetcher.Form>
					</div>
					<div className="absolute bottom-0 left-0 right-0 border-t py-4">
						<div className="flex justify-end gap-4 items-center px-4">
							<Button
								size="sm"
								variant="outline"
								className="tracking-tight"
								onClick={() => {
									setIsOpen(false);
									reset();
								}}
							>
								Cancel
							</Button>
							<ActionBtn
								form="invite-member-form"
								text="Send Invitation"
								type="submit"
								size="sm"
								loading={isSubmitting}
								classname="btn"
							/>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
