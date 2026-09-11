import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Watch a fetcher's actionData and invalidate specified query keys on success.
 *
 * Usage:
 *   useInvalidateOnSuccess(fetcher.data, [
 *     { queryKey: ["announcements"], refetchType: "all" },
 *     { queryKey: ["dashboard"] },
 *   ]);
 */
type InvalidationTarget = {
	queryKey: readonly unknown[];
	refetchType?: "active" | "all" | "inactive" | "none";
};

export function useInvalidateOnSuccess(
	actionData: { success?: boolean } | undefined,
	targets: InvalidationTarget[],
) {
	const queryClient = useQueryClient();
	const prevSuccess = useRef<boolean | undefined>(undefined);

	useEffect(() => {
		const justSucceeded = actionData?.success === true && prevSuccess.current !== true;
		prevSuccess.current = actionData?.success;

		if (justSucceeded) {
			for (const t of targets) {
				void queryClient.invalidateQueries({
					queryKey: t.queryKey,
					refetchType: t.refetchType ?? "all",
				});
			}
		}
	}, [actionData, queryClient, targets]);
}
