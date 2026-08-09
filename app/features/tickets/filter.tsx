import { RiEraserFill } from "@remixicon/react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";

export default function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    category: searchParams.get("category") || "",
    priority: searchParams.get("priority") || "",
  });
  const status = searchParams.get("status") || "";
  const category = searchParams.get("category") || "";
  const priority = searchParams.get("priority") || "";

  const handleFilterChange = (field: string, value: string) => {
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
    setSearchParams(updatedSearchParams);
  };

  const handleClearFilters = () => {
    setFilters({
      status: "",
      category: "",
      priority: "",
    });
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    params.delete("category");
    params.delete("priority");
    setSearchParams(params);
  };

  return (
    <div className="hidden lg:flex flex-wrap items-center justify-between gap-2">
      <form
        className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap"
        onSubmit={handleSubmit}
        id="filter"
      >
        <Select
          value={filters.status}
          onValueChange={(value) =>
            handleFilterChange("status", value as string)
          }
          defaultValue={status}
        >
          <SelectTrigger className="w-fit text-xs border focus:outline-lightBlue focus:ring-lightBlue">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {["open", "in-progress", "resolved", "closed"]?.map((item) => (
              <SelectItem key={item} value={item}  className="capitalize text-xs">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            handleFilterChange("category", value as string)
          }
          defaultValue={category}
        >
          <SelectTrigger className="w-fit text-xs border focus:outline-lightBlue focus:ring-lightBlue">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {["account", "security", "payment", "other"].map((item) => (
              <SelectItem key={item} value={item} className="capitalize text-xs">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.priority}
          onValueChange={(value) =>
            handleFilterChange("priority", value as string)
          }
          defaultValue={priority}
        >
          <SelectTrigger className="w-fit text-xs border focus:outline-lightBlue focus:ring-lightBlue">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {["low", "medium", "high", "critical"].map((item) => (
              <SelectItem key={item} value={item} className="capitalize text-xs">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
      <div className="flex items-center gap-2 border-t pt-2 md:border-none md:pt-0">
        <Button
          onClick={handleClearFilters}
          variant="ghost"
          className="cursor-pointer"
          size="sm"
          disabled={!filters.status && !filters.category && !filters.priority}
        >
          <RiEraserFill /> Clear all
        </Button>
        <Separator orientation="vertical" />
        <Button
          type="submit"
          form="filter"
          variant="link"
          className="cursor-pointer underline"
          disabled={!filters.status && !filters.category && !filters.priority}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
