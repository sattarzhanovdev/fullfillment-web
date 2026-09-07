"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { ORDER_STATUS_LABELS, MARKETPLACE_LABELS } from "@/lib/status";
import { formatDateTime, formatMoney } from "@/lib/utils";

interface OrderDetail {
  id: string;
  orderNumber: string;
  marketplace: string;
  status: string;
  priority: string;
  deadline: string | null;
  processingCost: string | null;
  deliveryCost: string | null;
  createdAt: string;
  client: { id: string; name: string };
  assignee: { id: string; fullName: string } | null;
  packagingType: { id: string; name: string } | null;
  items: {
    id: string;
    qtyNeeded: number;
    qtyPicked: number;
    qtyPacked: number;
    notFound: boolean;
    product: { id: string; name: string; article: string; barcode: string };
  }[];
  statusHistory: { id: string; status: string; createdAt: string; userId: string | null }[];
}

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS);

export default function FbsOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [packagingTypeId, setPackagingTypeId] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => (await apiClient.get<OrderDetail>(`/orders/${id}`)).data,
  });

  const { data: packagingTypes } = useQuery({
    queryKey: ["packaging"],
    queryFn: async () => (await apiClient.get("/packaging", { params: { activeOnly: "true" } })).data,
  });

  const statusMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/orders/${id}/status`, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      setError(null);
      setNextStatus("");
    },
    onError: (err) => setError(apiErrorMessage(err, "Переход запрещён бизнес-логикой")),
  });

  const packagingMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/orders/${id}/packaging`, { packagingTypeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const labelMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.get<{ contentType: string; fileBase64: string }>(`/marketplaces/orders/${id}/label`)).data,
    onSuccess: (label) => {
      setError(null);
      const win = window.open("", "_blank", "width=420,height=520");
      if (!win) {
        setError("Браузер заблокировал всплывающее окно — разрешите всплывающие окна и попробуйте снова");
        return;
      }
      win.document.write(
        `<html><head><title>Этикетка ${order?.orderNumber ?? ""}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff"><img src="data:${label.contentType};base64,${label.fileBase64}" style="max-width:100%" onload="window.print()" /></body></html>`,
      );
      win.document.close();
    },
    onError: (err) => setError(apiErrorMessage(err, "Не удалось получить этикетку от маркетплейса")),
  });

  if (isLoading || !order) return <LoadingBlock />;

  return (
    <div>
      <Link
        href="/fbs/orders"
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Заказы
      </Link>

      <PageHeader
        title={`Заказ №${order.orderNumber}`}
        description={`${MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace} · ${order.client.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={labelMutation.isPending}
              onClick={() => labelMutation.mutate()}
            >
              <Printer className="h-3.5 w-3.5" />
              {labelMutation.isPending ? "Загрузка…" : "Этикетка"}
            </Button>
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-[12px] text-[var(--color-foreground-muted)]">Приоритет</div>
          <div className="mt-1 text-[16px] font-semibold">{order.priority}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-[var(--color-foreground-muted)]">Дедлайн</div>
          <div className="mt-1 text-[16px] font-semibold">{order.deadline ? formatDateTime(order.deadline) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-[var(--color-foreground-muted)]">Стоимость обработки</div>
          <div className="mt-1 text-[16px] font-semibold">{order.processingCost ? formatMoney(order.processingCost) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-[var(--color-foreground-muted)]">Ответственный</div>
          <div className="mt-1 text-[16px] font-semibold">{order.assignee?.fullName ?? "—"}</div>
        </Card>
      </div>

      {error ? (
        <div className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-danger-bg)] px-4 py-2.5 text-[13px] text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="mb-2 text-[13px] font-medium">Изменить статус</p>
            <div className="flex items-center gap-2">
              <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="flex-1">
                <option value="">Выберите статус</option>
                {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                disabled={!nextStatus || statusMutation.isPending}
                onClick={() => statusMutation.mutate()}
              >
                Применить
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-2 text-[13px] font-medium">Упаковка{order.packagingType ? `: ${order.packagingType.name}` : ""}</p>
            <div className="flex items-center gap-2">
              <Select value={packagingTypeId} onChange={(e) => setPackagingTypeId(e.target.value)} className="flex-1">
                <option value="">Выберите тип упаковки</option>
                {packagingTypes?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!packagingTypeId || packagingMutation.isPending}
                onClick={() => packagingMutation.mutate()}
              >
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5 overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Товар</Th>
              <Th>Артикул</Th>
              <Th>Штрихкод</Th>
              <Th>Нужно</Th>
              <Th>Собрано</Th>
              <Th>Упаковано</Th>
              <Th>Статус</Th>
            </tr>
          </Thead>
          <tbody>
            {order.items.map((item) => (
              <Tr key={item.id}>
                <Td className="font-medium">{item.product.name}</Td>
                <Td>{item.product.article}</Td>
                <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                <Td>{item.qtyNeeded}</Td>
                <Td>{item.qtyPicked}</Td>
                <Td>{item.qtyPacked}</Td>
                <Td>{item.notFound ? <Badge variant="danger">Не найден</Badge> : <Badge variant="success">В порядке</Badge>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-3 text-[13px] font-medium">История статусов</p>
          <div className="flex flex-col gap-2">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-[13px] last:border-0">
                <OrderStatusBadge status={h.status} />
                <span className="text-[12px] text-[var(--color-foreground-muted)]">{formatDateTime(h.createdAt)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
