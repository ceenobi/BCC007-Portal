import Paginate from "~/components/ui/paginate";
import { useIsMobile } from "~/hooks/useIsMobile";
import usePaginate from "~/hooks/usePaginate";
import type { TransferQueryResult } from "~/queries/transfers";
import RenderTable from "./render-table";
import TransferCard from "./transfer-card";

export default function TransferList({
  transfers,
}: {
  transfers: TransferQueryResult;
}) {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: transfers.meta?.totalPages || 1,
    hasMore: transfers.meta?.hasMore || false,
    currentPage: transfers.meta?.currentPage || 1,
  });
  return (
    <>
      {isMobile ? (
        <TransferCard data={transfers?.transfers ?? []} />
      ) : (
        <RenderTable data={transfers?.transfers ?? []} />
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