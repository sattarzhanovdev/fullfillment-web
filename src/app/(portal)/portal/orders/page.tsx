"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { OrderStatusBadge, SupplyStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

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

export default function PortalOrdersPage() {
  const clientId = useAuthStore((s) => s.user?.clientId);

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
      <PageHeader title="Заказы" description="Ваши FBS-заказы и FBO-поставки" />

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
                    <Tr key={o.id}>
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
                    <Tr key={s.id}>
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
    </div>
  );
}
