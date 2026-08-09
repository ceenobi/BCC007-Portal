import {
  RiArrowDownSLine,
  RiCalendarLine,
  RiFilterLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { transferStatus} from "~/lib/constants";

const initialFilters = (searchParams: URLSearchParams) => ({
  transferStatus: searchParams.get("transferStatus") || "",
  startDate: searchParams.get("startDate") || "",
  endDate: searchParams.get("endDate") || "",
});

export default function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(searchParams));

  useEffect(() => {
    setFilters(initialFilters(searchParams));
  }, [searchParams]);

  const activeStatus = transferStatus.find(
    (item) => item.value === filters.transferStatus,
  );
  const hasDateFilter = Boolean(filters.startDate || filters.endDate);
  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };
  const rangeLabel = hasDateFilter
    ? `${formatDate(filters.startDate)}${filters.startDate && filters.endDate ? " – " : ""}${formatDate(filters.endDate)}`
    : "Date range";
  const hasActiveFilters = Boolean(
    filters.transferStatus ||
    filters.startDate ||
    filters.endDate,
  );

  const handleFilterChange = (
    field: keyof ReturnType<typeof initialFilters>,
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updatedSearchParams = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        updatedSearchParams.set(key, value);
      } else {
        updatedSearchParams.delete(key);
      }
    });
    updatedSearchParams.delete("page");
    setSearchParams(updatedSearchParams);
  };

  const handleClearFilters = () => {
    setFilters({
      transferStatus: "",
      startDate: "",
      endDate: "",
    });
    const params = new URLSearchParams(searchParams);
    params.delete("transferStatus");
    params.delete("startDate");
    params.delete("endDate");
    params.delete("page");
    setSearchParams(params);
  };

  return (
    <div className="hidden lg:flex flex-wrap items-center justify-between gap-2 px-2">
      <form
        className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap"
        onSubmit={handleSubmit}
        id="filter"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="gap-1.5"
                aria-label="Filter by status"
              >
                <RiFilterLine className="size-4" />
                <span className="capitalize text-muted-foreground text-xs">
                  {activeStatus?.label ?? "All statuses"}
                </span>
                <RiArrowDownSLine className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuGroup>
              {transferStatus.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item.value}
                  checked={filters.transferStatus === item.value}
                  onCheckedChange={(checked) =>
                    handleFilterChange(
                      "transferStatus",
                      checked ? item.value : "",
                    )
                  }
                  className="capitalize text-xs"
                >
                  {item.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="gap-1.5"
                aria-label="Filter by date range"
              >
                <RiCalendarLine className="size-4" />
                <span className="text-xs text-muted-foreground">
                  {rangeLabel}
                </span>
                <RiArrowDownSLine className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <div className="space-y-1 px-1 py-1">
                <label className="ml-1 block text-xs text-muted-foreground">
                  Start date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="rounded-md focus:outline-lightBlue focus:ring-lightBlue"
                />
              </div>
              <div className="space-y-1 px-1 py-1">
                <label className="ml-1 block text-xs text-muted-foreground">
                  End date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="rounded-md focus:outline-lightBlue focus:ring-lightBlue"
                />
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </form>
      <div className="flex items-center gap-2 border-t pt-2 md:border-none md:pt-0">
        <Button
          onClick={handleClearFilters}
          variant="ghost"
          size="sm"
          className={
            !hasActiveFilters ? "cursor-not-allowed" : "cursor-pointer"
          }
          disabled={!hasActiveFilters}
        >
          Clear all
        </Button>
        <Separator orientation="vertical" />
        <Button
          size="sm"
          type="submit"
          form="filter"
          variant="link"
          className="cursor-pointer hover:text-lightBlue"
          disabled={!hasActiveFilters}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
