"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatDateTime, cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  NEW_ORDER: "Новый заказ",
  DEADLINE: "Дедлайн",
  OVERDUE: "Просрочка",
  LOW_STOCK: "Низкий остаток",
  ITEM_NOT_FOUND: "Товар не найден",
  DISCREPANCY: "Расхождение",
  DEBT: "Долг",
  LIMIT_EXCEEDED: "Превышен лимит",
  INTEGRATION_ERROR: "Ошибка интеграции",
  SUPPLY_READY: "Поставка готова",
  MARKETPLACE_ERROR: "Ошибка маркетплейса",
  NEW_DOCUMENT: "Новый документ",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => (await apiClient.get<Notification[]>("/notifications")).data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => apiClient.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Уведомления"
        description="Новые заказы, дедлайны, расхождения и другие события системы"
        actions={
          <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            Прочитать всё
          </Button>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="Уведомлений нет" />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.isRead && markRead.mutate(n.id)}
              className={cn(
                "cursor-pointer border-l-4 p-4 transition-colors",
                n.isRead ? "border-l-transparent opacity-70" : "border-l-[var(--color-accent)]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                <span className="text-[12px] text-[var(--color-foreground-muted)]">{formatDateTime(n.createdAt)}</span>
              </div>
              <p className={cn("mt-1 text-[14px]", !n.isRead && "font-semibold")}>{n.title}</p>
              <p className="mt-0.5 text-[13px] text-[var(--color-foreground-muted)]">{n.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
