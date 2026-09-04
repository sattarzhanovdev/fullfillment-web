"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

interface Shipment {
  id: string;
  marketplace: string | null;
  scheduledAt: string;
  transport: string | null;
  driverName: string | null;
  status: string;
  boxesCount: number | null;
  totalWeightKg: string | null;
  totalVolumeL: string | null;
  warehouse: { id: string; name: string } | null;
  orders: { id: string; orderNumber: string }[];
  supplies: { id: string; supplyNumber: string }[];
}

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Планируется",
  IN_PROGRESS: "В процессе",
  SHIPPED: "Отгружено",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  OVERDUE: "Просрочено",
};

const SHIPMENT_STATUS_VARIANT: Record<string, "neutral" | "accent" | "success" | "danger"> = {
  PLANNED: "neutral",
  IN_PROGRESS: "accent",
  SHIPPED: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  OVERDUE: "danger",
};

export default function FbsShippingPage() {
  return (
    <div>
      <PageHeader title="FBS · Отгрузки" description="Формирование и учёт отгрузок FBS-заказов" actions={<CreateShipmentDialog />} />

      <Tabs defaultValue="current">
        <TabsList className="mb-5">
          <TabsTrigger value="current">Текущие</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>
        <TabsContent value="current">
          <ShipmentsTable statusParam="PLANNED,IN_PROGRESS" emptyTitle="Нет запланированных отгрузок" />
        </TabsContent>
        <TabsContent value="history">
          <ShipmentsTable statusParam="SHIPPED,COMPLETED,CANCELLED" emptyTitle="История пуста" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShipmentsTable({ statusParam, emptyTitle }: { statusParam: string; emptyTitle: string }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["shipments", statusParam],
    queryFn: async () => (await apiClient.get<Shipment[]>("/shipments", { params: { status: statusParam } })).data,
    refetchInterval: 30_000,
  });

  const { data: readyOrders } = useQuery({
    queryKey: ["orders", "READY_TO_SHIP"],
    queryFn: async () => (await apiClient.get("/orders", { params: { status: "READY_TO_SHIP" } })).data,
    enabled: !!expandedId,
  });

  const addOrderMutation = useMutation({
    mutationFn: async (params: { shipmentId: string; orderId: string }) =>
      apiClient.post(`/shipments/${params.shipmentId}/orders/${params.orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading) return <LoadingBlock />;
  if (!data || data.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <div className="flex flex-col gap-3">
      {data.map((shipment) => (
        <Card key={shipment.id} className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold">{formatDateTime(shipment.scheduledAt)}</p>
              <p className="text-[12.5px] text-[var(--color-foreground-muted)]">
                {shipment.warehouse?.name ?? "Склад не указан"} · {shipment.marketplace ? MARKETPLACE_LABELS[shipment.marketplace] : "Разные МП"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[12.5px] text-[var(--color-foreground-muted)]">
              <span>{shipment.orders.length} заказов</span>
              <span>{shipment.boxesCount ?? 0} кор.</span>
              <span>{shipment.totalWeightKg ?? 0} кг</span>
              <span>{shipment.totalVolumeL ?? 0} л</span>
            </div>
            <Badge variant={SHIPMENT_STATUS_VARIANT[shipment.status]}>{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>
            <Button size="sm" variant="secondary" onClick={() => setExpandedId(expandedId === shipment.id ? null : shipment.id)}>
              {expandedId === shipment.id ? "Скрыть" : "Заказы"}
            </Button>
          </CardContent>

          {expandedId === shipment.id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              {shipment.orders.length === 0 ? (
                <p className="mb-3 text-[13px] text-[var(--color-foreground-muted)]">Заказы ещё не добавлены</p>
              ) : (
                <div className="mb-3 flex flex-wrap gap-2">
                  {shipment.orders.map((o) => (
                    <Badge key={o.id}>№{o.orderNumber}</Badge>
                  ))}
                </div>
              )}
              <AddOrderRow
                options={(readyOrders ?? []).filter((o: any) => !shipment.orders.some((so) => so.id === o.id))}
                onAdd={(orderId) => addOrderMutation.mutate({ shipmentId: shipment.id, orderId })}
                pending={addOrderMutation.isPending}
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function AddOrderRow({
  options,
  onAdd,
  pending,
}: {
  options: { id: string; orderNumber: string }[];
  onAdd: (orderId: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onChange={(e) => setValue(e.target.value)} className="max-w-xs">
        <option value="">Добавить заказ (готов к отгрузке)</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            №{o.orderNumber}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={!value || pending}
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
      >
        Добавить
      </Button>
    </div>
  );
}

function CreateShipmentDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get("/warehouses")).data,
    enabled: open,
  });

  const [form, setForm] = useState({ warehouseId: "", scheduledAt: "", transport: "", driverName: "" });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/shipments", {
        marketplace: "WILDBERRIES",
        warehouseId: form.warehouseId || undefined,
        scheduledAt: form.scheduledAt,
        transport: form.transport || undefined,
        driverName: form.driverName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      setOpen(false);
      setForm({ warehouseId: "", scheduledAt: "", transport: "", driverName: "" });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Создать отгрузку
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая отгрузка" description="Заказы можно добавить после создания">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="scheduledAt">Дата и время</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="warehouseId">Склад</Label>
            <Select id="warehouseId" value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
              <option value="">Не указан</option>
              {warehouses?.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="marketplace">Маркетплейс</Label>
            <Input id="marketplace" value="Wildberries" disabled />
          </div>
          <div>
            <Label htmlFor="transport">Транспорт</Label>
            <Input id="transport" value={form.transport} onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="driverName">Водитель</Label>
            <Input id="driverName" value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Создаём…" : "Создать отгрузку"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
