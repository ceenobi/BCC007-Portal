import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";

export default function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="size-8 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="mx-auto size-40 rounded-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} size="sm">
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
