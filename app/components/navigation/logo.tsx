import { Link } from "react-router";

export default function Logo({
	classname,
	size,
	showLogoText = false,
}: {
	classname?: string;
	size?: number;
	showLogoText?: boolean;
}) {
	return (
		<Link to="/" prefetch="intent" className="flex gap-1 items-center w-fit" data-tour="logo">
			<img
				src="/bcc007paylogo.webp"
				alt="BCC007_Logo"
				className={`rounded-full ${size ? `w-${size} h-${size}` : ""}`}
			/>
			{showLogoText && (
				<h2
					className={`${classname} italics font-bold leading-tight tracking-tighter text-mainBlack dark:text-white`}
				>
					BCC007
				</h2>
			)}
		</Link>
	);
}
