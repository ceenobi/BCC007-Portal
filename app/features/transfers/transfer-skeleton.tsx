import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useIsMobile } from "~/hooks/useIsMobile";

function TransferCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36 font-mono" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransferTableSkeleton() {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="divide-y divide-border/60">
        <div className="grid grid-cols-6 items-center gap-6 bg-muted/50 px-4 py-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 items-center gap-6 px-4 py-4">
            <Skeleton className="h-3 w-full font-mono" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TransferSkeleton() {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  return isMobile ? <TransferCardSkeleton /> : <TransferTableSkeleton />;
}