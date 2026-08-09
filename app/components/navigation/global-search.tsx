import {
  RiArrowRightUpLine,
  RiCalendarEventLine,
  RiCashLine,
  RiCommandLine,
  RiCustomerService2Line,
  RiFileListLine,
  RiRefundLine,
  RiSearchLine,
  RiUserLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { sideBarLinks } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import { cn, formatMeta } from "~/lib/utils";
import type {
  GlobalSearchResultType,
  GlobalSearchSection,
  SessionUser,
} from "~/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

const typeIcon: Record<GlobalSearchResultType, RemixiconComponentType> = {
  member: RiUserLine,
  event: RiCalendarEventLine,
  payment: RiCashLine,
  transfer: RiRefundLine,
  ticket: RiCustomerService2Line,
  audit: RiFileListLine,
};

type FlatItem = {
  key: string;
  href: string;
  icon: RemixiconComponentType;
  title: string;
  subtitle: string;
  meta?: string;
  groupTitle?: string;
};

interface GlobalSearchProps {
  user: SessionUser;
}

export default function GlobalSearch({ user }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [sections, setSections] = useState<GlobalSearchSection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const items: FlatItem[] = [];
    for (const group of sideBarLinks) {
      for (const child of group.children) {
        if (
          child.href === "/dashboard/transfers" &&
          !hasPermission(user?.role, "MANAGE_TRANSFERS")
        ) {
          continue;
        }
        items.push({
          key: `nav:${child.href}`,
          href: child.href,
          icon: child.icon,
          title: child.name,
          subtitle: group.title,
          groupTitle: group.title,
        });
      }
    }
    return items;
  }, [user]);

  const runSearch = useCallback(async (value: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const response = await fetch("/api/global-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      setSections(data.success ? (data.body?.sections ?? []) : []);
    } catch (error: any) {
      if (error?.name !== "AbortError" && !controller.signal.aborted) {
        setSections([]);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  const showNav = query.trim().length < 2;

  useEffect(() => {
    if (!isOpen) return;
    if (showNav) {
      abortRef.current?.abort();
      setSections([]);
      setIsLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, showNav, runSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const flatItems = useMemo<FlatItem[]>(() => {
    if (showNav) return navItems;
    const items: FlatItem[] = [];
    for (const section of sections) {
      const Icon = typeIcon[section.type];
      for (const result of section.results) {
        items.push({
          key: `${section.type}:${result.id}`,
          href: result.href,
          icon: Icon,
          title: result.title,
          subtitle: result.subtitle,
          meta: result.meta,
        });
      }
    }
    return items;
  }, [showNav, navItems, sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setQuery("");
  };

  const handleGlobalKeydown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((open) => !open);
        return;
      }
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setIsOpen(true);
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  const select = useCallback(
    (href: string) => {
      navigate(href);
      setIsOpen(false);
      setQuery("");
    },
    [navigate],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + flatItems.length) % flatItems.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) select(item.href);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex h-8 w-38 justify-between text-muted-foreground hover:text-foreground rounded-full"
        data-tour="search"
      >
        <div className="flex items-center gap-2">
          <RiSearchLine className="h-3 w-3" />
          <span className="text-xs">Search...</span>
        </div>
        <div className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
          <RiCommandLine className="h-3 w-3" />
          <span>K</span>
        </div>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        className="md:hidden rounded-full"
        data-tour="search"
      >
        <RiSearchLine />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={handleKeyDown}
          className="top-1/4 sm:max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search across the portal and jump to a page.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <RiSearchLine className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members, events, payments, tickets..."
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {isLoading && (
              <div className="size-4 shrink-0 border-2 border-lightBlue border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {showNav ? (
              <nav>
                {navItems.map((item, index) => (
                  <ResultRow
                    key={item.key}
                    item={item}
                    active={index === activeIndex}
                    onSelect={select}
                  />
                ))}
              </nav>
            ) : isLoading && flatItems.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <div className="size-4 border-2 border-lightBlue border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            ) : flatItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found for "{query.trim()}"
              </div>
            ) : (
              <div>
                {sections
                  .filter((section) => section.results.length > 0)
                  .map((section) => (
                    <div key={section.type} className="mb-1">
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                          {section.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => select(section.viewAllHref)}
                          className="flex items-center gap-0.5 text-[0.7rem] text-primary hover:underline"
                        >
                          View all <RiArrowRightUpLine className="h-3 w-3" />
                        </button>
                      </div>
                      {section.results.map((result) => {
                        const item: FlatItem = {
                          key: `${section.type}:${result.id}`,
                          href: result.href,
                          icon: typeIcon[section.type],
                          title: result.title,
                          subtitle: result.subtitle,
                          meta: result.meta,
                        };
                        const index = flatItems.findIndex(
                          (flat) => flat.key === item.key,
                        );
                        return (
                          <ResultRow
                            key={item.key}
                            item={item}
                            active={index === activeIndex}
                            onSelect={select}
                          />
                        );
                      })}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-3 py-2 text-[0.7rem] text-muted-foreground">
            <span className="flex items-center gap-3">
              <span>
                <kbd className="rounded border bg-muted px-1">↑</kbd>{" "}
                <kbd className="rounded border bg-muted px-1">↓</kbd> navigate
              </span>
              <span>
                <kbd className="rounded border bg-muted px-1">↵</kbd> select
              </span>
              <span>
                <kbd className="rounded border bg-muted px-1">esc</kbd> close
              </span>
            </span>
            <span className="hidden sm:inline">
              <kbd className="rounded border bg-muted px-1">⌘</kbd>
              <kbd className="rounded border bg-muted px-1">K</kbd> to reopen
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultRow({
  item,
  active,
  onSelect,
}: {
  item: FlatItem;
  active: boolean;
  onSelect: (href: string) => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const Icon = item.icon;

  useEffect(() => {
    if (active) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onSelect(item.href)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
    >
      <span className="shrink-0 text-muted-foreground">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.subtitle}
        </span>
      </span>
      {item.meta && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {formatMeta(item.meta)}
        </span>
      )}
    </button>
  );
}
