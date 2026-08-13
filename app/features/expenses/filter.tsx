import { RiArrowDownSLine, RiFilterLine } from "@remixicon/react";
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
import { Separator } from "~/components/ui/separator";
import { expenseCategory, expenseStatus } from "~/lib/constants";

const initialFilters = (searchParams: URLSearchParams) => ({
  status: searchParams.get("status") || "",
  category: searchParams.get("category") || "",
});

export default function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(searchParams));

  useEffect(() => {
    setFilters(initialFilters(searchParams));
  }, [searchParams]);

  const activeStatus = expenseStatus.find(
    (item) => item.value === filters.status,
  );
  const activeCategory = expenseCategory.find(
    (item) => item.value === filters.category,
  );
  const hasActiveFilters = Boolean(filters.status || filters.category);

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
    setFilters({ status: "", category: "" });
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    params.delete("category");
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
              {expenseStatus.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item.value}
                  checked={filters.status === item.value}
                  onCheckedChange={(checked) =>
                    handleFilterChange("status", checked ? item.value : "")
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
                aria-label="Filter by category"
              >
                <RiFilterLine className="size-4" />
                <span className="capitalize text-muted-foreground text-xs">
                  {activeCategory?.label ?? "All categories"}
                </span>
                <RiArrowDownSLine className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuGroup>
              {expenseCategory.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item.value}
                  checked={filters.category === item.value}
                  onCheckedChange={(checked) =>
                    handleFilterChange("category", checked ? item.value : "")
                  }
                  className="capitalize text-xs"
                >
                  {item.label}
                </DropdownMenuCheckboxItem>
              ))}
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
          type="submit"
          form="filter"
          size="sm"
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