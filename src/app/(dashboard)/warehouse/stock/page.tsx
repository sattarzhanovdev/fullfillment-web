"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, PackageSearch } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Toolbar } from "@/components/ui/toolbar";
import { Input, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface StockRow {
  id: string;
  physicalQty: number;
  reservedQty: number;
  blockedQty: number;
  availableQty: number;
  product: { id: string; name: string; article: string; barcode: string };
  client: { id: string; name: string };
  cell: { code: string; zone: { code: string; warehouse: { name: string } } };
}

export default function WarehouseStockPage() {
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["stock", clientId],
    queryFn: async () => (await apiClient.get<StockRow[]>("/stock", { params: { clientId: clientId || undefined } })).data,
  });

  // Бэкенд трактует article/barcode/name как отдельные AND-условия одного запроса,
  // поэтому поиск "по любому из трёх полей" реализован здесь, на клиенте (OR).
  const filtered = (data ?? []).filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.product.name.toLowerCase().includes(q) ||
      row.product.article.toLowerCase().includes(q) ||
      row.product.barcode.includes(search)
    );
  });

  return (
    <div>
      <PageHeader title="Склад · Остатки" description="Физический остаток, резерв и доступное количество по ячейкам" />

      <Toolbar>
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Артикул / штрихкод / название"
            className="border-none bg-[var(--color-surface)] pl-9"
          />
        </div>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-56 border-none bg-[var(--color-surface)]">
          <option value="">Все клиенты</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {data ? (
          <span className="ml-auto shrink-0 text-[12.5px] text-[var(--color-foreground-muted)]">Позиций: {filtered.length}</span>
        ) : null}
      </Toolbar>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <EmptyState icon={PackageSearch} title="Остатков не найдено" description="Измените фильтры или проверьте другого клиента" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Клиент</Th>
                <Th>Ячейка</Th>
                <Th>Физический остаток</Th>
                <Th>Резерв</Th>
                <Th>Доступно</Th>
                <Th>В работе</Th>
                <Th>Статус</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <div className="font-medium">{row.product.name}</div>
                    <div className="text-[12px] text-[var(--color-foreground-muted)]">
                      {row.product.article} · {row.product.barcode}
                    </div>
                  </Td>
                  <Td>{row.client.name}</Td>
                  <Td className="font-mono text-[12.5px]">
                    {row.cell.zone.warehouse.name} / {row.cell.zone.code}-{row.cell.code}
                  </Td>
                  <Td className="font-medium">{row.physicalQty}</Td>
                  <Td>
                    <Badge variant="reserve">{row.reservedQty}</Badge>
                  </Td>
                  <Td className="font-medium text-[var(--color-success)]">{row.availableQty}</Td>
                  <Td>{row.reservedQty}</Td>
                  <Td>
                    {row.availableQty <= 0 ? (
                      <Badge variant="danger">Нет в наличии</Badge>
                    ) : row.availableQty <= 5 ? (
                      <Badge variant="warning">Мало</Badge>
                    ) : (
                      <Badge variant="success">В норме</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
