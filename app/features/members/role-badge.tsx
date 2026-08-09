import { Badge } from "~/components/ui/badge";
import type { Role } from "~/lib/constants";
import { cn } from "~/lib/utils";

const roleConfig: Record<
  Role,
  { label: string; className: string; dotClassName: string }
> = {
  member: {
    label: "Member",
    className: "border-transparent bg-muted text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  admin: {
    label: "Admin",
    className: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  super_admin: {
    label: "Super Admin",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const config = roleConfig[role] ?? roleConfig.member;
  return (
    <Badge className={cn("gap-1.5", config.className, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)} />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}
