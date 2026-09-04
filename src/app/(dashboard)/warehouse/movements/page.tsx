"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils";

interface Cell {
  id: string;
  code: string;
  zone: { code: string; warehouse?: { name: string } };
}
interface Movement {
  id: string;
  qty: number;
  createdAt: string;
  product: { name: string; article: string };
  fromCell: Cell;
  toCell: Cell;
  user: { fullName: string } | null;
}

export default function MovementsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [fromCellId, setFromCellId] = useState("");
  const [toCellId, setToCellId] = useState("");
  const [qty, setQty] = useState("1");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });
  const { data: products } = useQuery({
    queryKey: ["products", clientId],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { clientId } })).data,
    enabled: !!clientId,
  });
  const { data: cells } = useQuery({
    queryKey: ["cells-list"],
    queryFn: async () => (await apiClient.get<Cell[]>("/warehouses/cells/list")).data,
  });
  const { data: movements, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => (await apiClient.get<Movement[]>("/movements")).data,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/movements", { productId, clientId, fromCellId, toCellId, qty: Number(qty) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      setError(null);
      setQty("1");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Склад · Перемещения" description="Перенос товара между ячейками" />

      <Card className="mb-5">
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end"
          >
            <div>
              <Label htmlFor="client">Клиент</Label>
              <Select id="client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Клиент</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="product">Товар</Label>
              <Select id="product" required value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!clientId}>
                <option value="">Товар</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.article}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="from">Из ячейки</Label>
              <Select id="from" required value={fromCellId} onChange={(e) => setFromCellId(e.target.value)}>
                <option value="">Ячейка</option>
                {cells?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.zone.code}-{c.code}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="to">В ячейку</Label>
              <Select id="to" required value={toCellId} onChange={(e) => setToCellId(e.target.value)}>
                <option value="">Ячейка</option>
                {cells?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.zone.code}-{c.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <Label htmlFor="qty">Кол-во</Label>
                <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <Button type="submit" disabled={mutation.isPending} className="mb-0">
                Переместить
              </Button>
            </div>
          </form>
          {error ? <p className="mt-2 text-[13px] text-[var(--color-danger)]">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !movements || movements.length === 0 ? (
          <EmptyState title="Перемещений пока не было" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Маршрут</Th>
                <Th>Кол-во</Th>
                <Th>Сотрудник</Th>
                <Th>Дата</Th>
              </tr>
            </Thead>
            <tbody>
              {movements.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    {m.product.name} <span className="text-[var(--color-foreground-muted)]">({m.product.article})</span>
                  </Td>
                  <Td className="font-mono text-[12.5px]">
                    <span className="inline-flex items-center gap-1">
                      {m.fromCell.zone.code}-{m.fromCell.code}
                      <ArrowRight className="h-3 w-3 text-[var(--color-foreground-muted)]" />
                      {m.toCell.zone.code}-{m.toCell.code}
                    </span>
                  </Td>
                  <Td>{m.qty}</Td>
                  <Td>{m.user?.fullName ?? "—"}</Td>
                  <Td>{formatDateTime(m.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
