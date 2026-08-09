import { RoleBadge } from "~/features/members/role-badge";
import { useIsMobile } from "~/hooks/useIsMobile";
import { getTimeOfDay } from "~/lib/utils";
import type { SessionUser } from "~/types";
import Drawer from "./drawer";
import GlobalSearch from "./global-search";
import HelpDesk from "./help-desk";
import Logo from "./logo";
import Menu from "./menu";
import Notification from "./notification";

interface NavbarProps {
  user: SessionUser;
}

export default function Navbar({ user }: NavbarProps) {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b backdrop-blur supports-backdrop-filter:bg-background/5">
      <div className="max-w-full mx-auto p-2 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Logo
            size={8}
            showLogoText={isMobile ? true : false}
            classname="text-xl"
          />
          <div className="hidden md:flex gap-2 items-center">
            <span>/</span>
            <h2 className="font-semibold text-sm truncate">
              {user?.name?.split(" ")[0]} {getTimeOfDay()}
            </h2>
            <span>/</span>
            <RoleBadge role={user.role} />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <GlobalSearch user={user} />
          <Notification />
          <HelpDesk />
          <Menu user={user} />
          <Drawer user={user} />
        </div>
      </div>
    </header>
  );
}
