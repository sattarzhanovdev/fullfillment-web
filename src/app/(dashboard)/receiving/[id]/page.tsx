"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { ScanInput } from "@/components/scanner/scan-input";
import { cn } from "@/lib/utils";

interface Cell {
  id: string;
  code: string;
  zone: { code: string; warehouseId?: string; warehouse?: { id: string } };
}
interface ReceiptItem {
  id: string;
  expectedQty: number;
  actualQty: number;
  discrepancy: number;
  product: { name: string; article: string; barcode: string };
}
interface ReceiptDetail {
  id: string;
  status: string;
  documentNumber: string | null;
  warehouse: { id: string; name: string };
  client: { id: string; name: string };
  items: ReceiptItem[];
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "Черновик", IN_PROGRESS: "В процессе", COMPLETED: "Завершена", CANCELLED: "Отменена" };

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [cellId, setCellId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => (await apiClient.get<ReceiptDetail>(`/receipts/${id}`)).data,
  });

  const { data: cells } = useQuery({
    queryKey: ["cells-list", receipt?.warehouse.id],
    queryFn: async () => (await apiClient.get<Cell[]>("/warehouses/cells/list", { params: { warehouseId: receipt?.warehouse.id } })).data,
    enabled: !!receipt?.warehouse.id,
  });

  useEffect(() => {
    if (!cellId && cells && cells.length > 0) setCellId(cells[0].id);
  }, [cells, cellId]);

  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => apiClient.post(`/receipts/${id}/scan`, { barcode, cellId }),
    onSuccess: () => {
      setFeedback({ type: "ok", message: "Товар принят" });
      queryClient.invalidateQueries({ queryKey: ["receipt", id] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (err) => setFeedback({ type: "error", message: apiErrorMessage(err, "Ошибка сканирования") }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/receipts/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receipt", id] }),
  });

  if (isLoading || !receipt) return <LoadingBlock />;
  const isDone = receipt.status === "COMPLETED" || receipt.status === "CANCELLED";

  return (
    <div>
      <Link
        href="/receiving"
        className="mb-3 inline-flex items-center gap-1 rounded-[var(--radius-pill)] py-1 text-[13px] font-medium text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Приёмки
      </Link>
      <PageHeader
        title={receipt.documentNumber ?? `Приёмка №${receipt.id.slice(-6)}`}
        description={`${receipt.client.name} · ${receipt.warehouse.name}`}
        actions={
          <>
            <Badge variant={isDone ? "success" : "accent"}>{STATUS_LABEL[receipt.status]}</Badge>
            {!isDone && (
              <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                Завершить приёмку
              </Button>
            )}
          </>
        }
      />

      {!isDone && (
        <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="w-48">
            <Label htmlFor="cell">Ячейка размещения</Label>
            <Select id="cell" value={cellId} onChange={(e) => setCellId(e.target.value)}>
              {cells?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.zone.code}-{c.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="scan">Сканирование</Label>
            <ScanInput id="scan" onScan={(code) => scanMutation.mutate(code)} disabled={!cellId || scanMutation.isPending} />
            {feedback ? (
              <p className={cn("mt-2 text-[13px] font-medium", feedback.type === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                {feedback.message}
              </p>
            ) : null}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {receipt.items.length === 0 ? (
          <EmptyState title="Позиций пока нет" description="Отсканируйте товар, чтобы добавить его в приёмку" />
        ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Товар</Th>
              <Th>Артикул</Th>
              <Th>Штрихкод</Th>
              <Th>Ожидалось</Th>
              <Th>Фактически</Th>
              <Th>Расхождение</Th>
            </tr>
          </Thead>
          <tbody>
            {receipt.items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.product.name}</Td>
                <Td>{item.product.article}</Td>
                <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                <Td>{item.expectedQty}</Td>
                <Td>{item.actualQty}</Td>
                <Td className={cn(item.discrepancy !== 0 && (item.discrepancy > 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"))}>
                  {item.discrepancy}
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
