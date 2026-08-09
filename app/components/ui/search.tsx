import { RiCloseFill, RiLoaderFill, RiSearch2Line } from "@remixicon/react";
import { useCallback, useRef } from "react";
import { Form, useNavigation, useSearchParams, useSubmit } from "react-router";
import { Input } from "../ui/input";
import { cn } from "~/lib/utils";

export default function Search({
  id,
  placeholder,
  classname,
}: {
  id: string;
  placeholder?: string;
  classname?:string;
}) {
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const submit = useSubmit();
  const searching =
    navigation.location &&
    new URLSearchParams(navigation.location.search).has("query");
  const query = searchParams.get("query") || "";

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSubmit = useCallback(
    (form: HTMLFormElement) => {
      const isFirstSearch = query === "";
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        submit(form, {
          replace: !isFirstSearch,
        });
      }, 500);
    },
    [query, submit],
  );

  const handleQueryDelete = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    searchParams.delete("query");
    submit(searchParams);
  };

  return (
    <>
      <Form
        className={cn("relative rounded-md h-7.5 bg-transparent transition-[border-color] duration-300 flex items-center", classname)}
        role="search"
        id={id}
        onChange={(event) => {
          debouncedSubmit(event.currentTarget);
        }}
      >
        {searching ? (
          <RiLoaderFill className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
        ) : (
          <RiSearch2Line className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4" />
        )}
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer"
            onClick={handleQueryDelete}
          >
            <RiCloseFill className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <Input
          placeholder={placeholder}
          name="query"
          aria-label="Search"
          defaultValue={query}
          ref={inputRef}
          className="h-7.5 pl-8 placeholder:text-[12px] bg-inherit focus:ring-0 focus:border-muted focus:outline-0 focus:ring-offset-0"
          type="search"
        />
      </Form>
    </>
  );
}
