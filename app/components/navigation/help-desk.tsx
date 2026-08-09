import {
  RiArticleLine,
  RiHeartPulseLine,
  RiMemoriesLine,
  RiQuestionLine,
  RiWhatsappLine,
} from "@remixicon/react";
import { NavLink } from "react-router";
import { useTour } from "../provider/tour";
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

export default function HelpDesk() {
  const { resetTour } = useTour();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="default"
              size="icon"
              className="rounded-full"
              data-tour="help"
            >
              <RiQuestionLine size={16} />
            </Button>
          }
        />
        <DropdownMenuContent className="w-46 rounded-sm dark:bg-lightGray">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-semibold text-mainBlack dark:text-white">
              Help & Support
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <NavLink
                to="/dashboard/help-center?create=true"
                className="text-xs leading-none"
              >
                {({ isActive }) => (
                  <span
                    className={`inline-flex gap-1 items-center ${isActive ? "text-lightBlue " : "text-muted-foreground "}`}
                  >
                    <RiQuestionLine /> Create Ticket
                  </span>
                )}
              </NavLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <NavLink
                to="/dashboard/support-guide"
                className="text-xs leading-none"
              >
                {({ isActive }) => (
                  <span
                    className={`inline-flex gap-1 items-center ${isActive ? "text-lightBlue " : "text-muted-foreground "}`}
                  >
                    <RiArticleLine /> Browse guides
                  </span>
                )}
              </NavLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <NavLink
                to="/health"
                className="inline-flex gap-1 items-center text-muted-foreground"
              >
                <RiHeartPulseLine />{" "}
                <p className="text-xs truncate leading-none">Health status</p>
              </NavLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <a
                href="https://chat.whatsapp.com/IqqTHbajJmIITi95Ul0P7t?mode=gi_t"
                className="inline-flex gap-1 items-center text-muted-foreground text-xs truncate leading-none"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RiWhatsappLine /> Join the community
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <button
                type="button"
                onClick={() => resetTour()}
                className="flex gap-2 items-center cursor-pointer bg-transparent border-0 w-full text-left"
              >
                <RiMemoriesLine />
                <span className="text-xs w-auto font-medium">Replay Tour</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
