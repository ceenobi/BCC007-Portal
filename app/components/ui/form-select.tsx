import { cn, getInitials } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
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
  image?: string;
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

function OptionAvatar({ image, name }: { image?: string; name: string }) {
  if (!image) return null;
  return (
    <Avatar size="sm" className="shrink-0">
      <AvatarImage src={image} alt={name} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
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
          {selectedOption ? (
            <>
              <OptionAvatar image={selectedOption.image} name={selectedOption.name} />
              {selectedOption.name}
            </>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="capitalize">
        {options.map((option, index) => (
          <SelectItem key={option.id || index} value={String(option.id)}>
            <OptionAvatar image={option.image} name={option.name} />
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}