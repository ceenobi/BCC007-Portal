import {
  RiCloseLine,
  RiLogoutBoxRLine,
  RiMenuFill,
} from "@remixicon/react";
import { useState } from "react";
import { Form, NavLink } from "react-router";
import { sideBarLinks } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import type { SessionUser } from "~/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";


export default function Drawer({ user }: { user?: SessionUser | null }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Open navigation menu"
            className="lg:hidden relative w-8 h-8 cursor-pointer flex items-center justify-center"
            data-tour="drawer"
          >
            <RiMenuFill size={24} />
          </button>
        }
      />
      <SheetContent
        side="bottom"
        className="w-full sm:max-w-md bg-white dark:bg-white/2 border border-white/10 dark:backdrop-blur-3xl border-l-0 p-0"
        showCloseButton={false}
        aria-describedby="drawer"
      >
        <div className="relative flex flex-col h-full px-4 py-8">
          <div className="flex justify-end items-center h-12">
            <SheetClose
              render={
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  className="w-10 h-10 cursor-pointer"
                >
                  <RiCloseLine size={30} />
                </button>
              }
            />
          </div>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex-1 flex flex-col justify-start">
            <div className="flex flex-col gap-3 uppercase w-full">
              {sideBarLinks.map((item) => {
                const children = item.children.filter((child) => {
                  if (child.href === "/dashboard/transfers") {
                    return hasPermission(user?.role, "MANAGE_SETTINGS");
                  }
                  return true;
                });
                return (
                  <div key={item.id} className="flex flex-col px-1">
                    <p className="font-medium dark:text-gray-400 px-3 py-2 text-xs uppercase tracking-wider">
                      {item.title}
                    </p>

                    {children.map((child) => (
                      <DrawerLink
                        key={child.name}
                        item={child}
                        setIsOpen={setIsOpen}
                      />
                    ))}
                  </div>
                );
              })}
              <Form
                action="/logout"
                method="post"
                className="mt-4 flex gap-2 px-4 items-center cursor-pointer"
                onClick={(e) => {
                  e.currentTarget.requestSubmit();
                }}
              >
                <RiLogoutBoxRLine size={20} />
                <span className="text-sm cursor-pointer">
                  Logout
                </span>
              </Form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerLink({
  item,
  setIsOpen,
}: {
  item: any;
  setIsOpen: (isOpen: boolean) => void;
}) {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `tracking-widest transition-[color,border-color] duration-300 ease-in-out w-full p-2 flex items-center justify-start gap-2 text-sm font-medium ${
          isActive
            ? "bg-mainGray/20 dark:bg-darkBlue/10 text-mainBlack dark:text-white"
            : "hover:bg-mainGray/5 hover:text-mainBlack hover:dark:text-white/80 text-muted-foreground"
        }`
      }
      viewTransition
      end={item.href === "/dashboard"}
      prefetch="intent"
      onClick={() => setIsOpen(false)}
    >
      <span className={`flex items-center gap-2 cursor-pointer px-2`}>
        {item.icon && <item.icon size={20} />}
        <span
          className={`text-sm cursor-pointer transition ease-in-out duration-300`}
        >
          {item.name}
        </span>
      </span>
    </NavLink>
  );
}
