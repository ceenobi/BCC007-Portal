import { RiPushpinLine, RiSendPlaneLine } from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import Paginate from "~/components/ui/paginate";
import usePaginate from "~/hooks/usePaginate";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { announcementStatusConfig } from "~/lib/constants";
import { cn, formatEventDate, getInitials } from "~/lib/utils";
import type { AnnouncementQueryResult } from "~/queries/announcements";
import type { AnnouncementData } from "~/types";
import DeleteAnnouncement from "./delete-announcement";
import EditAnnouncement from "./edit-announcement";

function StatusBadge({ status }: { status: AnnouncementData["status"] }) {
  const config = announcementStatusConfig[status];
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function AnnouncementCard({
  announcement,
  index,
  canManage,
}: {
  announcement: AnnouncementData;
  index: number;
  canManage: boolean;
}) {
  const authorName = announcement.author?.name as string | undefined;
  const authorImage = announcement.author?.image as string | undefined;
  const featured = getOptimizedImageUrl(announcement.featuredImage, 640, 360);

  return (
    <Card
      className="group relative overflow-hidden hover:shadow-sm border hover:border-mainGray/50 transition-[border-color,box-shadow] duration-300 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {featured && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={featured}
            alt={announcement.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              title={announcement.title}
              className="truncate text-sm font-semibold text-foreground"
            >
              {announcement.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              {announcement.isPinned && (
                <>
                  <RiPushpinLine className="size-3.5 shrink-0" aria-hidden="true" />
                  Pinned
                </>
              )}
              <span className="truncate">
                {announcement.publishedAt
                  ? formatEventDate(announcement.publishedAt)
                  : formatEventDate(announcement.createdAt)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={announcement.status} />
            {canManage && (
              <div className="flex items-center gap-1">
                <EditAnnouncement announcement={announcement} />
                <DeleteAnnouncement announcement={announcement} />
              </div>
            )}
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {announcement.content}
        </p>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-6 shrink-0 ring-1 ring-foreground/10">
              <AvatarImage
                src={getOptimizedImageUrl(authorImage, 24)}
                alt={authorName ?? "Author"}
              />
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(authorName) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-foreground">
              {authorName || "Unassigned"}
            </span>
          </div>
          <span
            title="Broadcast status"
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
          >
            <RiSendPlaneLine className="size-3.5" aria-hidden="true" />
            {announcement.status === "published" ? "Broadcast" : "Not broadcast"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnnouncementsList({
  announcements,
  canManage,
}: {
  announcements: AnnouncementQueryResult;
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
    totalPages: announcements.meta?.totalPages || 1,
    hasMore: announcements.meta?.hasMore || false,
    currentPage: announcements.meta?.currentPage || 1,
  });
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {announcements.announcements.map((announcement, index) => (
          <AnnouncementCard
            key={announcement._id}
            announcement={announcement}
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
