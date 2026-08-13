import {
  RiArrowRightUpLine,
  RiPushpinLine,
} from "@remixicon/react";
import { Link } from "react-router";
import { cn, formatEventDate } from "~/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import type { AnnouncementData } from "~/types";

type LatestAnnouncementProps = {
  announcement: AnnouncementData | null;
  className?: string;
};

export default function LatestAnnouncement({
  announcement,
  className,
}: LatestAnnouncementProps) {
  const featured = announcement?.featuredImage
    ? getOptimizedImageUrl(announcement.featuredImage, 640, 360)
    : null;

  return (
    <Card className={cn("animate-in fade-in slide-in-from-bottom-3", className)}>
      <CardHeader>
        <CardTitle className="text-sm">Latest Announcement</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/announcements"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            All announcements
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!announcement ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No announcements yet
          </p>
        ) : (
          <Link
            to="/dashboard/announcements"
            className="group flex flex-col gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            {featured && (
              <img
                src={featured}
                alt={announcement.title}
                className="h-32 w-full rounded-md object-cover"
              />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-primary">
                  {announcement.isPinned && (
                    <RiPushpinLine className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">{announcement.title}</span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {announcement.publishedAt
                    ? formatEventDate(announcement.publishedAt)
                    : formatEventDate(announcement.createdAt)}
                </span>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {announcement.content}
                </p>
              </div>
              <RiArrowRightUpLine
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
