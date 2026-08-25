import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { RiBriefcaseLine, RiMapPinLine, RiPhoneLine } from "@remixicon/react";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import TableView from "~/components/ui/table-view";
import type { SessionUser } from "~/types";
import ModifyRole from "./modify-role";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const mutedIconClass = "size-3.5 shrink-0 text-muted-foreground/60";

export default function RenderTable({ data }: { data: SessionUser[] }) {
  const columns = useMemo<ColumnDef<SessionUser>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const { name, email, image } = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0 ring-1 ring-foreground/10">
                <AvatarImage src={getOptimizedImageUrl(image, 40)} alt={name} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {name}
                </p>
                <a
                  href={`mailto:${email}`}
                  title={`Send email to ${email}`}
                  className="block truncate text-xs text-muted-foreground transition-colors hover:text-primary hover:underline"
                >
                  {email}
                </a>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          return <ModifyRole row={row}/>
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) {
            return <span className="text-xs text-muted-foreground/60">—</span>;
          }
          return (
            <a
              href={`tel:${phone}`}
              title={`Call ${phone}`}
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <RiPhoneLine className={mutedIconClass} aria-hidden="true" />
              {phone}
            </a>
          );
        },
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <RiMapPinLine className={mutedIconClass} aria-hidden="true" />
            {row.original.location || (
              <span className="text-muted-foreground/60">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "occupation",
        header: "Occupation",
        cell: ({ row }) => (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <RiBriefcaseLine className={mutedIconClass} aria-hidden="true" />
            {row.original.occupation || (
              <span className="text-muted-foreground/60">—</span>
            )}
          </div>
        ),
      },
    ];
  }, []);
  return <TableView columns={columns} data={data} />;
}
