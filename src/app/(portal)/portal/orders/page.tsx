"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { OrderStatusBadge, SupplyStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  marketplace: string;
  status: string;
  createdAt: string;
}

interface SupplyRow {
  id: string;
  supplyNumber: string;
  marketplace: string;
  status: string;
  createdAt: string;
}

interface OrderItemDetail {
  id: string;
  qtyNeeded: number;
  qtyPicked: number;
  qtyPacked: number;
  notFound: boolean;
  product: { name: string; article: string; barcode: string };
}

interface OrderDetail extends OrderRow {
  deadline: string | null;
  processingCost: string | null;
  deliveryCost: string | null;
  items: OrderItemDetail[];
}

interface SupplyItemDetail {
  id: string;
  qtyNeeded: number;
  qtyPicked: number;
  product: { name: string; article: string; barcode: string };
}

interface SupplyDetail extends SupplyRow {
  deadline: string | null;
  marketplaceWarehouse: string | null;
  boxesCount: number | null;
  items: SupplyItemDetail[];
}

export default function PortalOrdersPage() {
  const clientId = useAuthStore((s) => s.user?.clientId);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["portal-orders", clientId],
    queryFn: async () => (await apiClient.get<OrderRow[]>("/orders", { params: { clientId } })).data,
    enabled: !!clientId,
  });

  const { data: supplies, isLoading: suppliesLoading } = useQuery({
    queryKey: ["portal-supplies", clientId],
    queryFn: async () => (await apiClient.get<SupplyRow[]>("/fbo/supplies", { params: { clientId } })).data,
    enabled: !!clientId,
  });

  return (
    <div>
      <PageHeader title="Заказы" description="Ваши FBS-заказы и FBO-поставки — нажмите на строку, чтобы увидеть состав" />

      <Tabs defaultValue="fbs">
        <TabsList className="mb-5">
          <TabsTrigger value="fbs">FBS</TabsTrigger>
          <TabsTrigger value="fbo">FBO</TabsTrigger>
        </TabsList>

        <TabsContent value="fbs">
          <Card className="overflow-hidden">
            {ordersLoading ? (
              <LoadingBlock />
            ) : !orders || orders.length === 0 ? (
              <EmptyState title="Заказов пока нет" />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Номер</Th>
                    <Th>Маркетплейс</Th>
                    <Th>Дата</Th>
                    <Th>Статус</Th>
                  </tr>
                </Thead>
                <tbody>
                  {orders.map((o) => (
                    <Tr key={o.id} onClick={() => setSelectedOrderId(o.id)} className="cursor-pointer">
                      <Td className="font-medium">№{o.orderNumber}</Td>
                      <Td>{MARKETPLACE_LABELS[o.marketplace] ?? o.marketplace}</Td>
                      <Td>{formatDate(o.createdAt)}</Td>
                      <Td>
                        <OrderStatusBadge status={o.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fbo">
          <Card className="overflow-hidden">
            {suppliesLoading ? (
              <LoadingBlock />
            ) : !supplies || supplies.length === 0 ? (
              <EmptyState title="Поставок пока нет" />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Номер</Th>
                    <Th>Маркетплейс</Th>
                    <Th>Дата</Th>
                    <Th>Статус</Th>
                  </tr>
                </Thead>
                <tbody>
                  {supplies.map((s) => (
                    <Tr key={s.id} onClick={() => setSelectedSupplyId(s.id)} className="cursor-pointer">
                      <Td className="font-medium">№{s.supplyNumber}</Td>
                      <Td>{MARKETPLACE_LABELS[s.marketplace] ?? s.marketplace}</Td>
                      <Td>{formatDate(s.createdAt)}</Td>
                      <Td>
                        <SupplyStatusBadge status={s.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <OrderDetailDialog orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      <SupplyDetailDialog supplyId={selectedSupplyId} onClose={() => setSelectedSupplyId(null)} />
    </div>
  );
}

function OrderDetailDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ["portal-order-detail", orderId],
    queryFn: async () => (await apiClient.get<OrderDetail>(`/orders/${orderId}`)).data,
    enabled: !!orderId,
  });

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={order ? `Заказ №${order.orderNumber}` : "Заказ"}
        description={order ? `${MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace} · ${formatDate(order.createdAt)}` : undefined}
      >
        {isLoading || !order ? (
          <LoadingBlock />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              {order.deadline && <span className="text-[12.5px] text-[var(--color-foreground-muted)]">до {formatDateTime(order.deadline)}</span>}
              {order.processingCost && (
                <span className="text-[12.5px] text-[var(--color-foreground-muted)]">
                  Стоимость обработки: {formatMoney(order.processingCost)}
                </span>
              )}
            </div>

            <Table>
              <Thead>
                <tr>
                  <Th>Товар</Th>
                  <Th>Артикул</Th>
                  <Th>Нужно</Th>
                  <Th>Собрано</Th>
                  <Th>Упаковано</Th>
                </tr>
              </Thead>
              <tbody>
                {order.items.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-medium">
                      {item.product.name}
                      {item.notFound && <span className="ml-1.5 text-[11.5px] text-[var(--color-danger)]">не найден</span>}
                    </Td>
                    <Td>{item.product.article}</Td>
                    <Td>{item.qtyNeeded}</Td>
                    <Td>{item.qtyPicked}</Td>
                    <Td>{item.qtyPacked}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SupplyDetailDialog({ supplyId, onClose }: { supplyId: string | null; onClose: () => void }) {
  const { data: supply, isLoading } = useQuery({
    queryKey: ["portal-supply-detail", supplyId],
    queryFn: async () => (await apiClient.get<SupplyDetail>(`/fbo/supplies/${supplyId}`)).data,
    enabled: !!supplyId,
  });

  return (
    <Dialog open={!!supplyId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={supply ? `Поставка №${supply.supplyNumber}` : "Поставка"}
        description={supply ? `${MARKETPLACE_LABELS[supply.marketplace] ?? supply.marketplace} · ${formatDate(supply.createdAt)}` : undefined}
      >
        {isLoading || !supply ? (
          <LoadingBlock />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <SupplyStatusBadge status={supply.status} />
              {supply.marketplaceWarehouse && (
                <span className="text-[12.5px] text-[var(--color-foreground-muted)]">Склад МП: {supply.marketplaceWarehouse}</span>
              )}
              {supply.boxesCount ? (
                <span className="text-[12.5px] text-[var(--color-foreground-muted)]">{supply.boxesCount} кор.</span>
              ) : null}
            </div>

            <Table>
              <Thead>
                <tr>
                  <Th>Товар</Th>
                  <Th>Артикул</Th>
                  <Th>Нужно</Th>
                  <Th>Собрано</Th>
                </tr>
              </Thead>
              <tbody>
                {supply.items.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-medium">{item.product.name}</Td>
                    <Td>{item.product.article}</Td>
                    <Td>{item.qtyNeeded}</Td>
                    <Td>{item.qtyPicked}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
