import { RiLoaderLine } from "@remixicon/react";
import { useEffect } from "react";
import { useFetcher, useOutletContext } from "react-router";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { canModifyRole } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import type { SessionUser } from "~/types";
import { RoleBadge } from "./role-badge";

interface ComponentNameProps {
  row: { original: SessionUser };
}

export default function ModifyRole({ row }: ComponentNameProps) {
  const { user } = useOutletContext() as { user: SessionUser };
  const fetcher = useFetcher();
  const isPermitted = hasPermission(user.role, "MANAGE_ROLES");
  const isLoading = fetcher.state === "submitting";

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData && !actionData?.success) {
      toast.error(actionData?.message ?? "Failed to modify role");
    }
  }, [actionData]);

  const handleRoleChange = (role: string, id: string) => {
    fetcher.submit(
      {
        role,
        id,
        intent: "update-role",
      },
      {
        method: "post",
        action: "/dashboard/members",
        encType: "application/json",
      },
    );
  };

  return (
    <>
      {isPermitted ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button title="Manage Role">
                <RoleBadge role={row.original.role} />
              </button>
            }
          />
          <DropdownMenuContent className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Manage Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={row.original.role === "admin"}
                onClick={() => handleRoleChange("admin", row.original._id)}
                disabled={!canModifyRole(user, "admin", row.original)}
                className="cursor-pointer text-xs"
              >
                {isLoading && row.original.role === "admin" && (
                  <RiLoaderLine className="animate-spin" />
                )}{" "}
                Admin
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={row.original.role === "super_admin"}
                onClick={() =>
                  handleRoleChange("super_admin", row.original._id)
                }
                disabled={!canModifyRole(user, "super_admin", row.original)}
                className="cursor-pointer text-xs"
              >
                {isLoading && row.original.role === "super_admin" && (
                  <RiLoaderLine className="animate-spin" />
                )}{" "}
                Super Admin
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <RoleBadge role={row.original.role} />
      )}
    </>
  );
}
