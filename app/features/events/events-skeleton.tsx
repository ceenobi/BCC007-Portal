import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export default function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
