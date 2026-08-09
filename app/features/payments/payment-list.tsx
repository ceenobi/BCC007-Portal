import Paginate from "~/components/ui/paginate";
import { useIsMobile } from "~/hooks/useIsMobile";
import usePaginate from "~/hooks/usePaginate";
import type { PaymentQueryResult } from "~/queries/payments";
import PaymentCard from "./payment-card";
import RenderTable from "./render-table";

export default function PaymentsList({ payments }: { payments: PaymentQueryResult }) {
   const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: payments.meta?.totalPages || 1,
    hasMore: payments.meta?.hasMore || false,
    currentPage: payments.meta?.currentPage || 1,
  });
  return (
    <>
      {isMobile ? (
        <PaymentCard data={payments?.payments ?? []} />
      ) : (
        <RenderTable data={payments?.payments ?? []} />
      )}
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