import { RiBriefcaseLine, RiMapPinLine, RiPhoneLine } from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { useIsMobile } from "~/hooks/useIsMobile";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import type { MembersQueryResult } from "~/queries/members";
import type { SessionUser } from "~/types";
import RenderTable from "./render-table";
import { RoleBadge } from "./role-badge";
import usePaginate from "~/hooks/usePaginate";
import Paginate from "~/components/ui/paginate";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function DetailRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
}) {
  const valueNode = href ? (
    <a
      href={href}
      title={`${label}: ${value}`}
      className="truncate text-xs font-medium text-foreground transition-colors hover:text-primary"
    >
      {value}
    </a>
  ) : (
    <span className="truncate text-xs font-medium text-foreground">
      {value || "—"}
    </span>
  );

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
        {valueNode}
      </div>
    </div>
  );
}

function MemberCard({ members }: { members: SessionUser[] }) {
  return (
    <div className="grid gap-3">
      {members.map((member) => {
        const { _id, name, email, role, phone, location, occupation, image } =
          member;
        return (
          <Card key={_id}>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-11 shrink-0 ring-1 ring-foreground/10">
                    <AvatarImage
                      src={getOptimizedImageUrl(image, 48)}
                      alt={name}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {email}
                    </p>
                  </div>
                </div>
                <RoleBadge role={role} />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4">
                <DetailRow
                  icon={<RiPhoneLine className="size-4" aria-hidden="true" />}
                  label="Phone"
                  value={phone}
                  href={phone ? `tel:${phone}` : undefined}
                />
                <DetailRow
                  icon={<RiMapPinLine className="size-4" aria-hidden="true" />}
                  label="Location"
                  value={location}
                />
                <DetailRow
                  icon={
                    <RiBriefcaseLine className="size-4" aria-hidden="true" />
                  }
                  label="Occupation"
                  value={occupation}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function MembersList({
  members,
}: {
  members: MembersQueryResult;
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
    totalPages: members.meta?.totalPages || 1,
    hasMore: members.meta?.hasMore || false,
    currentPage: members.meta?.currentPage || 1,
  });
  return (
    <>
      {isMobile ? (
        <MemberCard members={members?.members ?? []} />
      ) : (
        <RenderTable data={members?.members ?? []} />
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
