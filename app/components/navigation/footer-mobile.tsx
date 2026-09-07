import { RiHomeFill, RiMegaphoneFill, RiWalletFill } from "@remixicon/react";
import { Link, useLocation } from "react-router";
import { getOptimizedImageUrl } from "~/lib/cloudinary";
import { getInitials } from "~/lib/utils";
import type { SessionUser } from "~/types";
import { Button } from "../ui/button";

export default function FooterMobile({ user }: { user: SessionUser }) {
	const location = useLocation();
	const isActive = (path: string | string[]) => {
		const paths = Array.isArray(path) ? path : [path];
		return paths.some((p) => location.pathname === p);
	};

	return (
		<div className="md:hidden fixed w-[50%] z-50 left-1/2 -translate-x-1/2 bottom-6 border rounded-full bg-white dark:bg-bgDark  backdrop-blur supports-backdrop-filter:bg-white/90 shadow-lg">
			<div className="max-w-full mx-auto flex justify-around items-center py-2 pr-3">
				<Button
					variant="ghost"
					size="lg"
					className={isActive("/dashboard") ? "text-lightBlue" : ""}
					render={<Link to="/dashboard" />}
				>
					<RiHomeFill className="size-6" />
					{isActive("/dashboard") && <span className="sr-only">Active</span>}
				</Button>
				<Button
					variant="ghost"
					size="lg"
					className={
						isActive([
							"/dashboard/payments",
							"/dashboard/payments/group",
							"/dashboard/payments/reports",
						])
							? "text-lightBlue"
							: ""
					}
					render={<Link to="/dashboard/payments" />}
				>
					<RiWalletFill className="size-6" />
					{isActive("/dashboard/payments") && (
						<span className="sr-only">Active</span>
					)}
				</Button>
				<Button
					variant="ghost"
					size="lg"
					className={
						isActive("/dashboard/announcements") ? "text-lightBlue" : ""
					}
					render={<Link to="/dashboard/announcements" />}
				>
					<RiMegaphoneFill className="size-6" />
					{isActive("/dashboard/announcements") && (
						<span className="sr-only">Active</span>
					)}
				</Button>
				<Button
					variant="ghost"
					className="cursor-pointer relative h-8 w-8 p-0 rounded-full border border-mainGray/70"
					aria-label="Profile menu"
					data-tour="profile"
				>
					<Link to="/dashboard/account">
						{user?.image ? (
							<img
								className="h-8 w-8 object-cover transition-colors rounded-full border border-mainGray/70"
								src={getOptimizedImageUrl(user?.image, 32)}
								alt={`${user?.name}'s avatar`}
								loading="lazy"
								width={32}
								height={32}
							/>
						) : (
							<span className="w-8 h-8 transition-colors border border-mainGray/70 dark:border-darkBlue flex items-center justify-center rounded-full bg-white dark:bg-black">
								{getInitials(user?.name)}
							</span>
						)}
					</Link>
				</Button>
			</div>
		</div>
	);
}
