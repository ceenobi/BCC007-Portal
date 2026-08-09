import { useIsMobile } from "~/hooks/useIsMobile";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Skeleton } from "./skeleton";

const columns = ["Name", "Role", "Phone", "Location", "Occupation"];

function MemberCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="space-y-3 border-t border-border/60 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MembersSkeleton() {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  if (isMobile) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-background">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {columns.map((header) => (
              <TableHead
                key={header}
                className="py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              {Array.from({ length: 3 }).map((_, cellIndex) => (
                <TableCell key={cellIndex} className="py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-3.5 shrink-0 rounded-sm" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
