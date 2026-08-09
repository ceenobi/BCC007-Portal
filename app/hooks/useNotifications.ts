import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  createdAt: string;
};

export function useNotifications() {
  const queryClient = useQueryClient();

  // Fetch unread count — polls every 30s
  const unreadCount = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count");
      const data = await res.json();
      return (data.count as number) || 0;
    },
    refetchInterval: 30_000,
  });

  // Fetch paginated notifications
  const notifications = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?page=1&limit=20");
      const data = await res.json();
      return {
        notifications: (data.notifications as NotificationItem[]) || [],
        meta: data.meta,
      };
    },
    staleTime: 60_000,
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "mark-read",
          notificationId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    unreadCount: unreadCount.data ?? 0,
    notifications: notifications.data?.notifications ?? [],
    isLoading: notifications.isLoading,
    markAsRead: markAsRead.mutate,
  };
}