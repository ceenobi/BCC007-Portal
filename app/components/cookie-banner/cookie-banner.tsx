"use client";

import { useEffect, useState } from "react";

type CookieCategory = "essential" | "preferences" | "analytics" | "advertising";

const CookieCategories: Record<CookieCategory, string> = {
	essential:
		"Essential (Better Auth session – required for login and account access)",
	preferences: "Preferences (sidebar state, theme – remembers your choices)",
	analytics: "Analytics (helps us understand how the site is used)",
	advertising: "Advertising (delivers relevant ads across the web)",
};

export function CookieBanner() {
	const [consentedCategories, setConsentedCategories] = useState<
		CookieCategory[]
	>([]);
	const [showBanner, setShowBanner] = useState(true);

	// Check if consent was already given
	useEffect(() => {
		const stored = localStorage.getItem("bcc007-cookie-consent");
		if (stored) {
			const parsed = JSON.parse(stored) as {
				categories: CookieCategory[];
				dismissed: boolean;
			};
			if (parsed.dismissed) {
				setShowBanner(false);
			} else if (parsed.categories && parsed.categories.length > 0) {
				setConsentedCategories(parsed.categories);
				setShowBanner(false);
			}
		}
	}, []);

	// Save consent to localStorage
	useEffect(() => {
		if (consentedCategories.length > 0) {
			localStorage.setItem(
				"bcc007-cookie-consent",
				JSON.stringify({ categories: consentedCategories, dismissed: false }),
			);
		}
	}, [consentedCategories]);

	// If user dismisses without accepting, just hide banner
	const handleDismiss = () => {
		localStorage.setItem(
			"bcc007-cookie-consent",
			JSON.stringify({ categories: [], dismissed: true }),
		);
		setShowBanner(false);
	};

	// If user accepts, hide banner and save consent
	const handleAccept = (categories: CookieCategory[]) => {
		setConsentedCategories(categories);
		setShowBanner(false);
	};

	// Essential cookies are always on; preferences require consent
	const hasEssential = consentedCategories.includes("essential");
	const hasPreferences = consentedCategories.includes("preferences");

	// Build the message parts
	const essentialPart = hasEssential
		? "Essential cookies are always active to keep you signed in and secure."
		: "Essential cookies are always active to keep you signed in and secure.";
	const preferencesPart =
		hasPreferences && consentedCategories.includes("preferences")
			? "Preferences cookies are active — your theme and sidebar state are remembered."
			: hasPreferences && !consentedCategories.includes("preferences")
				? "Preferences cookies remember your theme and sidebar state. Accept above."
				: "";

	return showBanner ? (
		<div
			className="fixed bottom-4 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-border p-4 sm:p-6 shadow-lg outline outline-2 outline-offset-2 outline-lightBlue"
			aria-live="polite"
			aria-atomic="true"
		>
			<div className="max-w-7xl mx-auto">
				{/* Essential + intro text */}
				<div className="text-sm text-muted-foreground mb-3">
					<span className="font-medium text-mainBlue">{essentialPart}</span>{" "}
					This website uses cookies to enhance your experience.
				</div>

				{/* Preference toggle if not yet consented */}
				{hasPreferences && !consentedCategories.includes("preferences") && (
					<p className="mt-2 text-sm text-muted-foreground">
						{preferencesPart}
					</p>
				)}

				{/* Category options */}
				<div className="mt-4 space-y-2">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							readOnly
							className="rounded border cursor-default"
						/>
						<span>{CookieCategories.essential}</span>
					</label>

					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={hasPreferences}
							onChange={(e) =>
								setConsentedCategories(
									e.target.checked
										? ["essential", "preferences"]
										: ["essential"],
								)
							}
							className="rounded cursor-pointer"
						/>
						<span>{CookieCategories.preferences}</span>
					</label>

					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={consentedCategories.includes("analytics")}
							onChange={(e) =>
								setConsentedCategories(
									e.target.checked ? ["essential", "analytics"] : ["essential"],
								)
							}
							className="rounded cursor-pointer"
						/>
						<span>{CookieCategories.analytics}</span>
					</label>

					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={consentedCategories.includes("advertising")}
							onChange={(e) =>
								setConsentedCategories(
									e.target.checked
										? ["essential", "advertising"]
										: ["essential"],
								)
							}
							className="rounded cursor-pointer"
						/>
						<span>{CookieCategories.advertising}</span>
					</label>
				</div>

				<div className="mt-4 flex gap-3">
					<button
						type="button"
						onClick={handleDismiss}
						className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-muted-foreground hover:text-mainBlue hover:bg-muted transition-colors"
						aria-label="Reject all non-essential cookies"
					>
						Reject non-essential
					</button>
					<button
						type="button"
						onClick={() =>
							handleAccept([
								"essential",
								"preferences",
								"analytics",
								"advertising",
							])
						}
						className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white bg-mainBlue hover:bg-lightBlue hover:opacity-90 transition-colors"
						aria-label="Accept all cookies"
					>
						Accept all
					</button>
				</div>
			</div>
		</div>
	) : null;
}
