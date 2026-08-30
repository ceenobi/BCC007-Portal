import {
	RiCheckDoubleFill,
	RiNotificationFill,
	RiNotificationOffFill,
} from "@remixicon/react";
import { useNotifications } from "~/hooks/useNotifications";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";

export default function Notification() {
	const { unreadCount, notifications, isLoading, markAsRead } =
		useNotifications();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative h-8 w-8 cursor-pointer"
						data-tour="notifications"
					>
						{unreadCount > 0 ? (
							<RiNotificationFill className="text-mainBlue dark:text-lightBlue/80 h-[1.2rem] w-[1.2rem]" />
						) : (
							<RiNotificationOffFill className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
						)}
						{unreadCount > 0 && (
							<Badge className="bg-mainBlue dark:bg-lightBlue dark:text-white absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] rounded-full">
								{unreadCount > 99 ? "99+" : unreadCount}
							</Badge>
						)}
						<span className="sr-only">Notifications</span>
					</Button>
				}
			/>
			<DropdownMenuGroup>
				<DropdownMenuContent
					align="end"
					className="w-[97vw] sm:w-96 p-0 dark:bg-lightGray border max-h-[68dvh] flex flex-col"
				>
					<div className="p-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
						<h4 className="font-semibold text-base">Notifications</h4>
						{unreadCount > 0 && (
							<button
								type="button"
								onClick={() => markAsRead(undefined)}
								className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
							>
								<RiCheckDoubleFill size={14} />
								Mark all read
							</button>
						)}
					</div>

					<div className="overflow-y-auto flex-1">
						{isLoading ? (
							<div className="p-4 space-y-3">
								{[...Array(3)].map((_, i) => (
									<div key={i} className="flex gap-3">
										<Skeleton className="size-8 rounded-full shrink-0" />
										<div className="flex-1 space-y-1.5">
											<Skeleton className="h-3.5 w-40" />
											<Skeleton className="h-3 w-full" />
										</div>
									</div>
								))}
							</div>
						) : notifications.length === 0 ? (
							<div className="p-8 text-center text-sm text-muted-foreground">
								<RiNotificationOffFill
									size={28}
									className="mx-auto mb-2 text-muted-foreground/50"
								/>
								No notifications yet
							</div>
						) : (
							<div className="divide-y divide-border/50" aria-live="polite">
								{notifications.slice(0, 10).map((notif) => (
									<button
										type="button"
										key={notif._id}
										onClick={() => {
											if (!notif.read) markAsRead(notif._id);
										}}
										className={`w-full text-left p-3.5 transition-colors hover:bg-muted/30 ${
											!notif.read ? "bg-muted/20" : ""
										}`}
									>
										<div className="flex items-start gap-3">
											<div
												className={`size-2 rounded-full mt-1.5 shrink-0 ${
													!notif.read
														? "bg-mainBlue dark:bg-lightBlue"
														: "bg-transparent"
												}`}
											/>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-foreground truncate">
													{notif.title}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
													{notif.message}
												</p>
												<p className="text-[10px] text-muted-foreground/60 mt-1">
													{formatRelativeTime(notif.createdAt)}
												</p>
											</div>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenuGroup>
		</DropdownMenu>
	);
}

function formatRelativeTime(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diffMs = now - then;
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;

	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 7) return `${diffDay}d ago`;

	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}
