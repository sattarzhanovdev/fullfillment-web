"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAIN_COLUMNS = [
  "NEW_REQUEST",
  "AWAITING_PROCESSING",
  "PICKING",
  "PICKED",
  "PACKING",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

const SIDE_STATUSES = ["CANCELLED", "ERROR", "ITEM_NOT_FOUND", "NEEDS_PRICE", "BLOCKED_DEBT", "NEEDS_CLARIFICATION"];

interface OrderCard {
  id: string;
  orderNumber: string;
  marketplace: string;
  status: string;
  priority: string;
  deadline: string | null;
  processingCost: string | null;
  createdAt: string;
  client: { id: string; name: string };
  items: { id: string; qtyNeeded: number }[];
  assignee: { id: string; fullName: string } | null;
}

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "kanban"],
    queryFn: async () => (await apiClient.get<OrderCard[]>("/orders")).data,
    refetchInterval: 20_000,
  });

  const byStatus = useMemo(() => {
    const map: Record<string, OrderCard[]> = {};
    for (const order of data ?? []) {
      map[order.status] = map[order.status] ?? [];
      map[order.status].push(order);
    }
    return map;
  }, [data]);

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onError: (err) => setError(apiErrorMessage(err, "Переход запрещён бизнес-логикой")),
  });

  function handleDrop(status: string) {
    if (!draggingId) return;
    setError(null);
    moveMutation.mutate({ id: draggingId, status });
    setDraggingId(null);
  }

  if (isLoading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader title="Воронка / Kanban" description="Перетащите карточку в следующий статус" />

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-2.5 text-[13px] text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {SIDE_STATUSES.map((s) => (
          <Badge key={s} variant={ORDER_STATUS_VARIANT[s]}>
            {ORDER_STATUS_LABELS[s]}: {byStatus[s]?.length ?? 0}
          </Badge>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {MAIN_COLUMNS.map((status) => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status)}
            className="flex w-72 shrink-0 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-3)] p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-[12.5px] font-semibold text-[var(--color-foreground-muted)]">
                {ORDER_STATUS_LABELS[status]}
              </span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface)] px-1.5 text-[11px] font-medium text-[var(--color-foreground-muted)]">
                {byStatus[status]?.length ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {(byStatus[status] ?? []).length === 0 ? (
                <div className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-border)] py-6 text-center text-[12px] text-[var(--color-foreground-muted)]">
                  Нет заказов
                </div>
              ) : (
                (byStatus[status] ?? []).map((order) => (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={() => setDraggingId(order.id)}
                    className={cn(
                      "cursor-grab rounded-[12px] p-3 active:cursor-grabbing",
                      draggingId === order.id && "opacity-50",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[13px] font-semibold">№{order.orderNumber}</span>
                      {order.priority !== "NORMAL" && (
                        <Badge variant={order.priority === "URGENT" ? "danger" : "warning"}>{order.priority}</Badge>
                      )}
                    </div>
                    <p className="text-[12.5px] text-[var(--color-foreground-muted)]">{order.client.name}</p>
                    <p className="text-[12px] text-[var(--color-foreground-muted)]">{MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace}</p>
                    <div className="mt-2 flex items-center justify-between text-[11.5px] text-[var(--color-foreground-muted)]">
                      <span>{order.items.reduce((s, i) => s + i.qtyNeeded, 0)} шт.</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    {order.deadline && <p className="mt-1 text-[11.5px] text-[var(--color-warning)]">до {formatDate(order.deadline)}</p>}
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
