"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
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

interface OrderCounts {
  new: number;
  picking: number;
  shipping: number;
  completed: number;
  cancelled: number;
  archive: number;
}

const GROUP_TABS: { value: string; label: string; group?: string; archived?: boolean; emptyTitle: string }[] = [
  { value: "new", label: "Новые", group: "NEW", emptyTitle: "Новых заказов нет" },
  { value: "picking", label: "На сборке", group: "PICKING", emptyTitle: "Заказов на сборке нет" },
  { value: "shipping", label: "В доставке", group: "SHIPPING", emptyTitle: "Заказов в доставке нет" },
  { value: "completed", label: "Завершённые", group: "COMPLETED", emptyTitle: "Завершённых заказов нет" },
  { value: "cancelled", label: "Отменённые", group: "CANCELLED", emptyTitle: "Отменённых заказов нет" },
  { value: "archive", label: "Архив", archived: true, emptyTitle: "Архив пуст" },
];

export default function FbsOrdersPage() {
  const { data: counts } = useQuery({
    queryKey: ["orders", "counts"],
    queryFn: async () => (await apiClient.get<OrderCounts>("/orders/counts")).data,
    refetchInterval: 20_000,
  });

  return (
    <div>
      <PageHeader title="FBS · Заказы" description="Заказы маркетплейсов, обрабатываемые силами склада" actions={<CreateOrderDialog />} />

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
            <OrdersTable group={tab.group} archived={tab.archived} emptyTitle={tab.emptyTitle} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function OrdersTable({ group, archived, emptyTitle }: { group?: string; archived?: boolean; emptyTitle: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", { group, archived }],
    queryFn: async () =>
      (await apiClient.get<OrderRow[]>("/orders", { params: { group, archived: archived ? "true" : undefined } })).data,
    refetchInterval: 20_000,
  });

  if (isLoading) return <LoadingBlock />;
  if (!data || data.length === 0) return <EmptyState title={emptyTitle} />;

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
                <OrderRowMenu order={order} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

interface DraftItem {
  key: number;
  productId: string;
  qtyNeeded: string;
}

function CreateOrderDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [orderNumber, setOrderNumber] = useState("");
  const marketplace = "WILDBERRIES";
  const [clientId, setClientId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [items, setItems] = useState<DraftItem[]>([{ key: 0, productId: "", qtyNeeded: "1" }]);
  const [nextKey, setNextKey] = useState(1);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ["products", "by-client", clientId],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { clientId } })).data,
    enabled: open && !!clientId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/orders", {
        orderNumber,
        marketplace,
        clientId,
        priority,
        items: items
          .filter((i) => i.productId && Number(i.qtyNeeded) > 0)
          .map((i) => ({ productId: i.productId, qtyNeeded: Number(i.qtyNeeded) })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      resetAndClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function resetAndClose() {
    setOpen(false);
    setOrderNumber("");
    setClientId("");
    setItems([{ key: 0, productId: "", qtyNeeded: "1" }]);
    setNextKey(1);
  }

  function updateItem(key: number, patch: Partial<DraftItem>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addItem() {
    setItems((rows) => [...rows, { key: nextKey, productId: "", qtyNeeded: "1" }]);
    setNextKey((k) => k + 1);
  }

  function removeItem(key: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Создать заказ
        </Button>
      </DialogTrigger>
      <DialogContent title="Новый FBS-заказ" description="Товары будут зарезервированы, стоимость рассчитана автоматически">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="orderNumber">Номер заказа</Label>
              <Input id="orderNumber" required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="WB-100234" />
            </div>
            <div>
              <Label htmlFor="marketplace">Маркетплейс</Label>
              <Input id="marketplace" value="Wildberries" disabled />
            </div>
            <div>
              <Label htmlFor="clientId">Клиент</Label>
              <Select
                id="clientId"
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setItems([{ key: 0, productId: "", qtyNeeded: "1" }]);
                  setNextKey(1);
                }}
              >
                <option value="">Выберите клиента</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Приоритет</Label>
              <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Низкий</option>
                <option value="NORMAL">Обычный</option>
                <option value="HIGH">Высокий</option>
                <option value="URGENT">Срочный</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Товары</Label>
            <div className="flex flex-col gap-2">
              {items.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <Select
                    required
                    value={row.productId}
                    onChange={(e) => updateItem(row.key, { productId: e.target.value })}
                    disabled={!clientId}
                    className="flex-1"
                  >
                    <option value="">{clientId ? "Выберите товар" : "Сначала выберите клиента"}</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.article})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={row.qtyNeeded}
                    onChange={(e) => updateItem(row.key, { qtyNeeded: e.target.value })}
                    className="w-20"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(row.key)}
                    className="rounded-full p-1.5 text-[var(--color-foreground-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addItem} className="mt-2">
              <Plus className="h-3.5 w-3.5" />
              Добавить позицию
            </Button>
          </div>

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Создаём…" : "Создать заказ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
