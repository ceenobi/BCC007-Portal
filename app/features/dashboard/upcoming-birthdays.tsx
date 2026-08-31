import { RiCake3Line, RiMailSendLine } from "@remixicon/react";
import { Link } from "react-router";
import { cn, getInitials } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import type { UpcomingBirthday } from "~/queries/dashboard";

type UpcomingBirthdaysProps = {
  birthdays: UpcomingBirthday[];
  className?: string;
};

export default function UpcomingBirthdays({
  birthdays,
  className,
}: UpcomingBirthdaysProps) {
  return (
    <Card className={cn("animate-in fade-in slide-in-from-bottom-3", className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">Upcoming Birthdays</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/members"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <RiMailSendLine className="size-3.5" aria-hidden="true" />
            Remind
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {birthdays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No birthdays in the next 14 days
          </p>
        ) : (
          birthdays.map((birthday) => (
            <Link
              key={birthday._id}
              to="/dashboard/members"
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <Avatar className="size-9 shrink-0 ring-1 ring-foreground/10">
                <AvatarImage
                  src={getOptimizedImageUrl(birthday.image, 36)}
                  alt={birthday.name}
                />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(birthday.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {birthday.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RiCake3Line className="size-3" aria-hidden="true" />
                  {birthday.daysUntil === 0
                    ? "Today"
                    : `In ${birthday.daysUntil} day${birthday.daysUntil === 1 ? "" : "s"}`}
                  <span aria-hidden="true">·</span>
                  Turning {birthday.ageAtNext}
                </span>
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
