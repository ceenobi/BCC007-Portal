import { Accordion } from "@base-ui/react/accordion";
import { RiArrowDownSLine } from "@remixicon/react";
import type * as React from "react";
import { cn } from "~/lib/utils";

function AccordionRoot({
	className,
	...props
}: React.ComponentProps<typeof Accordion.Root>) {
	return (
		<Accordion.Root
			className={cn("flex w-full flex-col", className)}
			{...props}
		/>
	);
}

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof Accordion.Item>) {
	return (
		<Accordion.Item
			className={cn("group border-b border-border last:border-b-0", className)}
			{...props}
		/>
	);
}

function AccordionTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof Accordion.Trigger>) {
	return (
		<Accordion.Header className="flex">
			<Accordion.Trigger
				className={cn(
					"flex flex-1 cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-mainBlack dark:text-white [&::-webkit-details-marker]:hidden",
					className,
				)}
				{...props}
			>
				{children}
				<RiArrowDownSLine
					size={20}
					aria-hidden
					className="shrink-0 text-lightBlue transition-transform duration-300 group-data-[open]:rotate-180"
				/>
			</Accordion.Trigger>
		</Accordion.Header>
	);
}

function AccordionContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof Accordion.Panel>) {
	return (
		<Accordion.Panel
			className={cn(
				"grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-[panel-open]:grid-rows-[1fr]",
				className,
			)}
			{...props}
		>
			<div className="overflow-hidden">
				<p className="pb-5 text-sm leading-relaxed text-mainGray dark:text-muted-foreground">
					{children}
				</p>
			</div>
		</Accordion.Panel>
	);
}

export {
	AccordionContent,
	AccordionItem,
	AccordionRoot as Accordion,
	AccordionTrigger,
};
