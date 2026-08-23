import { Link, data } from "react-router";
import {
	RiArrowGoBackFill,
	RiHome6Line,
	RiSearchEyeLine,
} from "@remixicon/react";
import { Button } from "~/components/ui/button";
import { buildSeoMeta } from "~/lib/seo";
import type { Route } from "./+types/$";

export function meta({}: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "Page Not Found",
			description:
				"The page you're looking for doesn't exist or has been moved.",
		}),
		{ name: "robots", content: "noindex" },
	];
}

export async function loader({}: Route.LoaderArgs) {
	return data(null, { status: 404 });
}

export default function CatchAll() {
	return (
		<main className="relative min-h-dvh flex flex-col items-center justify-center px-4">
			<div className="absolute inset-0 z-0 opacity-50 h-full w-full bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem]" />

			<div className="relative z-10 flex flex-col items-center text-center max-w-lg">
				<div className="mb-6 size-16 rounded-full flex items-center justify-center bg-mainBlue/10 dark:bg-darkBlue/10">
					<RiSearchEyeLine
						size={32}
						className="text-lightBlue dark:text-darkBlue"
					/>
				</div>

				<h1 className="mt-2 text-2xl font-bold tracking-tight text-mainDark dark:text-white">
					Page not found
				</h1>
				<p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
					The page you're looking for doesn't exist or has been moved.
				</p>

				<div className="mt-8 flex items-center gap-3">
					<Link to="/">
						<Button
							variant="outline"
							className="rounded-sm border-border bg-white dark:bg-transparent hover:bg-muted"
						>
							<RiHome6Line size={16} />
							Go home
						</Button>
					</Link>
					<Button
						variant="default"
						onClick={() => window.history.back()}
						className="rounded-sm border border-mainBlue bg-white dark:bg-mainBlue text-mainBlack dark:text-white hover:bg-mainBlue hover:text-white hover:dark:bg-mainBlue/30"
					>
						<RiArrowGoBackFill size={16} />
						Go back
					</Button>
				</div>
			</div>
		</main>
	);
}
