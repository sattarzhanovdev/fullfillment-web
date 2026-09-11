"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Toolbar } from "@/components/ui/toolbar";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { ScanInput } from "@/components/scanner/scan-input";
import { ScanLine, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface Supply {
  id: string;
  supplyNumber: string;
  status: string;
  items: { id: string; qtyNeeded: number; qtyPicked: number; product: { id: string; name: string; article: string; barcode: string } }[];
}

export default function FboPickingPage() {
  const [clientId, setClientId] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data: supplies } = useQuery({
    queryKey: ["fbo-supplies", "pickable", clientId],
    queryFn: async () =>
      (await apiClient.get<Supply[]>("/fbo/supplies", { params: { clientId, status: "CREATED,PICKING" } })).data,
    enabled: !!clientId,
  });

  const { data: supply, isLoading: supplyLoading } = useQuery({
    queryKey: ["fbo-supply", supplyId],
    queryFn: async () => (await apiClient.get<Supply>(`/fbo/supplies/${supplyId}`)).data,
    enabled: !!supplyId,
    refetchInterval: supplyId ? 4000 : false,
  });

  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => apiClient.post(`/fbo/supplies/${supplyId}/pick`, { barcode }),
    onSuccess: (_res, barcode) => {
      const item = supply?.items.find((i) => i.product.barcode === barcode);
      if (item) {
        setFlashId(item.id);
        setTimeout(() => setFlashId(null), 900);
      }
      setFeedback({ type: "ok", message: "Товар принят" });
      queryClient.invalidateQueries({ queryKey: ["fbo-supply", supplyId] });
    },
    onError: (err) => setFeedback({ type: "error", message: apiErrorMessage(err, "Неверный товар") }),
  });

  const sortedItems = supply?.items
    ? [...supply.items].sort((a, b) => Number(a.qtyPicked >= a.qtyNeeded) - Number(b.qtyPicked >= b.qtyNeeded))
    : [];

  return (
    <div>
      <PageHeader title="FBO · Сборка" description="Выберите клиента и поставку, затем сканируйте товары" />

      <Toolbar>
        <div className="w-56">
          <Label htmlFor="client">Клиент</Label>
          <Select
            id="client"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setSupplyId("");
            }}
            className="border-none bg-[var(--color-surface)]"
          >
            <option value="">Выберите клиента</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Label htmlFor="supply">Поставка</Label>
          <Select
            id="supply"
            value={supplyId}
            onChange={(e) => setSupplyId(e.target.value)}
            disabled={!clientId}
            className="border-none bg-[var(--color-surface)]"
          >
            <option value="">Выберите поставку</option>
            {supplies?.map((s) => (
              <option key={s.id} value={s.id}>
                №{s.supplyNumber}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {!supplyId ? (
        <EmptyState icon={PackageSearch} title="Выберите поставку для сборки" />
      ) : supplyLoading || !supply ? (
        <LoadingBlock />
      ) : (
        <>
          <Card className="relative mb-4 overflow-hidden p-4 pl-5">
            <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--color-accent)]" aria-hidden />
            <Label htmlFor="scan" className="flex items-center gap-1.5">
              <ScanLine className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Сканирование
            </Label>
            <ScanInput id="scan" onScan={(code) => scanMutation.mutate(code)} disabled={scanMutation.isPending} />
            {feedback ? (
              <p className={cn("mt-2 text-[13px]", feedback.type === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                {feedback.message}
              </p>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <Thead>
                <tr>
                  <Th>Товар</Th>
                  <Th>Артикул</Th>
                  <Th>Штрихкод</Th>
                  <Th>Нужно</Th>
                  <Th>Собрано</Th>
                  <Th>Осталось</Th>
                </tr>
              </Thead>
              <tbody>
                {sortedItems.map((item) => {
                  const done = item.qtyPicked >= item.qtyNeeded;
                  return (
                    <Tr key={item.id} className={cn(done && "opacity-50", flashId === item.id && "bg-[var(--color-success-bg)]")}>
                      <Td>{item.product.name}</Td>
                      <Td>{item.product.article}</Td>
                      <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                      <Td>{item.qtyNeeded}</Td>
                      <Td>{item.qtyPicked}</Td>
                      <Td>{Math.max(0, item.qtyNeeded - item.qtyPicked)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
