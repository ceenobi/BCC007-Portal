import { getExpenses } from "~/.server/actions/expense-data";
import type { ExpenseData, UsePaginateProps } from "~/types";
export type ExpenseQueryResult = {
  expenses: ExpenseData[];
  meta: UsePaginateProps;
};

export const getExpensesQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const category = url.searchParams.get("category") || undefined;
  return {
    queryKey: ["expenses", page, limit, query, status, category],
    queryFn: async () => {
      const response = await getExpenses({
        request,
        page,
        limit,
        query,
        status,
        category,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch expenses");
      }
      const data = await response.json();
      return data.body as ExpenseQueryResult;
    },
  };
};
