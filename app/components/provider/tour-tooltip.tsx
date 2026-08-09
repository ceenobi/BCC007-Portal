import { RiCloseLine } from "@remixicon/react";
import type { ArrowRenderProps, TooltipRenderProps } from "react-joyride";
import { buttonVariants } from "../ui/button";
import { cn } from "~/lib/utils";

/**
 * Theme-aware arrow that fills with the app's popover color (adapts to dark
 * mode via CSS variables). Replaces Joyride's white default arrow.
 */
export function TourArrow({ base, placement, size }: ArrowRenderProps) {
  const rotate: Record<string, string> = {
    top: "",
    "top-start": "",
    "top-end": "",
    bottom: "rotate-180",
    "bottom-start": "rotate-180",
    "bottom-end": "rotate-180",
    left: "rotate-90",
    right: "-rotate-90",
  };
  return (
    <div
      style={{
        width: base,
        height: size,
        background: "var(--popover)",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      }}
      className={rotate[placement] ?? ""}
    />
  );
}

/**
 * Custom Joyride tooltip built from the app's Tailwind tokens so the tour
 * matches the portal theme (including dark mode).
 */
export function TourTooltip(props: TooltipRenderProps) {
  const {
    backProps,
    closeProps,
    index,
    isLastStep,
    primaryProps,
    skipProps,
    size,
    step,
    tooltipProps,
  } = props;

  return (
    <div
      {...tooltipProps}
      className="w-[min(92vw,380px)] rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
    >
      <div className="flex items-start justify-between gap-3">
        {step.title ? (
          <h3 className="font-heading text-sm font-medium text-mainDark dark:text-white">
            {step.title}
          </h3>
        ) : (
          <span />
        )}
        <button
          {...closeProps}
          type="button"
          className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      {step.content ? (
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step.content}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1} of {size}
        </span>
        <div className="flex items-center gap-2">
          <button
            {...skipProps}
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "cursor-pointer text-muted-foreground",
            )}
          >
            Skip
          </button>
          {index > 0 && (
            <button
              {...backProps}
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer",
              )}
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            type="button"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "cursor-pointer",
            )}
          >
            {isLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
