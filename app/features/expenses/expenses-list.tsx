import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import Paginate from "~/components/ui/paginate";
import usePaginate from "~/hooks/usePaginate";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import {
  expenseCategoryConfig,
  expenseStatusConfig,
} from "~/lib/constants";
import { cn, formatEventDate, formatMoney, getInitials } from "~/lib/utils";
import type { ExpenseQueryResult } from "~/queries/expenses";
import type { ExpenseData } from "~/types";
import DeleteExpense from "./delete-expense";
import EditExpense from "./edit-expense";

function StatusBadge({ status }: { status: ExpenseData["status"] }) {
  const config = expenseStatusConfig[status];
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function CategoryBadge({ category }: { category: ExpenseData["category"] }) {
  const config = expenseCategoryConfig[category];
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function ExpenseCard({
  expense,
  index,
  canManage,
}: {
  expense: ExpenseData;
  index: number;
  canManage: boolean;
}) {
  const recorderName = expense.userId?.name as string | undefined;
  const recorderImage = expense.userId?.image as string | undefined;

  return (
    <Card
      className="group relative overflow-hidden hover:shadow-sm border hover:border-mainGray/50 transition-[border-color,box-shadow] duration-300 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              title={expense.title}
              className="truncate text-sm font-semibold text-foreground"
            >
              {expense.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <span className="truncate">
                {formatEventDate(expense.createdAt)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={expense.status} />
            {canManage && (
              <div className="flex items-center gap-1">
                <EditExpense expense={expense} />
                <DeleteExpense expense={expense} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {formatMoney(expense.amount)}
          </span>
          <CategoryBadge category={expense.category} />
        </div>

        {expense.description && (
          <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {expense.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-6 shrink-0 ring-1 ring-foreground/10">
              <AvatarImage
                src={getOptimizedImageUrl(recorderImage, 24)}
                alt={recorderName ?? "Recorder"}
              />
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(recorderName) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-foreground">
              {recorderName || "Unassigned"}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {expense.currency}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExpensesList({
  expenses,
  canManage,
}: {
  expenses: ExpenseQueryResult;
  canManage: boolean;
}) {
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: expenses.meta?.totalPages || 1,
    hasMore: expenses.meta?.hasMore || false,
    currentPage: expenses.meta?.currentPage || 1,
  });
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {expenses.expenses.map((expense, index) => (
          <ExpenseCard
            key={expense._id}
            expense={expense}
            index={index}
            canManage={canManage}
          />
        ))}
      </div>
      <Paginate
        totalPages={totalPages}
        hasMore={hasMore}
        handlePageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        currentPage={currentPage}
        limit={pageLimit}
      />
    </>
  );
}