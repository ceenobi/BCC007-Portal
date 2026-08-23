import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await, useOutletContext } from "react-router";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { getUserBankAccountQuery } from "~/queries/bank";
import type { BankDetails, SessionUser } from "~/types";
import type { Route } from "./+types/route";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Profile | BCC007" },
		{
			name: "description",
			content: "Your profile page for BCC007.",
		},
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const queryClient = getQueryClientRsc();
	const bankData = queryClient.ensureQueryData(
		getUserBankAccountQuery(request),
	);
	return {
		dehydratedState: dehydrate(queryClient),
		bankData,
	};
}

export default function Account({ loaderData }: Route.ComponentProps) {
	const { bankData } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };

	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Account
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						See your account details.
					</p>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-8 px-4 xl:px-8">
				<div className="flex gap-2 items-center">
					<Avatar size="lg">
						<AvatarImage src={user.image} />
						<AvatarFallback>
							{user.name.split("")[0] + user.name.split("")[1]}
						</AvatarFallback>
					</Avatar>
					<h2 className="text-base font-semibold tracking-tight leading-tight text-foreground">
						{user.name}
					</h2>
				</div>
				<Card className="dark:bg-lightGray p-0">
					<CardContent>
						<div className="py-4 border-b">
							<h1 className="text-base font-semibold text-mainBlack dark:text-white">
								Details
							</h1>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:px-4 py-6 text-mainGray dark:text-muted-foreground">
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Profile name
								</h2>
								<p className="text-sm">{user.name}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Role
								</h2>
								<p className="text-sm">{user.role}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Gender
								</h2>
								<p className="text-sm capitalize">{user.gender || "N/A"}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Birthday
								</h2>
								<p className="text-sm">
									{new Date(user.dateOfBirth || "").toDateString() || "N/A"}
								</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Joined Date
								</h2>
								<p className="text-sm">
									{new Date(user.createdAt || "").toDateString()}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="dark:bg-lightGray p-0">
					<CardContent>
						<div className="py-4 border-b">
							<h1 className="text-base font-semibold text-mainBlack dark:text-white">
								Contact information
							</h1>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:px-4 py-6 text-mainGray dark:text-muted-foreground">
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Email
								</h2>
								<p className="text-sm text-balance">{user.email}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Phone
								</h2>
								<p className="text-sm">{user.phone || "N/A"}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Occupation
								</h2>
								<p className="text-sm">{user.occupation || "N/A"}</p>
							</div>
							<div>
								<h2 className="font-medium text-mainBlack dark:text-white">
									Location
								</h2>
								<p className="text-sm">{user.location || "N/A"}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Suspense
					fallback={
						<p className="text-center text-sm text-muted-foreground my-4">
							loading bank details...
						</p>
					}
				>
					<Await
						resolve={bankData}
						errorElement={
							<p className="text-sm text-center text-destructive">
								Error loading your bank details
							</p>
						}
					>
						{(resolvedBankData: BankDetails) => (
							<>
								<Card className="dark:bg-lightGray p-0">
									<CardContent>
										<div className="py-4 border-b">
											<h1 className="text-base font-semibold text-mainBlack dark:text-white">
												Bank details
											</h1>
										</div>
										<div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:px-4 py-6 text-mainGray dark:text-muted-foreground">
											<div>
												<h2 className="font-medium text-mainBlack dark:text-white">
													Bank name
												</h2>
												<p className="text-sm">
													{resolvedBankData.bank || "N/A"}
												</p>
											</div>
											<div>
												<h2 className="font-medium text-mainBlack dark:text-white">
													Account number
												</h2>
												<p className="text-sm">
													{resolvedBankData.bankAccountNumber || "N/A"}
												</p>
											</div>
											<div>
												<h2 className="font-medium text-mainBlack dark:text-white">
													Account name
												</h2>
												<p className="text-sm">
													{resolvedBankData.bankAccountName || "N/A"}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</>
						)}
					</Await>
				</Suspense>
			</PageSection>
		</PageWrapper>
	);
}
