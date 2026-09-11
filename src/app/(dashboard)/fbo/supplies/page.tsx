"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SupplyStatusBadge } from "@/components/ui/status-badge";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

interface Supply {
  id: string;
  supplyNumber: string;
  marketplace: string;
  marketplaceWarehouse: string | null;
  status: string;
  deadline: string | null;
  boxesCount: number | null;
  palletsCount: number | null;
  client: { id: string; name: string };
  items: { id: string; qtyNeeded: number; qtyPicked: number }[];
}

export default function FboSuppliesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["fbo-supplies"],
    queryFn: async () => (await apiClient.get<Supply[]>("/fbo/supplies")).data,
  });

  return (
    <div>
      <PageHeader title="FBO · Поставки" description="Поставки на склады маркетплейсов" actions={<CreateSupplyDialog />} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={PackagePlus} title="Поставок пока нет" description="Создайте первую поставку FBO" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Номер</Th>
                <Th>Клиент</Th>
                <Th>Маркетплейс</Th>
                <Th>Склад МП</Th>
                <Th>Дедлайн</Th>
                <Th>Собрано</Th>
                <Th>Коробки/паллеты</Th>
                <Th>Статус</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((s) => {
                const needed = s.items.reduce((a, i) => a + i.qtyNeeded, 0);
                const picked = s.items.reduce((a, i) => a + i.qtyPicked, 0);
                return (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/fbo/supplies/${s.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                        №{s.supplyNumber}
                      </Link>
                    </Td>
                    <Td>{s.client.name}</Td>
                    <Td>{MARKETPLACE_LABELS[s.marketplace] ?? s.marketplace}</Td>
                    <Td>{s.marketplaceWarehouse ?? "—"}</Td>
                    <Td>{formatDate(s.deadline)}</Td>
                    <Td>
                      {picked}/{needed}
                    </Td>
                    <Td>
                      {s.boxesCount ?? 0} / {s.palletsCount ?? 0}
                    </Td>
                    <Td>
                      <SupplyStatusBadge status={s.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function CreateSupplyDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });

  const [clientId, setClientId] = useState("");
  const [supplyNumber, setSupplyNumber] = useState("");
  const marketplace = "WILDBERRIES";
  const [marketplaceWarehouse, setMarketplaceWarehouse] = useState("");
  const [deadline, setDeadline] = useState("");
  const [items, setItems] = useState<{ productId: string; qtyNeeded: string }[]>([{ productId: "", qtyNeeded: "1" }]);

  const { data: products } = useQuery({
    queryKey: ["products", clientId],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { clientId } })).data,
    enabled: open && !!clientId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/fbo/supplies", {
        supplyNumber,
        clientId,
        marketplace,
        marketplaceWarehouse: marketplaceWarehouse || undefined,
        deadline: deadline || undefined,
        items: items.filter((i) => i.productId).map((i) => ({ productId: i.productId, qtyNeeded: Number(i.qtyNeeded) })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fbo-supplies"] });
      setOpen(false);
      setClientId("");
      setSupplyNumber("");
      setItems([{ productId: "", qtyNeeded: "1" }]);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Создать поставку
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая поставка FBO" description="Товары автоматически резервируются под поставку">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="client">Клиент</Label>
              <Select id="client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Выберите</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="marketplace">Маркетплейс</Label>
              <Input id="marketplace" value="Wildberries" disabled />
            </div>
            <div>
              <Label htmlFor="supplyNumber">Номер поставки</Label>
              <Input id="supplyNumber" required value={supplyNumber} onChange={(e) => setSupplyNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mpWarehouse">Склад маркетплейса</Label>
              <Input id="mpWarehouse" value={marketplaceWarehouse} onChange={(e) => setMarketplaceWarehouse(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="deadline">Дедлайн</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Товары</Label>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    onChange={(e) =>
                      setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))
                    }
                    disabled={!clientId}
                  >
                    <option value="">Товар…</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.article})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    value={item.qtyNeeded}
                    onChange={(e) =>
                      setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, qtyNeeded: e.target.value } : it)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                    className="text-[var(--color-foreground-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setItems((arr) => [...arr, { productId: "", qtyNeeded: "1" }])}
                className="self-start"
              >
                <Plus className="h-3.5 w-3.5" /> Добавить товар
              </Button>
            </div>
          </div>

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Создаём…" : "Создать поставку"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
