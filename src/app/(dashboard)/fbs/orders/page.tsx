"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, ScanBarcode } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { OrderRowMenu } from "@/components/orders/order-row-menu";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  marketplace: string;
  status: string;
  priority: string;
  deadline: string | null;
  createdAt: string;
  shipmentId: string | null;
  client: { id: string; name: string };
  items: { id: string; qtyNeeded: number }[];
  assignee: { id: string; fullName: string } | null;
}

const GROUP_TABS: { value: string; label: string; group?: string; archived?: boolean; emptyTitle: string; showAssemblyButton?: boolean }[] = [
  { value: "new", label: "Новые", group: "NEW", emptyTitle: "Новых заказов нет" },
  { value: "picking", label: "На сборке", group: "PICKING", emptyTitle: "Заказов на сборке нет", showAssemblyButton: true },
  { value: "shipping", label: "В доставке", group: "SHIPPING", emptyTitle: "Заказов в доставке нет" },
  { value: "completed", label: "Завершённые", group: "COMPLETED", emptyTitle: "Завершённых заказов нет" },
  { value: "cancelled", label: "Отменённые", group: "CANCELLED", emptyTitle: "Отменённых заказов нет" },
  { value: "archive", label: "Архив", archived: true, emptyTitle: "Архив пуст" },
];

interface OrderCounts {
  new: number;
  picking: number;
  shipping: number;
  completed: number;
  cancelled: number;
  archive: number;
}


export default function FbsOrdersPage() {
  const { data: counts } = useQuery({
    queryKey: ["orders", "counts"],
    queryFn: async () => (await apiClient.get<OrderCounts>("/orders/counts")).data,
    refetchInterval: 20_000,
  });

  return (
    <div>
      <PageHeader title="FBS · Заказы" description="Заказы маркетплейсов, обрабатываемые силами склада" />

      <Tabs defaultValue="new">
        <TabsList className="mb-5 flex-wrap">
          {GROUP_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
              {tab.label}
              {counts ? (
                <Badge variant="accent" className="px-1.5 py-0.5">
                  {counts[tab.value as keyof OrderCounts]}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {GROUP_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <OrdersTable group={tab.group} archived={tab.archived} emptyTitle={tab.emptyTitle} showAssemblyButton={tab.showAssemblyButton} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function OrdersTable({ group, archived, emptyTitle, showAssemblyButton }: { group?: string; archived?: boolean; emptyTitle: string; showAssemblyButton?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", { group, archived }],
    queryFn: async () =>
      (await apiClient.get<OrderRow[]>("/orders", { params: { group, archived: archived ? "true" : undefined } })).data,
    refetchInterval: 20_000,
  });

  if (isLoading) return <LoadingBlock />;
  if (!data || data.length === 0) return <EmptyState icon={PackageSearch} title={emptyTitle} description="Список обновится автоматически, когда появятся заказы" />;

  return (
    <Card className="overflow-hidden">
      <Table>
        <Thead>
          <tr>
            <Th>Номер</Th>
            <Th>Маркетплейс</Th>
            <Th>Клиент</Th>
            <Th>Товаров</Th>
            <Th>Ед.</Th>
            <Th>Создан</Th>
            <Th>Дедлайн</Th>
            <Th>Приоритет</Th>
            <Th>Ответственный</Th>
            <Th>Статус</Th>
            <Th></Th>
          </tr>
        </Thead>
        <tbody>
          {data.map((order) => (
            <Tr key={order.id}>
              <Td>
                <Link href={`/fbs/orders/${order.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                  №{order.orderNumber}
                </Link>
              </Td>
              <Td>{MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace}</Td>
              <Td>{order.client.name}</Td>
              <Td>{order.items.length}</Td>
              <Td>{order.items.reduce((s, i) => s + i.qtyNeeded, 0)}</Td>
              <Td>{formatDate(order.createdAt)}</Td>
              <Td>{order.deadline ? formatDate(order.deadline) : "—"}</Td>
              <Td>
                {order.priority !== "NORMAL" ? (
                  <Badge variant={order.priority === "URGENT" ? "danger" : "warning"}>{order.priority}</Badge>
                ) : (
                  "—"
                )}
              </Td>
              <Td>{order.assignee?.fullName ?? "—"}</Td>
              <Td>
                <OrderStatusBadge status={order.status} />
              </Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  {showAssemblyButton && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href="/fbs/picking">
                        <ScanBarcode className="h-3.5 w-3.5" />
                        Сборка
                      </Link>
                    </Button>
                  )}
                  <OrderRowMenu order={order} />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

