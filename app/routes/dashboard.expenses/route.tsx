import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await, useOutletContext } from "react-router";
import {
	createExpense,
	deleteExpense,
	updateExpense,
} from "~/.server/actions/expense-data";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import CreateExpense from "~/features/expenses/create-expense";
import ExpensesList from "~/features/expenses/expenses-list";
import ExpensesSkeleton from "~/features/expenses/expenses-skeleton";
import Filter from "~/features/expenses/filter";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import { getExpensesQuery } from "~/queries/expenses";
import type {
	CreateExpenseSchemaType,
	SessionUser,
	UpdateExpenseSchemaType,
} from "~/types";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_PAYMENTS", "action")];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Expenses - Manage BCC007 Team treasury expenses" },
		{
			name: "description",
			content: "Expenses - Manage BCC007 Team treasury expenses",
		},
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const queryClient = getQueryClientRsc();
	const expenses = queryClient.ensureQueryData(getExpensesQuery(request));
	return {
		dehydratedState: dehydrate(queryClient),
		expenses,
	};
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
	if (payload.intent === "create-expense") {
		return await createExpense(
			request,
			payload as unknown as CreateExpenseSchemaType,
		);
	}
	if (payload.intent === "update-expense") {
		return await updateExpense(
			request,
			payload as unknown as UpdateExpenseSchemaType & {
				expenseId?: string;
			},
		);
	}
	if (payload.intent === "delete-expense") {
		return await deleteExpense(request, {
			expenseId: payload.expenseId as string,
		});
	}
	return Response.json(
		{ success: false, message: "Invalid request" },
		{ status: 400 },
	);
}

export default function Expenses({ loaderData }: Route.ComponentProps) {
	const { expenses } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	const isPermitted = hasPermission(user.role, "MANAGE_PAYMENTS");

	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Expenses
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Track treasury expenses and spending.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-expenses"
						placeholder="Search expenses..."
						classname="w-fit"
					/>
					<div className="flex items-center gap-2">
						<Filter />
						{isPermitted && <CreateExpense />}
					</div>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<Suspense fallback={<ExpensesSkeleton />}>
					<Await resolve={expenses} errorElement={<DataError />}>
						{(resolvedExpenses) => (
							<>
								{resolvedExpenses?.expenses.length === 0 ? (
									<NotFound
										title="No expenses found"
										message="Expenses have not been added yet. Come back later."
									/>
								) : (
									<ExpensesList
										expenses={resolvedExpenses}
										canManage={isPermitted}
									/>
								)}
							</>
						)}
					</Await>
				</Suspense>
			</PageSection>
		</PageWrapper>
	);
}
