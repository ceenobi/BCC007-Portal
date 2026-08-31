import { RiToggleFill, RiToggleLine } from "@remixicon/react";
import { NavLink } from "react-router";
import type { SidebarLinkItem } from "~/lib/constants";
import { sideBarLinks } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import { tourTargetForHref } from "~/lib/tour";
import { cn } from "~/lib/utils";
import type { SessionUser } from "~/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface SidebarProps {
  isOpenSidebar: boolean;
  setIsOpenSidebar: (value: boolean) => void;
  user: SessionUser;
}

export default function Sidebar({
  isOpenSidebar,
  setIsOpenSidebar,
  user,
}: SidebarProps) {
  const toggleSidebar = () => setIsOpenSidebar(!isOpenSidebar);
  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        `hidden lg:flex flex-col border-r bg-white dark:bg-bgDark top-0 fixed z-30 transition-[width] duration-300 ease-in-out min-h-svh`,
        isOpenSidebar ? "lg:w-50" : "lg:w-12",
      )}
    >
      <div className="flex-1 overflow-y-auto pt-14">
        {sideBarLinks.map((item) => {
          const children = item.children.filter((child) => {
            if (child.href === "/dashboard/transfers") {
              return hasPermission(user?.role, "MANAGE_SETTINGS");
            }
            return true;
          });
          return (
            <div key={item.id} className="flex flex-col px-1">
              {item.title && isOpenSidebar && (
                <p className="font-medium dark:text-gray-400 px-3 py-2 text-xs uppercase tracking-wider">
                  {item.title}
                </p>
              )}
              {children.map((child) => (
                <SidebarLink
                  key={child.name}
                  item={child}
                  isOpenSidebar={isOpenSidebar}
                />
              ))}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isOpenSidebar ? "Collapse sidebar" : "Expand sidebar"}
        className={cn(
          "cursor-pointer hover:dark:text-darkBlue hover:text-darkBlue text-mainBlue dark:text-lightBlue px-2 my-2",
        )}
      >
        {isOpenSidebar ? (
          <RiToggleLine size={24} />
        ) : (
          <RiToggleFill size={24} />
        )}
      </button>
    </aside>
  );
}

function SidebarLink({
  item,
  isOpenSidebar,
}: {
  item: SidebarLinkItem;
  isOpenSidebar: boolean;
}) {
  const tourTarget = tourTargetForHref(item.href);
  return (
    <Tooltip>
      <TooltipTrigger className="w-full">
        <NavLink
          to={item.href}
          data-tour={tourTarget}
          className={({ isActive }) =>
            cn(
              "transition-[color,background-color] rounded-sm duration-300 ease-in-out w-full p-1.5 flex items-center text-sm capitalize",
              isActive
                ? "bg-mainGray/20 dark:bg-darkBlue/10 text-mainBlack dark:text-white"
                : "hover:bg-mainGray/5 hover:text-mainBlack hover:dark:text-white/80 text-muted-foreground",
              !isOpenSidebar && "justify-center",
            )
          }
          viewTransition
          end={item.href === "/dashboard"}
          prefetch="intent"
        >
          <span className="cursor-pointer flex items-center gap-2 px-2">
            {item.icon && <item.icon size={18} />}
            <span className={cn(isOpenSidebar ? "md:block" : "hidden")}>
              {item.name}
            </span>
          </span>
        </NavLink>
      </TooltipTrigger>
      {!isOpenSidebar && (
        <TooltipContent side="right">
          <p className="text-xs">{item.name}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
