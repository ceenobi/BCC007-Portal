import { Outlet } from "react-router";
import Logo from "~/components/navigation/logo";
import { PageWrapper } from "~/components/provider/page-wrapper";
import { guestOnlyMiddleware } from "~/middleware/auth.middleware";

export const middleware = [guestOnlyMiddleware];

export async function loader() {
	return null;
}

export default function AuthLayout() {
	return (
		<div className="grid grid-cols-12 min-h-screen items-center">
			<div className="relative hidden lg:block col-span-12 lg:col-span-7 h-screen">
				<div className="absolute inset-0 z-0 opacity-50  h-full w-full bg-white dark:bg-bgDark bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem]" />
				<div className="relative z-5 flex justify-center items-center h-full">
					<div className="w-full max-w-100 xl:max-w-150 mx-auto">
						<h1 className="text-2xl xl:text-4xl font-normal">
							"Being a member of{" "}
							<span className="bg-linear-to-r from-lightBlue via-sky-400 to-lightBlue bg-size-[200%_auto] bg-clip-text text-transparent animate-shimmer font-bold">
								BCC007
							</span>{" "}
							involves commitment to upholding the values and as well as active
							paticipation of all statutory obligations expected."
						</h1>
					</div>
				</div>
			</div>
			<div className="col-span-12 lg:col-span-5 border-l h-full shadow-md overflow-auto">
				<div className="w-full md:max-w-120 mx-auto mt-10 px-4 h-full">
					<Logo size={8} showLogoText={true} classname="text-xl" />
					<PageWrapper className="py-10 space-y-6 flex flex-col h-full justify-center items-center">
						<Outlet />
					</PageWrapper>
				</div>
			</div>
		</div>
	);
}
