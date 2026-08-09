import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type SelectOption = {
  name: string;
  id: string | number;
};

interface FormSelectProps {
  options?: SelectOption[];
  value?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  classname?: string;
}

export function FormSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select an option",
  disabled = false,
  error = false,
  classname,
}: FormSelectProps) {
  const selectedOption = options.find(
    (opt) => String(opt.id) === String(value),
  );

  return (
    <Select
      onValueChange={onValueChange}
      value={value ?? ""}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "text-xs py-4.5 capitalize focus:outline-blue-500 focus:ring-blue-500 w-full",
          error ? "border-red-500" : "",
          classname ? classname : "h-10",
        )}
      >
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.name : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="capitalize">
        {options.map((option, index) => (
          <SelectItem key={option.id || index} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
