import { zodResolver } from "@hookform/resolvers/zod";
import { RiMailAddLine, RiUserAddLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
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
			setIsOpen(false)
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
		<>
			<Button
				size="sm"
				className="tracking-tight btn"
				onClick={() => setIsOpen(true)}
			>
				<RiUserAddLine /> Invite Member
			</Button>
			<Modal
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				title="Invite team members"
				description="Send invitations and choose the access each new team member
				receives."
			>
				<Separator />
				<div className="px-2 max-h-[60vh] overflow-y-auto">
					<fetcher.Form
						onSubmit={handleSubmit(onFormSubmit)}
						className="space-y-4"
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

				<div className="flex justify-end gap-3 pt-4">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							reset();
							fetcher.reset();
							setIsOpen(false);
						}}
					>
						Cancel
					</Button>
					<ActionBtn
						form="invite-member-form"
						text={
							<>
								Send Invitation
								<RiMailAddLine size={14} />
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
