import {
  RiLogoutBoxRLine,
  RiRecordCircleLine,
  RiUser3Line,
} from "@remixicon/react";
import { Form, Link } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { getInitials } from "~/lib/utils";
import type { SessionUser } from "~/types";
import { useTheme } from "../provider/theme";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function Menu({ user }: { user?: SessionUser }) {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = (value: "light" | "dark" | "system") => {
    setTheme(value);
  };

  return (
    <>
      {isMobile ? (
        <Button
          variant="ghost"
          className="cursor-pointer relative h-8 w-8 p-0 rounded-full border border-mainGray/70"
          aria-label="Profile menu"
          data-tour="profile"
        >
          <Link to="/dashboard/account">
            {user?.image ? (
              <img
                className="h-8 w-8 object-cover transition-colors rounded-full border border-mainGray/70"
                src={getOptimizedImageUrl(user?.image, 32)}
                alt={`${user?.name}'s avatar`}
                loading="lazy"
                width={32}
                height={32}
              />
            ) : (
              <span className="w-8 h-8 transition-colors border border-mainGray/70 dark:border-darkBlue flex items-center justify-center rounded-full bg-white dark:bg-black">
                {getInitials(user?.name)}
              </span>
            )}
          </Link>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="cursor-pointer relative h-8 w-8 p-0 rounded-full border border-mainGray/70"
                aria-label="Profile menu"
                data-tour="profile"
              >
                {user?.image ? (
                  <img
                    className="h-8 w-8 object-cover transition-colors rounded-full border border-mainGray/70"
                    src={getOptimizedImageUrl(user?.image, 32)}
                    alt={`${user?.name}'s avatar`}
                    loading="lazy"
                    width={32}
                    height={32}
                  />
                ) : (
                  <span className="w-8 h-8 transition-colors border border-mainGray/70 dark:border-darkBlue flex items-center justify-center rounded-full bg-white dark:bg-black">
                    {getInitials(user?.name)}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent
            className="w-56 rounded-sm dark:bg-lightGray"
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuItem className="text-mainBlack dark:text-white truncate text-xs font-medium">
                {user?.name}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground text-xs truncate leading-none">
                {user?.email}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link
                  to="/dashboard/account"
                  className="flex gap-2 items-center text-muted-foreground"
                >
                  <RiUser3Line size={12} />
                  <p className="text-xs truncate leading-none">Account</p>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              {["system", "dark", "light"].map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() =>
                    handleThemeToggle(option as "light" | "dark" | "system")
                  }
                  className={`text-xs flex gap-2 items-center cursor-pointer ${theme === option ? "text-foreground" : "text-muted-foreground"}`}
                >
                  <RiRecordCircleLine />
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-sm">
                <Form
                  action="/logout"
                  method="post"
                  className="flex gap-2 items-center cursor-pointer"
                  onClick={(e) => {
                    e.currentTarget.requestSubmit();
                  }}
                >
                  <RiLogoutBoxRLine className="w-4 h-4" />
                  <span className="text-xs cursor-pointer w-auto font-semibold">
                    Logout
                  </span>
                </Form>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
