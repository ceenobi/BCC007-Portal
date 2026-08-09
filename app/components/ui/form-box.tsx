import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { type E164Number } from "libphonenumber-js/core";
import {
  Controller,
  type Control,
  type FieldError as FieldErrorType,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormRegister,
} from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "~/lib/utils";
import { Field, FieldError, FieldLegend, FieldSet } from "./field";
import { FormSelect } from "./form-select";
import { Input } from "./input";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Textarea } from "./textarea";
import { Switch } from "./switch";

export type SelectOption = {
  name: string;
  id: string | number;
  description?: string;
};

type FormFieldProps<T extends FieldValues> = {
  label: string;
  type: string;
  id: string;
  register: UseFormRegister<T>;
  errors?: FieldErrorType | undefined;
  placeholder?: string;
  isVisible?: boolean;
  setIsVisible?: (visible: boolean | ((prev: boolean) => boolean)) => void;
  name: Path<T>;
  classname?: string;
  disabled?: boolean;
  defaultValue?: string | Date | number | boolean;
  inputType?: "input" | "textarea" | "select" | "switch" | "radio";
  registerOptions?: RegisterOptions<T>;
  control?: Control<T, any, any>;
  options?: SelectOption[];
  styles?: string;
};

export function FormBox<T extends FieldValues>({
  isVisible,
  setIsVisible,
  label,
  type,
  placeholder,
  id,
  register,
  errors,
  name,
  classname,
  disabled = false,
  defaultValue,
  inputType,
  registerOptions,
  control,
  options,
  styles,
}: FormFieldProps<T>) {
  const toggleVisibility = () => setIsVisible?.((prev: boolean) => !prev);
  const renderField = () => {
    switch (inputType ?? type) {
      case "textarea":
        return (
          <div className="relative">
            <Textarea
              id={id}
              {...register(name, registerOptions)}
              disabled={disabled}
              placeholder={placeholder ?? " "}
              className={cn(
                "peer pt-8 placeholder-transparent placeholder:text-xs focus:border-lightBlue focus:outline-lightBlue focus:ring-lightBlue",
                errors ? "border-red-600" : "",
              )}
              defaultValue={
                defaultValue instanceof Date
                  ? defaultValue.toISOString().split("T")[0]
                  : typeof defaultValue === "boolean"
                    ? String(defaultValue)
                    : defaultValue
              }
              rows={8}
            />
            <label
              htmlFor={id}
              className={cn(
                "absolute left-2.5 top-3 text-xs text-muted-foreground transition-all duration-200 pointer-events-none select-none",
                "peer-focus:text-xs peer-focus:-translate-y-2 peer-focus:text-primary",
                "peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:-translate-y-2",
                errors ? "text-destructive" : "",
              )}
            >
              {label}
            </label>
          </div>
        );
      case "switch":
        return (
          <div className="flex gap-2 items-center">
            <Controller
              name={name}
              control={control}
              render={({ field: { onChange, value } }) => (
                <Switch
                  id={id}
                  checked={value}
                  onCheckedChange={onChange}
                  disabled={disabled}
                />
              )}
            />
            <Label className="text-xs text-mainGray dark:text-muted-foreground">{placeholder}</Label>
          </div>
        );
      case "radio":
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={id} className="text-xs">
                  {label}
                </Label>
                <RadioGroup
                  value={String(field.value ?? "")}
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 gap-2"
                >
                  {(options?.length ? options : [{ id: name, name }]).map(
                    (option) => {
                      const optionValue = String(option.id);
                      const optionName =
                        "name" in option ? option.name : optionValue;
                      return (
                        <div
                          key={optionValue}
                          className="flex items-start gap-3"
                        >
                          <RadioGroupItem
                            value={optionValue}
                            id={`${id}-${optionValue}`}
                          />
                          <div className="flex flex-col gap-0.5">
                            <Label
                              htmlFor={`${id}-${optionValue}`}
                              className="text-xs text-mainGray dark:text-muted-foreground"
                            >
                              {optionName}
                            </Label>
                            {option.description && (
                              <p className="text-xs text-muted-foreground font-normal">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </RadioGroup>
              </div>
            )}
          />
        );
      case "select":
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <FormSelect
                options={options}
                value={String(field.value ?? "")}
                onValueChange={field.onChange}
                disabled={disabled}
                error={!!errors}
                placeholder={placeholder}
                classname={classname}
              />
            )}
          />
        );
      case "tel":
        return (
          <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value } }) => (
              <PhoneInput
                defaultCountry="NG"
                placeholder={placeholder}
                international
                withCountryCallingCode
                value={value as E164Number | undefined}
                onChange={onChange}
                className={`px-2 py-3.5 rounded-md text-sm dark:text-white dark:bg-mainGray/10 border border-zinc-200 dark:border-muted-foreground/30  focus:outline-lightBlue focus:ring-lightBlue ${errors ? "border-destructive dark:border-destructive" : ""}`}
              />
            )}
          />
        );
      default:
        return (
          <div className="relative">
            <Input
              type={isVisible ? "text" : type}
              placeholder={placeholder}
              className={cn(
                "peer h-12.5 px-2.5 pt-5 pb-1 text-xs focus:outline-mainBlue focus:ring-mainBlue",
                "placeholder:opacity-0 text-lightGray dark:text-white",
                errors ? "border-red-600" : "",
              )}
              id={id}
              {...register(name, registerOptions)}
              disabled={disabled}
              defaultValue={
                defaultValue instanceof Date
                  ? defaultValue.toISOString().split("T")[0]
                  : typeof defaultValue === "boolean"
                    ? String(defaultValue)
                    : defaultValue
              }
            />
            <label
              htmlFor={id}
              className={cn(
                "absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 pointer-events-none select-none",
                "peer-focus:top-2 peer-focus:text-xs peer-focus:translate-y-0 peer-focus:text-primary",
                "peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:translate-y-0",
                errors ? "text-destructive" : "",
              )}
            >
              {label}
            </label>

            {type === "password" && (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-xs border-0 focus:outline-none font-semibold cursor-pointer text-muted-foreground w-fit"
                onClick={toggleVisibility}
              >
                {isVisible ? (
                  <RiEyeOffLine size={18} />
                ) : (
                  <RiEyeLine size={18} />
                )}
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`${classname}`}>
      <FieldSet>
        <FieldLegend className="w-full relative">
          <Field>{renderField()}</Field>
        </FieldLegend>
      </FieldSet>
      {errors?.message && (
        <FieldError className="text-xs text-destructive">
          {String(errors?.message)}
        </FieldError>
      )}
    </div>
  );
}
