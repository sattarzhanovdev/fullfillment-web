"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, Clock, Wallet, User, Printer, History } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
            <PrintLabelDialog orderId={id} orderNumber={order.orderNumber} />
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Приоритет"
          value={order.priority}
          icon={Flag}
          tone={order.priority === "URGENT" ? "danger" : order.priority === "HIGH" ? "warning" : "neutral"}
        />
        <StatCard label="Дедлайн" value={order.deadline ? formatDateTime(order.deadline) : "—"} icon={Clock} />
        <StatCard
          label="Стоимость обработки"
          value={order.processingCost ? formatMoney(order.processingCost) : "—"}
          icon={Wallet}
          tone="success"
        />
        <StatCard label="Ответственный" value={order.assignee?.fullName ?? "—"} icon={User} tone="accent" />
      </div>

      {error ? (
        <div className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-danger-bg)] px-4 py-2.5 text-[13px] text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
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

      <Card className="mb-6 overflow-hidden">
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
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
            <History className="h-3.5 w-3.5 text-[var(--color-foreground-muted)]" />
            История статусов
          </p>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2.5 text-[13px] first:pt-0 last:pb-0">
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

const LABEL_SIZE_PRESETS = [
  { key: "58x40", label: "58 × 40 мм (стандарт WB)", width: 58, height: 40 },
  { key: "40x30", label: "40 × 30 мм", width: 40, height: 30 },
  { key: "custom", label: "Свой размер", width: 0, height: 0 },
] as const;

type LabelPresetKey = (typeof LABEL_SIZE_PRESETS)[number]["key"];

function PrintLabelDialog({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<LabelPresetKey>("58x40");
  const [customWidth, setCustomWidth] = useState("58");
  const [customHeight, setCustomHeight] = useState("40");
  const [quantity, setQuantity] = useState("1");

  const preset = LABEL_SIZE_PRESETS.find((p) => p.key === presetKey)!;
  const width = presetKey === "custom" ? Number(customWidth) || 58 : preset.width;
  const height = presetKey === "custom" ? Number(customHeight) || 40 : preset.height;

  const labelMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.get<{ contentType: string; fileBase64: string }>(`/marketplaces/orders/${orderId}/label`, {
          params: { width, height },
        })
      ).data,
    onSuccess: (label) => {
      setError(null);
      const win = window.open("", "_blank", "width=420,height=560");
      if (!win) {
        setError("Браузер заблокировал всплывающее окно — разрешите всплывающие окна и попробуйте снова");
        return;
      }
      const count = Math.max(1, Math.min(200, Number(quantity) || 1));
      // page-break-after печатает каждую копию на отдельном "листе" — для ленточного
      // принтера этикеток это отдельная наклейка, а не N штук на одном листе.
      const imgTag = `<img src="data:${label.contentType};base64,${label.fileBase64}" style="width:100%;display:block;page-break-after:always" />`;
      win.document.write(
        `<html><head><title>Этикетка ${orderNumber}</title><style>@page{size:${width}mm ${height}mm;margin:0}body{margin:0}</style></head><body onload="window.print()">${imgTag.repeat(count)}</body></html>`,
      );
      win.document.close();
      setOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err, "Не удалось получить этикетку от маркетплейса")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Printer className="h-3.5 w-3.5" />
          Этикетка
        </Button>
      </DialogTrigger>
      <DialogContent title="Печать этикетки" description="Размер под ваш принтер этикеток и количество копий">
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="label-size">Размер этикетки</Label>
            <Select id="label-size" value={presetKey} onChange={(e) => setPresetKey(e.target.value as LabelPresetKey)}>
              {LABEL_SIZE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          {presetKey === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="label-width">Ширина, мм</Label>
                <Input id="label-width" type="number" min={10} value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="label-height">Высота, мм</Label>
                <Input id="label-height" type="number" min={10} value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
              </div>
            </div>
          ) : null}
          <div>
            <Label htmlFor="label-quantity">Количество копий</Label>
            <Input
              id="label-quantity"
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" disabled={labelMutation.isPending} onClick={() => labelMutation.mutate()}>
              {labelMutation.isPending ? "Загрузка…" : "Печать"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
