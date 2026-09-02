import { RiSunFill, RiSunLine } from "@remixicon/react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { useTheme } from "./theme";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const handleThemeToggle = () => {
		const resolved =
			theme === "system"
				? window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light"
				: theme;
		setTheme(resolved === "dark" ? "light" : "dark");
	};
	return (
		<Button
			type="button"
			variant="default"
			size="icon"
			aria-label={"Toggle theme"}
			onClick={handleThemeToggle}
			className={cn(
				"fixed bottom-30 right-4 z-40 size-12 bg-lightBlue rounded-full shadow-lg transition-transform md:bottom-20 md:right-6",
				"text-white",
			)}
		>
			{theme === "dark" ? (
				<RiSunLine className="size-5" />
			) : (
				<RiSunFill className="size-5" />
			)}
		</Button>
	);
}
