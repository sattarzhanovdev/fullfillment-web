"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { SupplyStatusBadge } from "@/components/ui/status-badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { SUPPLY_STATUS_LABELS, MARKETPLACE_LABELS } from "@/lib/status";
import { formatDate, formatDateTime } from "@/lib/utils";

interface SupplyDetail {
  id: string;
  supplyNumber: string;
  marketplace: string;
  marketplaceWarehouse: string | null;
  status: string;
  deadline: string | null;
  boxesCount: number | null;
  palletsCount: number | null;
  client: { id: string; name: string };
  items: { id: string; qtyNeeded: number; qtyPicked: number; product: { id: string; name: string; article: string; barcode: string } }[];
  statusHistory: { id: string; status: string; createdAt: string }[];
}

const ALL_STATUSES = [
  "DRAFT",
  "CREATED",
  "PICKING",
  "PICKED",
  "PACKING",
  "READY",
  "SHIPPED",
  "ACCEPTED_BY_MARKETPLACE",
  "COMPLETED",
  "CANCELLED",
];

export default function SupplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState("");
  const [pallets, setPallets] = useState("");

  const { data: supply, isLoading } = useQuery({
    queryKey: ["fbo-supply", id],
    queryFn: async () => (await apiClient.get<SupplyDetail>(`/fbo/supplies/${id}`)).data,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => apiClient.patch(`/fbo/supplies/${id}/status`, { status }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["fbo-supply", id] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Переход запрещён бизнес-логикой")),
  });

  const boxesMutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/fbo/supplies/${id}/boxes`, {
        boxesCount: Number(boxes || 0),
        palletsCount: pallets ? Number(pallets) : undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fbo-supply", id] }),
  });

  if (isLoading || !supply) return <LoadingBlock />;

  return (
    <div>
      <Link href="/fbo/supplies" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Поставки
      </Link>
      <PageHeader
        title={`Поставка №${supply.supplyNumber}`}
        description={`${supply.client.name} · ${MARKETPLACE_LABELS[supply.marketplace] ?? supply.marketplace}${supply.marketplaceWarehouse ? " · " + supply.marketplaceWarehouse : ""}`}
        actions={<SupplyStatusBadge status={supply.status} />}
      />

      {error ? (
        <div className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-danger-bg)] px-4 py-2.5 text-[13px] text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Артикул</Th>
                <Th>Штрихкод</Th>
                <Th>Нужно</Th>
                <Th>Собрано</Th>
              </tr>
            </Thead>
            <tbody>
              {supply.items.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.product.name}</Td>
                  <Td>{item.product.article}</Td>
                  <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                  <Td>{item.qtyNeeded}</Td>
                  <Td className={item.qtyPicked >= item.qtyNeeded ? "text-[var(--color-success)]" : undefined}>
                    {item.qtyPicked}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Label htmlFor="status">Изменить статус</Label>
              <Select
                id="status"
                value={supply.status}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                disabled={statusMutation.isPending}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SUPPLY_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <p className="text-[12px] text-[var(--color-foreground-muted)]">Дедлайн: {formatDate(supply.deadline)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  boxesMutation.mutate();
                }}
                className="flex flex-col gap-3"
              >
                <div>
                  <Label htmlFor="boxes">Коробки</Label>
                  <Input id="boxes" type="number" min={0} value={boxes || supply.boxesCount || 0} onChange={(e) => setBoxes(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pallets">Паллеты</Label>
                  <Input id="pallets" type="number" min={0} value={pallets || supply.palletsCount || 0} onChange={(e) => setPallets(e.target.value)} />
                </div>
                <Button type="submit" size="sm" disabled={boxesMutation.isPending}>
                  Сохранить
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-2 text-[13px] font-medium">История статусов</p>
              <div className="flex flex-col gap-2">
                {supply.statusHistory.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--color-foreground-muted)]">Пока нет изменений</p>
                ) : (
                  supply.statusHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-[12.5px]">
                      <span>{SUPPLY_STATUS_LABELS[h.status] ?? h.status}</span>
                      <span className="text-[var(--color-foreground-muted)]">{formatDateTime(h.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
