import { Link, NavLink } from "react-router";
import { useIsMobile } from "~/hooks/useIsMobile";
import type { SessionUser } from "~/types";
import { Button } from "../ui/button";
import Logo from "./logo";
import Menu from "./menu";

const links = [
	{ name: "About", href: "about" },
	{ name: "Services", href: "services" },
	{ name: "Contact", href: "/contact" },
];

export default function HomeNav({ user }: { user?: SessionUser | null }) {
	const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
	return (
		<header className="fixed w-full z-50 bg-white border-b backdrop-blur supports-backdrop-filter:bg-background/5 top-[env(safe-area-inset-top)]">
			<div className="px-4 sm:px-6 py-3 flex justify-between items-center">
				<div className="flex gap-16 items-center">
					<Logo size={8} showLogoText={true} classname="text-xl" />
					<div className="hidden md:flex gap-4 items-center">
						{links.map((link) => (
							<NavLink
								key={link.name}
								to={
									["about", "services"].includes(link.href)
										? `/#${link.href}`
										: link.href
								}
								className="cursor-pointer text-sm font-medium hover:text-mainBlue hover:dark:text-lightBlue"
							>
								{({ isActive }) => (
									<span
										className={
											isActive && link.name === "Contact"
												? "text-lightBlue"
												: ""
										}
									>
										{link.name}
									</span>
								)}
							</NavLink>
						))}
					</div>
				</div>
				{user ? (
					<div className="flex gap-3 items-center">
						<Link to="/dashboard">
							<Button size="sm" className="hidden md:block btn">
								Dashboard
							</Button>
						</Link>
						<Menu user={user} />
					</div>
				) : (
					<div className="flex gap-3 items-center">
						<Link to="/auth/login">
							<Button
								variant={isMobile ? "default" : "ghost"}
								size="sm"
								className={isMobile ? "btn" : "bg-transparent"}
							>
								Login
							</Button>
						</Link>
						<Link to="/auth/register">
							<Button size="sm" className="btn hidden md:block">
								Register
							</Button>
						</Link>
					</div>
				)}
			</div>
		</header>
	);
}
