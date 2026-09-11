"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Truck, Barcode } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Subcard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateShipmentDialog } from "@/components/shipments/create-shipment-dialog";
import { PrintShipmentBarcodeDialog } from "@/components/shipments/print-shipment-barcode-dialog";
import { WbShippingMethodDialog } from "@/components/shipments/wb-shipping-method-dialog";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

interface Shipment {
  id: string;
  barcode: string;
  wbSupplyId: string | null;
  wbShippingPointId: number | null;
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
      <PageHeader
        title="FBS · Отгрузки"
        description="Формирование и учёт отгрузок FBS-заказов"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href="/fbs/shipping/scan">
                <ScanLine className="h-4 w-4" />
                Сканирование
              </Link>
            </Button>
            <CreateShipmentDialog />
          </div>
        }
      />

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
  const [wbWarning, setWbWarning] = useState<string | null>(null);

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
      apiClient.post<{ wbWarning: string | null }>(`/shipments/${params.shipmentId}/orders/${params.orderId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setWbWarning(res.data.wbWarning);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { shipmentId: string; status: string }) =>
      apiClient.patch(`/shipments/${params.shipmentId}`, { status: params.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
  });

  if (isLoading) return <LoadingBlock />;
  if (!data || data.length === 0) return <EmptyState icon={Truck} title={emptyTitle} description="Отгрузки появятся здесь после создания" />;

  return (
    <div className="flex flex-col gap-3">
      {data.map((shipment) => (
        <Card key={shipment.id} className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="min-w-[160px]">
              <p className="text-[14px] font-semibold">{formatDateTime(shipment.scheduledAt)}</p>
              <p className="text-[12.5px] text-[var(--color-foreground-muted)]">
                {shipment.warehouse?.name ?? "Склад не указан"} · {shipment.marketplace ? MARKETPLACE_LABELS[shipment.marketplace] : "Разные МП"}
              </p>
              <p className="mt-1 flex items-center gap-1 font-mono text-[12px] text-[var(--color-foreground-muted)]">
                <Barcode className="h-3 w-3" /> {shipment.barcode}
              </p>
            </div>

            <Subcard className="flex items-center gap-3 px-3.5 py-2 text-[12.5px] text-[var(--color-foreground-muted)]">
              <span>
                <strong className="text-[var(--color-foreground)]">{shipment.orders.length}</strong> заказов
              </span>
              <span className="h-3 w-px bg-[var(--color-border)]" />
              <span>{shipment.boxesCount ?? 0} кор.</span>
              <span className="h-3 w-px bg-[var(--color-border)]" />
              <span>{shipment.totalWeightKg ?? 0} кг</span>
              <span className="h-3 w-px bg-[var(--color-border)]" />
              <span>{shipment.totalVolumeL ?? 0} л</span>
            </Subcard>

            <Badge variant={SHIPMENT_STATUS_VARIANT[shipment.status]}>{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select
                value={shipment.status}
                disabled={updateStatusMutation.isPending}
                onChange={(e) => updateStatusMutation.mutate({ shipmentId: shipment.id, status: e.target.value })}
                className="w-auto"
                title="Изменить статус отгрузки"
              >
                {Object.entries(SHIPMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              {shipment.wbSupplyId ? <WbShippingMethodDialog shipmentId={shipment.id} currentPointId={shipment.wbShippingPointId} /> : null}
              <PrintShipmentBarcodeDialog
                shipmentId={shipment.id}
                barcode={shipment.barcode}
                title={`Отгрузка ${formatDateTime(shipment.scheduledAt)} · ${shipment.warehouse?.name ?? "Склад не указан"}`}
              />
              <Button size="sm" variant="secondary" onClick={() => setExpandedId(expandedId === shipment.id ? null : shipment.id)}>
                {expandedId === shipment.id ? "Скрыть" : "Заказы"}
              </Button>
            </div>
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
                onAdd={(orderId) => {
                  setWbWarning(null);
                  addOrderMutation.mutate({ shipmentId: shipment.id, orderId });
                }}
                pending={addOrderMutation.isPending}
              />
              {wbWarning ? <p className="mt-2 text-[12.5px] text-[var(--color-warning)]">Не синхронизировано с WB: {wbWarning}</p> : null}
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

