import type { HealthStatus } from "~/types";

export const getHealthQuery = () => ({
  queryKey: ["health"],
  queryFn: async (): Promise<HealthStatus> => {
    const response = await fetch("/api/health", { cache: "no-store" });
    return (await response.json()) as HealthStatus;
  },
  refetchInterval: 30_000,
  staleTime: 30_000,
  retry: false,
});
