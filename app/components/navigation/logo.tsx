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
		<Link to="/" className="flex gap-1 items-center w-fit" data-tour="logo">
			<img
				src="https://res.cloudinary.com/ceenobi/image/upload/c_crop,g_north_west,h_657,w_772,x_128,y_206/e_enhance/f_webp/f_auto/q_auto/bcc007portal/Gemini_Generated_Image_s6h7lfs6h7lfs6h7_pfzmnk.png"
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
