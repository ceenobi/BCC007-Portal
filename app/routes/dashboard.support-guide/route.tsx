import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import KnowledgeBase from "../../features/guide/knowledge-base";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Knowledge Base Guide - Get information" },
		{
			name: "description",
			content: `See information on how to get the best out of BC007 Portal`,
		},
	];
}

export default function SupportGuide() {
	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Support Guide
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Get assistance with understanding and using BC007 Portal
					</p>
				</div>

				<KnowledgeBase />
			</PageSection>
		</PageWrapper>
	);
}
