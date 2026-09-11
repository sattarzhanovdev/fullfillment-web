"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PackageSearch, ScanLine, Truck } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { ScanInput } from "@/components/scanner/scan-input";
import { CreateShipmentDialog } from "@/components/shipments/create-shipment-dialog";
import { PrintShipmentBarcodeDialog } from "@/components/shipments/print-shipment-barcode-dialog";
import { WbShippingMethodDialog } from "@/components/shipments/wb-shipping-method-dialog";
import { OrderLabelCard } from "@/components/scanner/order-label-card";
import { cn, formatDateTime } from "@/lib/utils";

interface ShipmentDetail {
  id: string;
  barcode: string;
  wbSupplyId: string | null;
  wbShippingPointId: number | null;
  scheduledAt: string;
  warehouse: { id: string; name: string } | null;
  orders: { id: string; orderNumber: string; client: { name: string }; items: { id: string; qtyNeeded: number }[] }[];
}

interface PendingShipmentOrder {
  id: string;
  orderNumber: string;
  items: { product: { name: string; article: string; barcode: string } }[];
}

interface OpenShipment {
  id: string;
  barcode: string;
  scheduledAt: string;
  warehouse: { id: string; name: string } | null;
}

export default function FbsShippingScanPage() {
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "warn" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<{
    orderId: string;
    orderNumber: string;
    product: { name: string; article: string; barcode: string };
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: openShipments } = useQuery({
    queryKey: ["shipments", "open"],
    queryFn: async () => (await apiClient.get<OpenShipment[]>("/shipments", { params: { status: "PLANNED,IN_PROGRESS" } })).data,
    enabled: !shipmentId,
  });

  const { data: shipment, isLoading: shipmentLoading } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: async () => (await apiClient.get<ShipmentDetail>(`/shipments/${shipmentId}`)).data,
    enabled: !!shipmentId,
    refetchInterval: shipmentId ? 4000 : false,
  });

  async function handleScan(code: string) {
    setPending(true);
    setFeedback(null);
    try {
      // 1. Пробуем распознать код как штрихкод короба отгрузки — переключаем контекст.
      const shipmentRes = await apiClient.get<ShipmentDetail>(`/shipments/by-barcode/${code}`);
      setShipmentId(shipmentRes.data.id);
      queryClient.setQueryData(["shipment", shipmentRes.data.id], shipmentRes.data);
      setLastScanned(null);
      setFeedback({ type: "ok", message: `Отгрузка (${formatDateTime(shipmentRes.data.scheduledAt)}) выбрана` });
      return;
    } catch {
      // не отгрузка — пробуем как товар ниже
    } finally {
      setPending(false);
    }

    if (!shipmentId) {
      setFeedback({ type: "error", message: "Сначала отсканируйте штрихкод короба отгрузки (или выберите её вручную)" });
      return;
    }

    setPending(true);
    try {
      const orderRes = await apiClient.get<PendingShipmentOrder>(`/orders/pending-shipment/by-barcode/${code}`);
      const order = orderRes.data;
      const scannedProduct = order.items.find((i) => i.product.barcode === code)?.product;
      const attachRes = await apiClient.post<{ wbWarning: string | null }>(`/shipments/${shipmentId}/orders/${order.id}`);
      // Этикетку запрашиваем только после успешного добавления в поставку — именно этот шаг
      // подтверждает заказ на стороне WB (supplierStatus new → confirm), до этого стикера нет.
      if (scannedProduct && !attachRes.data.wbWarning) {
        setLastScanned({ orderId: order.id, orderNumber: order.orderNumber, product: scannedProduct });
      }
      setFlashId(order.id);
      setTimeout(() => setFlashId(null), 900);
      await queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (attachRes.data.wbWarning) {
        setFeedback({ type: "warn", message: `Заказ №${order.orderNumber} добавлен, но не синхронизирован с WB: ${attachRes.data.wbWarning}` });
      } else {
        setFeedback({ type: "ok", message: `Заказ №${order.orderNumber} добавлен в отгрузку` });
      }
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Штрихкод не распознан") });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="FBS · Сканирование отгрузки"
        description="Скан короба выбирает отгрузку, скан товара сразу добавляет его заказ — без подтверждений"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/fbs/shipping">
              <ArrowLeft className="h-4 w-4" />К списку отгрузок
            </Link>
          </Button>
        }
      />

      {!shipmentId ? (
        <Card className="mb-4 p-4">
          <Label htmlFor="scan-select" className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Отгрузка не выбрана
          </Label>
          <p className="mb-3 text-[12.5px] text-[var(--color-foreground-muted)]">
            Отсканируйте штрихкод короба отгрузки сканером, либо выберите вручную
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select id="scan-select" className="max-w-xs" value="" onChange={(e) => e.target.value && setShipmentId(e.target.value)}>
              <option value="">Выберите отгрузку</option>
              {openShipments?.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.scheduledAt)} · {s.warehouse?.name ?? "Склад не указан"}
                </option>
              ))}
            </Select>
            <CreateShipmentDialog triggerLabel="Создать отгрузку" triggerVariant="secondary" onCreated={(id) => setShipmentId(id)} />
          </div>
        </Card>
      ) : null}

      <Card className="relative mb-4 overflow-hidden p-4 pl-5">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--color-accent)]" aria-hidden />
        <Label htmlFor="scan" className="flex items-center gap-1.5">
          <ScanLine className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Сканирование
        </Label>
        <ScanInput id="scan" onScan={handleScan} disabled={pending} />
        {feedback ? (
          <p
            className={cn(
              "mt-2 text-[13px]",
              feedback.type === "ok" && "text-[var(--color-success)]",
              feedback.type === "warn" && "text-[var(--color-warning)]",
              feedback.type === "error" && "text-[var(--color-danger)]",
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </Card>

      {lastScanned ? (
        <OrderLabelCard orderId={lastScanned.orderId} orderNumber={lastScanned.orderNumber} product={lastScanned.product} />
      ) : null}

      {shipmentId && shipment ? (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[14px] font-semibold">{formatDateTime(shipment.scheduledAt)}</p>
            <p className="text-[12.5px] text-[var(--color-foreground-muted)]">{shipment.warehouse?.name ?? "Склад не указан"}</p>
            <p className="mt-1 font-mono text-[12px] text-[var(--color-foreground-muted)]">ШК короба: {shipment.barcode}</p>
          </div>
          <div className="flex items-center gap-2">
            {shipment.wbSupplyId ? <WbShippingMethodDialog shipmentId={shipment.id} currentPointId={shipment.wbShippingPointId} /> : null}
            <PrintShipmentBarcodeDialog
              shipmentId={shipment.id}
              barcode={shipment.barcode}
              title={`Отгрузка ${formatDateTime(shipment.scheduledAt)} · ${shipment.warehouse?.name ?? "Склад не указан"}`}
            />
            <Button size="sm" variant="secondary" onClick={() => setShipmentId(null)}>
              Сменить отгрузку
            </Button>
          </div>
        </Card>
      ) : null}

      {!shipmentId ? (
        <EmptyState icon={Truck} title="Выберите отгрузку, чтобы начать сканирование товаров" />
      ) : shipmentLoading || !shipment ? (
        <LoadingBlock />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Заказ</Th>
                <Th>Клиент</Th>
                <Th>Позиций</Th>
              </tr>
            </Thead>
            <tbody>
              {shipment.orders.length === 0 ? (
                <Tr>
                  <Td colSpan={3}>
                    <EmptyState icon={PackageSearch} title="Заказы ещё не добавлены — сканируйте товары" />
                  </Td>
                </Tr>
              ) : (
                shipment.orders.map((order) => (
                  <Tr key={order.id} className={cn(flashId === order.id && "bg-[var(--color-success-bg)]")}>
                    <Td className="font-medium text-[var(--color-accent)]">
                      <Link href={`/fbs/orders/${order.id}`}>№{order.orderNumber}</Link>
                    </Td>
                    <Td>{order.client.name}</Td>
                    <Td>{order.items.reduce((s, i) => s + i.qtyNeeded, 0)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
