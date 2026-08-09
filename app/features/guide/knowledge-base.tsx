import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  RiArrowRightUpLine,
  RiBookOpenLine,
  RiCake3Line,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiCustomerService2Line,
  RiDashboardLine,
  RiExchangeFundsLine,
  RiFileHistoryLine,
  RiFundsLine,
  RiGroupLine,
  RiLineChartLine,
  RiLoopLeftLine,
  RiReceiptLine,
  RiSearch2Line,
  RiShieldCheckLine,
  RiTeamLine,
  RiUserAddFill,
  RiUserAddLine,
  RiUserSettingsLine,
  RiWallet3Line,
} from "@remixicon/react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { helpdeskKnowledgeBase, type KnowledgeBaseArticle } from "~/lib/guide";

const iconMap: Record<
  string,
  ComponentType<{ className?: string; size?: number | string }>
> = {
  RiUserAddLine,
  RiUserSettingsLine,
  RiDashboardLine,
  RiGroupLine,
  RiUserAddFill,
  RiCake3Line,
  RiCalendarEventLine,
  RiCalendarCheckLine,
  RiCheckboxCircleLine,
  RiWallet3Line,
  RiReceiptLine,
  RiTeamLine,
  RiLineChartLine,
  RiExchangeFundsLine,
  RiFundsLine,
  RiCustomerService2Line,
  RiShieldCheckLine,
  RiLoopLeftLine,
  RiFileHistoryLine,
};

const categoryColors: Record<string, string> = {
  "Getting Started": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Dashboard: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Members: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Events: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Payments: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Transfers: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "Help Center": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Settings: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

function renderInline(text: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "numbered"; items: string[] };

function parseContent(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.trim().split("\n");

  let current: { type: "list" | "numbered"; items: string[] } | null = null;

  const flush = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      if (current?.type !== "list") {
        flush();
        current = { type: "list", items: [] };
      }
      current.items.push(line.slice(2).trim());
    } else if (/^\d+\.\s/.test(line)) {
      if (current?.type !== "numbered") {
        flush();
        current = { type: "numbered", items: [] };
      }
      current.items.push(line.replace(/^\d+\.\s/, "").trim());
    } else {
      flush();
      blocks.push({ type: "paragraph", text: line.trim() });
    }
  }
  flush();

  return blocks;
}

function ArticleContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={index}
                className="pt-2 text-sm font-semibold tracking-tight text-foreground first:pt-0"
              >
                {renderInline(block.text)}
              </h2>
            );
          case "paragraph":
            return (
              <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                {renderInline(block.text)}
              </p>
            );
          case "list":
            return (
              <ul key={index} className="space-y-1.5">
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.75 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "numbered":
            return (
              <ol key={index} className="space-y-1.5">
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        categoryColors[category] ?? "bg-primary/10 text-primary",
      )}
    >
      {category}
    </Badge>
  );
}

function ArticleCard({
  article,
  index,
  onOpen,
}: {
  article: KnowledgeBaseArticle;
  index: number;
  onOpen: () => void;
}) {
  const Icon = iconMap[article.icon] ?? RiBookOpenLine;
  const excerpt = article.content.trim().split("\n").find((line) => line.trim() && !line.startsWith("#"))?.trim();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/60 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            categoryColors[article.category] ?? "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <RiArrowRightUpLine
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {article.title}
        </span>
        {excerpt && (
          <span className="line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
            {excerpt}
          </span>
        )}
      </span>
      <span className="mt-auto">
        <CategoryBadge category={article.category} />
      </span>
    </button>
  );
}

export default function KnowledgeBase() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<KnowledgeBaseArticle | null>(null);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(helpdeskKnowledgeBase.map((article) => article.category)),
      ),
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return helpdeskKnowledgeBase.filter((article) => {
      if (category !== "All" && article.category !== category) return false;
      if (!q) return true;
      const haystack = [
        article.title,
        article.category,
        article.content,
        ...article.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  const selectedIndex = selected
    ? helpdeskKnowledgeBase.findIndex((a) => a.id === selected.id)
    : -1;

  const move = (delta: number) => {
    if (!selected) return;
    const next =
      (selectedIndex + delta + helpdeskKnowledgeBase.length) %
      helpdeskKnowledgeBase.length;
    setSelected(helpdeskKnowledgeBase[next]);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <RiSearch2Line
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search articles..."
              aria-label="Search knowledge base"
              className="h-8 pl-9 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <RiCloseLine className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "h-7 cursor-pointer rounded-lg px-2.5 text-xs font-medium transition-colors",
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              index={index}
              onOpen={() => setSelected(article)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <RiSearch2Line className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">
              No articles found
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Try a different keyword or switch back to the "All" category.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
              className="mt-1 cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Clear search & filters
            </button>
          </div>
        )}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      categoryColors[selected.category] ?? "bg-primary/10 text-primary",
                    )}
                  >
                    {(() => {
                      const Icon = iconMap[selected.icon] ?? RiBookOpenLine;
                      return <Icon className="size-4.5" aria-hidden="true" />;
                    })()}
                  </span>
                  <DialogTitle className="pr-8 text-base">
                    {selected.title}
                  </DialogTitle>
                </div>
                <CategoryBadge category={selected.category} />
              </DialogHeader>

              <div className="rounded-xl bg-muted/40 p-4">
                <ArticleContent content={selected.content} />
              </div>

              {selected.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Related keywords:
                  </span>
                  {selected.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="text-[11px] font-normal"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  ← Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedIndex + 1} of {helpdeskKnowledgeBase.length}
                </span>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
