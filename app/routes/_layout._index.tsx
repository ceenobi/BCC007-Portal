import {
	RiAccountBoxLine,
	RiArrowDownSLine,
	RiArrowRightLine,
	RiCashLine,
	RiCheckLine,
	RiInstagramLine,
	RiShieldLine,
} from "@remixicon/react";
import { Link, useOutletContext } from "react-router";
import { useTheme } from "~/components/provider/theme";
import { Button } from "~/components/ui/button";
import { ImageBox } from "~/components/ui/image-box";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { buildSeoMeta, organizationSchema, websiteSchema } from "~/lib/seo";
import { cn } from "~/lib/utils";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/_layout._index";

export function meta(_args: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "BCC007 - Alumni payments, transfers and events",
			description:
				"BCC007 is the alumni community platform that helps members manage payments, transfers and events — and stay connected with old schoolmates.",
			path: "/",
			keywords: [
				"BCC007",
				"BCC007 alumni",
				"alumni community",
				"alumni payments",
				"group transfers",
				"Brilliant Child College",
			],
		}),
		organizationSchema(),
		websiteSchema(),
	];
}

const services = [
	{
		title: "Payments",
		description:
			"Manage your payments either donations or our membership fees with ease. Never forget to pay again.",
	},
	{
		title: "Never miss out on an event",
		description:
			"Get notified about all events and activities. From birthdays, anniversaries, to just regular hangouts, BCC007 will keep you updated.",
	},
	{
		title: "Ease of Use",
		description:
			"Our platform is designed to be easy to use, so you can focus on what matters most to you.",
	},
	{
		title: "Community",
		description:
			"Connect with your fellow alumni. We're building something great. Your commitment and donations will make a difference.",
	},
];

const faqs: { q: string; a: string; href?: string }[] = [
	{
		q: "What is BCC007?",
		a: "BCC007 is the official alumni platform for Brilliant Child College. It brings old students together in one place to pay dues, send money to each other, organise events and stay up to date with announcements.",
	},
	{
		q: "Who can join?",
		a: "Membership is open to all alumni of Brilliant Child College 2007 set. Register with your email, verify it, and complete a short onboarding — profile and bank details — to unlock your dashboard. Membership is invite only.",
	},
	{
		q: "How do payments work?",
		a: "Dues and contributions are processed securely through Paystack. Save your bank details once during onboarding and you can pay dues or contribute to group projects in a few clicks.",
	},
	{
		q: "Can I transfer money to other members?",
		a: "Yes. Verified members can send money directly to fellow alumni through admins from the dashboard using their saved bank accounts — no more asking for account numbers in group chats.",
	},
	{
		q: "How do I keep up with events?",
		a: "The events page lists upcoming reunions, meetings and fundraisers with RSVP tracking, while announcements and notifications keep you in the loop on everything the set is planning.",
	},
	{
		q: "Is my bank information safe?",
		a: "Yes. All connections are encrypted, bank details are confirmed via Paystack, stored securely, and every transaction is recorded in your payment history for full transparency.",
	},
	{
		q: "Need more help?",
		a: "Send us a message and a member of the team will get back to you.",
		href: "/contact",
	},
];

export default function HomeRoute() {
	const { user } = useOutletContext() as { user: SessionUser };
	const { theme } = useTheme();
	const hero = useWaveAnimation({
		threshold: 0,
		rootMargin: "0px",
		staggerDelay: 100,
		startVisible: true,
	});
	const heroCtas = useWaveAnimation({ threshold: 0, staggerDelay: 150 });
	const features = useWaveAnimation({ threshold: 0.15, staggerDelay: 100 });
	const shot = useWaveAnimation({
		threshold: 0.2,
		duration: 700,
		distance: "lg",
	});
	const servicesAnim = useWaveAnimation({ threshold: 0.1, staggerDelay: 120 });
	const about = useWaveAnimation({ threshold: 0.15, staggerDelay: 100 });
	const faq = useWaveAnimation({ threshold: 0.15, staggerDelay: 80 });
	const cta = useWaveAnimation({ threshold: 0.25, staggerDelay: 100 });

	return (
		<>
			<main className="py-10 pb-20 md:py-20 max-w-6xl mx-auto px-4">
				<div ref={heroCtas.containerRef}>
					<div
						ref={hero.containerRef}
						className="mt-20 lg:mt-40 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center"
					>
						<div className="space-y-6">
							<h1
								style={hero.getItemStyle(0)}
								className={hero.getItemClassName(
									"text-foreground text-4xl sm:text-5xl sm:leading-none font-medium w-full max-w-80 md:max-w-118.5",
								)}
							>
								Discover{" "}
								<span className="uppercase bg-linear-to-r from-lightBlue via-sky-400 to-lightBlue bg-size-[200%_auto] bg-clip-text text-transparent animate-shimmer">
									Bcc007
								</span>{" "}
								Great minds, Great feats
							</h1>
							<p
								style={hero.getItemStyle(1)}
								className={hero.getItemClassName(
									"lg:hidden text-balance text-mainGray dark:text-muted-foreground",
								)}
							>
								We are a community dedicated to preserving and promoting the
								core values and culture of our alma mater - Brilliant Child
								College. Through our platform, we connect with our fellow
								alumni, share experiences, and celebrate the achievements of our
								community.
							</p>
							<div
								style={heroCtas.getItemStyle(0)}
								className={heroCtas.getItemClassName("flex items-center gap-4")}
							>
								<Link
									to={user ? "/dashboard" : "/auth/login"}
									className="group"
								>
									<Button
										size="lg"
										className="w-full max-w-40 tracking-tight btn"
									>
										Go to dashboard
										<RiArrowRightLine
											size={18}
											className="transition-transform group-hover:translate-x-0.5"
										/>
									</Button>
								</Link>
								<Link to="/contact" className="group">
									<Button
										variant="outline"
										size="lg"
										className="w-full max-w-40 text-[14px] font-bold transition-color"
									>
										Talk to us
									</Button>
								</Link>
							</div>
						</div>
						<div
							style={heroCtas.getItemStyle(1)}
							className={heroCtas.getItemClassName(
								"hidden lg:block w-full max-w-165",
							)}
						>
							<p className="text-balance text-mainGray dark:text-muted-foreground">
								We are a community dedicated to preserving and promoting the
								core values and culture of our alma mater - Brilliant Child
								College. Through our platform, we connect with our fellow
								alumni, share experiences, and celebrate the achievements of our
								community.
							</p>
						</div>
					</div>
				</div>
				<div
					ref={features.containerRef}
					className="mt-20 grid grid-cols-12 gap-6 items-center"
				>
					<div
						style={features.getItemStyle(0)}
						className={features.getItemClassName(
							"col-span-12 lg:col-span-6 rounded-xl p-4 md:p-6 dark:bg-lightGray border border-gray-200 dark:border-gray-700 hover:shadow hover:-translate-y-1 space-y-6",
						)}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-3">
								<div className="flex gap-2 items-center">
									<RiAccountBoxLine size={22} />
									<h2 className="text-base font-medium text-mainBlack dark:text-white">
										Create an Account
									</h2>
								</div>
								<p className="w-full max-w-70 text-mainGray dark:text-muted-foreground text-sm text-balance">
									As a{" "}
									<a
										href="https://instagram.com/bcc007set"
										target="_blank"
										className="text-mainBlack dark:text-white"
										rel="noopener noreferrer"
									>
										BCC007 Alumini
									</a>
									, your experience starts by creating an account.
								</p>
								<div className="mt-6 md:mt-15 space-y-2 text-mainBlack dark:text-white">
									<div
										style={features.getItemStyle(1)}
										className={cn(
											"flex gap-1 items-center",
											features.getItemClassName(""),
										)}
									>
										<RiCheckLine className="size-5" />
										<p className="text-sm">Get Onboarded</p>
									</div>
									<div
										style={features.getItemStyle(2)}
										className={cn(
											"flex gap-1 items-center",
											features.getItemClassName(""),
										)}
									>
										<RiCheckLine className="size-5" />
										<p className="text-sm">Be active on the group</p>
									</div>
									<div
										style={features.getItemStyle(3)}
										className={cn(
											"flex gap-1 items-center",
											features.getItemClassName(""),
										)}
									>
										<RiCheckLine className="size-5" />
										<p className="text-sm">Contribute to a cause</p>
									</div>
								</div>
							</div>
							<div className="hidden md:block">
								<img
									src="/Tasks complete.svg"
									alt="todo"
									className={cn(
										"w-full h-80",
										features.isVisible && "animate-float",
									)}
									decoding="async"
								/>
							</div>
						</div>
					</div>
					<div
						style={features.getItemStyle(1)}
						className={features.getItemClassName("col-span-12 lg:col-span-6")}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="border rounded-xl p-4 md:p-6 dark:bg-lightGray border-gray-200 dark:border-gray-700 hover:shadow hover:-translate-y-1 space-y-4">
								<div className="flex gap-1 items-center">
									<RiShieldLine className="size-5" />
									<h2 className="text-base text-mainBlack dark:text-white">
										Authentication
									</h2>
								</div>
								<p className="text-mainGray dark:text-muted-foreground text-sm">
									<span className="text-mainBlack dark:text-white">
										Secure user signup and login
									</span>
									. Membership is invite only.
								</p>
								<div className="hidden md:block">
									<img
										src="/Secure-login.svg"
										alt="secure-login"
										className={cn(
											"w-full h-50",
											features.isVisible && "animate-float",
										)}
										decoding="async"
									/>
								</div>
							</div>
							<div className="border rounded-xl p-4 md:p-6 dark:bg-lightGray border-gray-200 dark:border-gray-700 hover:shadow hover:-translate-y-1 space-y-4">
								<div className="flex gap-1 items-center">
									<RiCashLine className="size-5" />
									<h2 className="text-base text-mainBlack dark:text-white">
										Make Payments
									</h2>
								</div>
								<p className="text-mainGray dark:text-muted-foreground text-sm">
									Make payments securely using{" "}
									<span className="text-mainBlack dark:text-white">
										Paystack.
									</span>{" "}
									This funds the group's activities.
								</p>
								<div className="hidden md:block">
									<img
										src="/Empty-wallet.svg"
										alt="wallet"
										className={cn(
											"w-full h-50",
											features.isVisible && "animate-float",
										)}
										decoding="async"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
			<div id="services">
				<div className="max-w-6xl mx-auto px-4 space-y-8">
					<h1 className="text-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170">
						Stay productive and updated without{" "}
						<span className="text-mainGray dark:text-muted-foreground">
							leaving the dashboard
						</span>
					</h1>
					<div
						ref={shot.containerRef}
						className="max-w-full h-auto mx-auto rounded-t-2xl perspective-[1400px]"
					>
						<div
							style={shot.getItemStyle(0)}
							className={cn(
								"origin-bottom transition-transform",
								shot.isVisible
									? "transform-[rotateX(0deg)]"
									: "transform-[rotateX(14deg)_translateY(48px)]",
							)}
						>
							<ImageBox
								src={cn(
									theme === "dark"
										? "https://res.cloudinary.com/ceenobi/image/upload/v1785358288/bcc007portal/Macbook-Air-bcc007pay.vercel.app_2_ckhb97.webp"
										: "https://res.cloudinary.com/ceenobi/image/upload/v1786282563/bcc007portal/MacBook_Pro-1786280914344_svcihz.jpg",
								)}
								width={761}
								height={420}
								alt="dashboard"
								containerClassName="border border-b-none rounded-t-2xl p-1 w-full h-full shadow-lg"
								className="rounded-t-2xl"
								decoding="async"
								quality="original"
							/>
						</div>
					</div>
				</div>
				<hr />
			</div>
			<div ref={servicesAnim.containerRef} className="relative py-20">
				<div className="absolute inset-0 z-0 opacity-50 h-full w-full bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem] animate-grid-drift" />
				<div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">
					<h1
						style={servicesAnim.getItemStyle(0)}
						className={servicesAnim.getItemClassName(
							"text-mainGray dark:text-muted-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170",
						)}
					>
						Our Services <br />
						<span className="text-mainBlack dark:text-white">
							Discover the key features of our services.
						</span>
					</h1>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{services.map((service, index) => (
							<div
								key={service.title}
								style={servicesAnim.getItemStyle(index + 1)}
								className={servicesAnim.getItemClassName(
									"bg-white dark:bg-lightGray p-6 rounded-xl border shadow hover:shadow-lg hover:-translate-y-1",
								)}
							>
								<h2 className="text-lg font-medium text-mainBlack dark:text-white">
									{service.title}
								</h2>
								<p className="text-sm text-mainGray dark:text-muted-foreground">
									{service.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
			<hr />
			<div
				ref={about.containerRef}
				className="relative py-20 overflow-x-clip"
				id="about"
			>
				<div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">
					<h1
						style={about.getItemStyle(0)}
						className={about.getItemClassName(
							"text-mainGray dark:text-muted-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170",
						)}
					>
						About us
						<br />
						<span className="text-mainBlack dark:text-white">
							Who we are? What we do?
						</span>
					</h1>
					<div className="grid grid-cols-12 gap-4">
						<div className="col-span-12 md:col-span-7">
							<div
								style={{
									...about.getItemStyle(1),
									transitionDuration: "700ms",
								}}
								className={cn(
									"w-full h-full origin-left transition-[clip-path]",
									about.isVisible
										? "[clip-path:inset(0_0%_0_0)]"
										: "[clip-path:inset(0_100%_0_0)]",
								)}
							>
								<ImageBox
									src="https://res.cloudinary.com/ceenobi/image/upload/v1761759534/BCCOO7DB/IMG_20190729_194831_680_wmq1zk.jpg"
									width={761}
									height={500}
									alt="bcc007_group"
									containerClassName="rounded-xl w-full h-full"
									className="rounded-xl"
									loading="lazy"
									decoding="async"
								/>
							</div>
						</div>
						<div
							style={about.getItemStyle(2)}
							className={cn(
								about.getItemClassName(
									"col-span-12 md:col-span-5 border border-gray-200 dark:border-gray-700 bg-[#ff4d00] p-6 rounded-xl items-center",
								),
								about.isVisible ? "translate-x-0" : "translate-x-8",
							)}
						>
							<div className="flex flex-col justify-between items-center h-full text-white">
								<p className="text-base lg:text-xl font-normal leading-snug text-balance">
									We are a community united by the values and spirit of
									Brilliant Child College — staying connected, sharing stories,
									and celebrating every achievement.
									<br /> <br /> With your regular donations and contributions,
									we strengthen our bonds, host programs that bring us together,
									and build meaningful opportunities for a brighter future.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				ref={faq.containerRef}
				className="relative py-20 overflow-x-clip"
				id="faq"
			>
				<div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">
					<h1
						style={faq.getItemStyle(0)}
						className={faq.getItemClassName(
							"text-mainGray dark:text-muted-foreground text-3xl sm:text-4xl sm:leading-none font-medium w-full max-w-170",
						)}
					>
						Questions, answered.
					</h1>
					<div className="max-w-6xl mx-auto">
						{faqs.map((item, i) => (
							<details
								key={item.q}
								open={i === 0}
								style={faq.getItemStyle(i + 1)}
								className={faq.getItemClassName(
									"group border-b border-gray-200 dark:border-gray-800",
								)}
							>
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium text-mainBlack dark:text-white [&::-webkit-details-marker]:hidden">
									{item.q}
									<RiArrowDownSLine
										size={20}
										aria-hidden
										className="shrink-0 text-mainGray dark:text-muted-foreground transition-transform duration-300 group-open:rotate-180"
									/>
								</summary>
								<p className="pb-5 text-sm leading-relaxed text-mainGray dark:text-muted-foreground">
									{item.a}{" "}
									{item.href && (
										<Link
											to={item.href}
											className="font-medium text-lightBlue hover:underline"
										>
											Reach out here
										</Link>
									)}
								</p>
							</details>
						))}
					</div>
				</div>
			</div>
			<div ref={cta.containerRef} className="relative py-20">
				<div className="max-w-6xl mx-auto px-4 space-y-4 relative z-10 text-center">
					<h1
						style={cta.getItemStyle(0)}
						className={cta.getItemClassName(
							"text-mainBlack dark:text-white text-3xl sm:text-4xl sm:leading-none font-medium w-full",
						)}
					>
						Join the community
					</h1>
					<p
						style={cta.getItemStyle(1)}
						className={cta.getItemClassName(
							"text-mainGray dark:text-muted-foreground text-base font-normal leading-snug text-balance",
						)}
					>
						Discover what our community has been up to lately.
					</p>
					<div
						style={cta.getItemStyle(2)}
						className={cta.getItemClassName("flex justify-center")}
					>
						<a
							href="https://www.instagram.com/bcc007set/"
							target="_blank"
							rel="noopener noreferrer"
							className="group relative inline-flex"
						>
							{cta.isVisible && (
								<span
									aria-hidden
									className="absolute inset-0 rounded-full border border-lightBlue/60 animate-pulse-ring"
								/>
							)}
							<Button
								variant="outline"
								className="text-mainBlack dark:text-white p-2.5 hover:bg-white/80"
							>
								Follow our community{" "}
								<RiInstagramLine className="transition-transform group-hover:rotate-12" />
							</Button>
						</a>
					</div>
				</div>
			</div>
		</>
	);
}
