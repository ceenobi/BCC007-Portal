import {
  RiArrowDownSFill,
  RiArrowLeftSFill,
  RiArrowRightSFill,
} from "@remixicon/react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

type Props = {
  totalPages: number;
  hasMore: boolean;
  handlePageChange: (page: string) => void;
  onLimitChange?: (limit: string) => void;
  currentPage: number;
  limit?: number;
};

export default function Paginate({
  totalPages,
  hasMore,
  handlePageChange,
  onLimitChange,
  currentPage,
}: Props) {
  return (
    <div className="flex justify-end items-center py-4 gap-4">
      <div className="flex items-center">
        <p className="text-muted-foreground text-sm font-medium">
          {currentPage} of {totalPages}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <RiArrowDownSFill className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="rounded-lg">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Limit</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onLimitChange?.("10")}
                className="text-xs"
              >
                10 rows per page
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onLimitChange?.("20")}
                className="text-xs"
              >
                20 rows per page
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onLimitChange?.("50")}
                className="text-xs"
              >
                50 rows per page
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-sm border border-mainGray/50 bg-background dark:bg-lightGray space-x-2 flex items-center">
        <button
          onClick={() => handlePageChange("first")}
          className={`text-mainBlack dark:text-white ${
            currentPage === 1
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
          disabled={currentPage === 1}
        >
          <RiArrowLeftSFill className="hover:text-mainBlue" />
        </button>
        <button
          onClick={() => handlePageChange("prev")}
          className={`text-mainBlack dark:text-white hover:text-white ${
            currentPage === 1
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
          disabled={currentPage === 1}
        >
          <RiArrowLeftSFill className="hover:text-mainBlue" />
        </button>
        <button
          onClick={() => handlePageChange("next")}
          className={`text-mainBlack dark:text-white hover:text-white ${
            !hasMore ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
          disabled={!hasMore}
        >
          <RiArrowRightSFill className="hover:text-mainBlue" />
        </button>
        <button
          onClick={() => handlePageChange("last")}
          className={` text-mainBlack dark:text-white ${
            !hasMore ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
          disabled={!hasMore}
        >
          <RiArrowRightSFill className="hover:text-mainBlue" />
        </button>
      </div>
    </div>
  );
}
