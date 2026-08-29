import {
	RiAccountBoxLine,
	RiArrowRightLine,
	RiCalendarLine,
	RiCashLine,
	RiCheckLine,
	RiDoubleQuotesL,
	RiGroupLine,
	RiInstagramLine,
	RiShieldLine,
	RiSparklingLine,
	RiStarFill,
	RiThumbUpLine,
} from "@remixicon/react";
import { Link, useOutletContext } from "react-router";
import { useTheme } from "~/components/provider/theme";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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

const serviceIcons = [RiCashLine, RiCalendarLine, RiThumbUpLine, RiGroupLine];

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

const impactStats = [
	{ value: "2007", label: "Set · Brilliant Child College" },
	{ value: "₦10M+", label: "Raised for the set" },
	{ value: "120+", label: "Events hosted" },
	{ value: "300+", label: "Active members" },
];

const testimonials = [
	{
		quote:
			"BCC007 made it effortless to stay in touch with my classmates and contribute to our projects. The payments just work.",
		name: "Adaeze O.",
		role: "Class of 2007",
		initials: "AO",
	},
	{
		quote:
			"I never miss an event now. The notifications and RSVPs keep our set connected across cities.",
		name: "Tunde B.",
		role: "Class of 2007",
		initials: "TB",
	},
	{
		quote:
			"Sending money to a fellow alum takes seconds. No more chasing account numbers in group chats.",
		name: "Ngozi E.",
		role: "Class of 2007",
		initials: "NE",
	},
];

const eyebrow =
	"text-xs font-semibold uppercase tracking-[0.2em] text-lightBlue";

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
	const statsAnim = useWaveAnimation({ threshold: 0.2, staggerDelay: 100 });
	const testimonialsAnim = useWaveAnimation({
		threshold: 0.1,
		staggerDelay: 120,
	});
	const faq = useWaveAnimation({ threshold: 0.15, staggerDelay: 80 });
	const cta = useWaveAnimation({ threshold: 0.25, staggerDelay: 100 });

	return (
		<>
			<main className="relative pb-20 pt-10 md:pt-20 mx-auto max-w-6xl px-4">
				<div
					aria-hidden
					className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-lightBlue/15 blur-3xl"
				/>
				<div ref={hero.containerRef}>
					<div className="mt-16 grid grid-cols-1 items-center gap-12 lg:mt-28 lg:grid-cols-2">
						<div className="space-y-6">
							<Badge
								variant="outline"
								style={hero.getItemStyle(0)}
								className={cn(
									hero.getItemClassName(""),
									"gap-1.5 border-lightBlue/30 bg-lightBlue/10 text-lightBlue",
								)}
							>
								<RiSparklingLine size={14} /> Alumni community platform
							</Badge>
							<h1
								style={hero.getItemStyle(1)}
								className={hero.getItemClassName(
									"text-foreground text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-none md:max-w-xl",
								)}
							>
								Discover{" "}
								<span className="uppercase bg-linear-to-r from-lightBlue via-sky-400 to-lightBlue bg-size-[200%_auto] bg-clip-text text-transparent animate-shimmer">
									Bcc007
								</span>{" "}
								— great minds, great feats
							</h1>
							<p
								style={hero.getItemStyle(2)}
								className={hero.getItemClassName(
									"max-w-md text-balance text-mainGray dark:text-muted-foreground",
								)}
							>
								We are a community dedicated to preserving and promoting the
								core values and culture of our alma mater — Brilliant Child
								College. Connect with fellow alumni, share experiences, and
								celebrate the achievements of our community.
							</p>
							<div
								style={heroCtas.getItemStyle(0)}
								className={heroCtas.getItemClassName(
									"flex flex-wrap items-center gap-4",
								)}
							>
								<Link
									to={user ? "/dashboard" : "/auth/login"}
									className="group"
								>
									<Button
										size="lg"
										className="h-12 gap-1.5 px-6 tracking-tight btn"
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
										className="h-12 gap-1.5 px-6 text-[14px] font-semibold transition-colors"
									>
										Talk to us
									</Button>
								</Link>
							</div>
						</div>
						<div
							style={heroCtas.getItemStyle(1)}
							className={heroCtas.getItemClassName("relative")}
						>
							<div
								aria-hidden
								className="absolute -inset-8 -z-10 rounded-full bg-lightBlue/20 blur-3xl"
							/>
							<ImageBox
								src={cn(
									theme === "dark"
										? "https://res.cloudinary.com/ceenobi/image/upload/v1785358288/bcc007portal/Macbook-Air-bcc007pay.vercel.app_2_ckhb97.webp"
										: "https://res.cloudinary.com/ceenobi/image/upload/v1786282563/bcc007portal/MacBook_Pro-1786280914344_svcihz.jpg",
								)}
								width={761}
								height={420}
								alt="BCC007 dashboard"
								containerClassName="rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-lightBlue/10"
								className="rounded-xl"
								decoding="async"
								quality="original"
							/>
							<div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg">
								<RiStarFill className="size-4 text-lightBlue" />
								<span className="font-semibold text-mainBlack dark:text-white">
									4.9
								</span>
								<span className="text-mainGray dark:text-muted-foreground">
									member rating
								</span>
							</div>
						</div>
					</div>
				</div>
				<div
					ref={features.containerRef}
					className="mt-24 grid grid-cols-12 gap-6"
				>
					<div
						style={features.getItemStyle(0)}
						className={features.getItemClassName(
							"col-span-12 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-8 lg:col-span-6",
						)}
					>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<span className="flex size-10 items-center justify-center rounded-xl bg-lightBlue/10 text-lightBlue">
										<RiAccountBoxLine size={22} />
									</span>
									<h2 className="text-lg font-semibold text-mainBlack dark:text-white">
										Create an Account
									</h2>
								</div>
								<p className="max-w-sm text-sm text-balance text-mainGray dark:text-muted-foreground">
									As a{" "}
									<a
										href="https://instagram.com/bcc007set"
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-lightBlue hover:underline"
									>
										BCC007 Alumni
									</a>
									, your experience starts by creating an account.
								</p>
								<ul className="space-y-2 text-mainBlack dark:text-white">
									{[
										"Get Onboarded",
										"Be active on the group",
										"Contribute to a cause",
									].map((text, i) => (
										<li
											key={text}
											style={features.getItemStyle(i + 1)}
											className={cn(
												"flex items-center gap-2",
												features.getItemClassName(""),
											)}
										>
											<RiCheckLine className="size-5 text-lightBlue" />
											<span className="text-sm">{text}</span>
										</li>
									))}
								</ul>
							</div>
							<div className="hidden md:block">
								<img
									src="/Tasks complete.svg"
									alt="todo"
									className={cn(
										"h-80 w-full",
										features.isVisible && "animate-float",
									)}
									decoding="async"
								/>
							</div>
						</div>
					</div>
					<div
						style={features.getItemStyle(1)}
						className={features.getItemClassName(
							"col-span-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-6",
						)}
					>
						<div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
							<span className="flex size-10 items-center justify-center rounded-xl bg-lightBlue/10 text-lightBlue">
								<RiShieldLine className="size-5" />
							</span>
							<h2 className="text-lg font-semibold text-mainBlack dark:text-white">
								Authentication
							</h2>
							<p className="text-sm text-mainGray dark:text-muted-foreground">
								<span className="font-medium text-mainBlack dark:text-white">
									Secure user signup and login
								</span>
								. Membership is invite only.
							</p>
							<div className="hidden md:block">
								<img
									src="/Secure-login.svg"
									alt="secure-login"
									className={cn(
										"h-50 w-full",
										features.isVisible && "animate-float",
									)}
									decoding="async"
								/>
							</div>
						</div>
						<div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
							<span className="flex size-10 items-center justify-center rounded-xl bg-lightBlue/10 text-lightBlue">
								<RiCashLine className="size-5" />
							</span>
							<h2 className="text-lg font-semibold text-mainBlack dark:text-white">
								Make Payments
							</h2>
							<p className="text-sm text-mainGray dark:text-muted-foreground">
								Make payments securely using{" "}
								<span className="font-medium text-mainBlack dark:text-white">
									Paystack.
								</span>{" "}
								This funds the group's activities.
							</p>
							<div className="hidden md:block">
								<img
									src="/Empty-wallet.svg"
									alt="wallet"
									className={cn(
										"h-50 w-full",
										features.isVisible && "animate-float",
									)}
									decoding="async"
								/>
							</div>
						</div>
					</div>
				</div>
			</main>
			<div id="services">
				<div className="mx-auto max-w-6xl space-y-8 px-4">
					<div>
						<p className={eyebrow}>Dashboard</p>
						<h1 className="mt-2 w-full max-w-170 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-none">
							Stay productive and updated without{" "}
							<span className="text-mainGray dark:text-muted-foreground">
								leaving the dashboard
							</span>
						</h1>
					</div>
					<div
						ref={shot.containerRef}
						className="mx-auto max-w-full h-auto rounded-t-2xl perspective-[1400px]"
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
								containerClassName="rounded-t-2xl border border-b-none border-border p-1 w-full h-full shadow-2xl shadow-lightBlue/10"
								className="rounded-t-2xl"
								decoding="async"
								quality="original"
							/>
						</div>
					</div>
				</div>
				<hr className="border-border/60" />
			</div>
			<div ref={servicesAnim.containerRef} className="relative py-20">
				<div className="absolute inset-0 -z-0 h-full w-full opacity-50 bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem] animate-grid-drift" />
				<div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4">
					<h1
						style={servicesAnim.getItemStyle(0)}
						className={servicesAnim.getItemClassName(
							"w-full max-w-170 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-none",
						)}
					>
						Our Services <br />
						<span className="text-mainGray dark:text-muted-foreground">
							Discover the key features of our services.
						</span>
					</h1>
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
						{services.map((service, index) => {
							const Icon = serviceIcons[index];
							return (
								<div
									key={service.title}
									style={servicesAnim.getItemStyle(index + 1)}
									className={servicesAnim.getItemClassName(
										"group/service flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
									)}
								>
									<span className="flex size-11 items-center justify-center rounded-xl bg-lightBlue/10 text-lightBlue">
										<Icon className="size-5" />
									</span>
									<div className="flex items-start justify-between gap-4">
										<h2 className="text-lg font-semibold text-mainBlack dark:text-white">
											{service.title}
										</h2>
										<RiArrowRightLine className="size-5 shrink-0 text-mainGray transition-transform group-hover/service:translate-x-1 dark:text-muted-foreground" />
									</div>
									<p className="text-sm text-mainGray dark:text-muted-foreground">
										{service.description}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<hr className="border-border/60" />
			<div ref={statsAnim.containerRef} className="relative py-16">
				<div className="mx-auto max-w-6xl px-4">
					<div
						style={statsAnim.getItemStyle(0)}
						className={statsAnim.getItemClassName(
							"relative overflow-hidden rounded-3xl bg-mainBlue px-6 py-12 text-white shadow-xl sm:px-12",
						)}
					>
						<div
							aria-hidden
							className="absolute -right-10 -top-10 size-56 rounded-full bg-lightBlue/20 blur-3xl"
						/>
						<div className="relative grid grid-cols-2 gap-8 text-center md:grid-cols-4">
							{impactStats.map((stat, i) => (
								<div
									key={stat.label}
									style={statsAnim.getItemStyle(i + 1)}
									className={statsAnim.getItemClassName("space-y-1")}
								>
									<div className="text-3xl font-semibold text-lightBlue sm:text-4xl">
										{stat.value}
									</div>
									<div className="text-sm text-white/70">{stat.label}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
			<hr className="border-border/60" />
			<div
				ref={about.containerRef}
				className="relative overflow-x-clip py-20"
				id="about"
			>
				<div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4">
					<h1
						style={about.getItemStyle(0)}
						className={about.getItemClassName(
							"w-full max-w-170 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-none",
						)}
					>
						About us
						<br />
						<span className="text-mainGray dark:text-muted-foreground">
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
									"h-full w-full origin-left transition-[clip-path]",
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
									containerClassName="h-full w-full rounded-xl"
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
									"col-span-12 flex items-center rounded-xl border border-brandOrange bg-brandOrange p-6 md:col-span-5",
								),
								about.isVisible ? "translate-x-0" : "translate-x-8",
							)}
						>
							<div className="flex h-full flex-col justify-between gap-4 text-white">
								<RiDoubleQuotesL className="size-8 text-white/80" />
								<p className="text-balance text-base font-normal leading-snug lg:text-xl">
									We are a community united by the values and spirit of
									Brilliant Child College — staying connected, sharing stories,
									and celebrating every achievement.
									<br />
									<br /> With your regular donations and contributions, we
									strengthen our bonds, host programs that bring us together,
									and build meaningful opportunities for a brighter future.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				ref={testimonialsAnim.containerRef}
				className="relative bg-lightBlue/5 py-20"
			>
				<div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4">
					<div>
						<p className={eyebrow}>Testimonials</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
							Loved by the set
						</h1>
					</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
						{testimonials.map((t, i) => (
							<Card
								key={t.name}
								style={testimonialsAnim.getItemStyle(i)}
								className={testimonialsAnim.getItemClassName(
									"p-6 transition hover:-translate-y-1 hover:shadow-lg",
								)}
							>
								<RiDoubleQuotesL className="size-7 text-lightBlue/60" />
								<p className="mt-3 text-sm leading-relaxed text-mainGray dark:text-muted-foreground">
									{t.quote}
								</p>
								<div className="mt-5 flex items-center gap-3">
									<Avatar className="size-10">
										<AvatarFallback className="bg-lightBlue/10 text-lightBlue">
											{t.initials}
										</AvatarFallback>
									</Avatar>
									<div>
										<div className="text-sm font-medium text-mainBlack dark:text-white">
											{t.name}
										</div>
										<div className="text-xs text-mainGray dark:text-muted-foreground">
											{t.role}
										</div>
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>
			</div>
			<div ref={faq.containerRef} className="relative py-20" id="faq">
				<div className="relative z-10 mx-auto max-w-3xl space-y-8 px-4">
					<div>
						<p className={eyebrow}>FAQ</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
							Questions, answered.
						</h1>
					</div>
					<Accordion defaultValue={[faqs[0].q]}>
						{faqs.map((item, i) => (
							<AccordionItem
								key={item.q}
								value={item.q}
								style={faq.getItemStyle(i + 1)}
								className={faq.getItemClassName("")}
							>
								<AccordionTrigger>{item.q}</AccordionTrigger>
								<AccordionContent>
									{item.a}{" "}
									{item.href && (
										<Link
											to={item.href}
											className="font-medium text-lightBlue hover:underline"
										>
											Reach out here
										</Link>
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</div>
			<div ref={cta.containerRef} className="relative py-20">
				<div className="relative z-10 mx-auto max-w-6xl space-y-4 px-4 text-center">
					<h1
						style={cta.getItemStyle(0)}
						className={cta.getItemClassName(
							"w-full text-3xl font-semibold tracking-tight text-mainBlack dark:text-white sm:text-4xl sm:leading-none",
						)}
					>
						Join the community
					</h1>
					<p
						style={cta.getItemStyle(1)}
						className={cta.getItemClassName(
							"text-balance text-base font-normal leading-snug text-mainGray dark:text-muted-foreground",
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
									className="absolute inset-0 animate-pulse-ring rounded-full border border-lightBlue/60"
								/>
							)}
							<Button
								variant="outline"
								className="p-2.5 text-mainBlack hover:bg-white/80 dark:text-white"
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
