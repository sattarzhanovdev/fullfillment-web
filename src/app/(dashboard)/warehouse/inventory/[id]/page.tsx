"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { ScanInput } from "@/components/scanner/scan-input";
import { cn } from "@/lib/utils";

interface InventoryLine {
  id: string;
  productId: string;
  systemQty: number;
  actualQty: number | null;
  discrepancy: number | null;
  product?: { name: string; article: string; barcode: string };
}
interface InventoryDetail {
  id: string;
  scope: string;
  status: string;
  clientId: string | null;
  lines: InventoryLine[];
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", id],
    queryFn: async () => (await apiClient.get<InventoryDetail>(`/inventory/${id}`)).data,
  });

  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const product = (await apiClient.get(`/products/by-barcode/${barcode}`, { params: { clientId: inventory?.clientId || undefined } })).data;
      if (!product) throw new Error("NOT_FOUND");
      return apiClient.post(`/inventory/${id}/scan`, { productId: product.id });
    },
    onSuccess: () => {
      setFeedback({ type: "ok", message: "Учтено" });
      queryClient.invalidateQueries({ queryKey: ["inventory", id] });
    },
    onError: (err: any) =>
      setFeedback({
        type: "error",
        message: err?.message === "NOT_FOUND" ? "Товар с таким штрихкодом не найден" : apiErrorMessage(err),
      }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/inventory/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", id] }),
  });

  if (isLoading || !inventory) return <LoadingBlock />;
  const isDone = inventory.status === "completed";

  return (
    <div>
      <Link href="/warehouse/inventory" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Инвентаризации
      </Link>
      <PageHeader
        title="Инвентаризация"
        description={`${inventory.lines.length} позиций`}
        actions={
          <>
            <Badge variant={isDone ? "success" : "accent"}>{isDone ? "Завершена" : "В процессе"}</Badge>
            {!isDone && (
              <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                Завершить
              </Button>
            )}
          </>
        }
      />

      {!isDone && (
        <Card className="mb-4 p-4">
          <Label htmlFor="scan">Сканирование товара</Label>
          <ScanInput id="scan" onScan={(code) => scanMutation.mutate(code)} disabled={scanMutation.isPending} />
          {feedback ? (
            <p className={cn("mt-2 text-[13px]", feedback.type === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
              {feedback.message}
            </p>
          ) : null}
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Товар</Th>
              <Th>Артикул</Th>
              <Th>Системный остаток</Th>
              <Th>Фактический</Th>
              <Th>Расхождение</Th>
            </tr>
          </Thead>
          <tbody>
            {inventory.lines.map((line) => (
              <Tr key={line.id}>
                <Td>{line.product?.name ?? line.productId}</Td>
                <Td>{line.product?.article ?? "—"}</Td>
                <Td>{line.systemQty}</Td>
                <Td>{line.actualQty ?? "—"}</Td>
                <Td
                  className={cn(
                    line.discrepancy && line.discrepancy !== 0
                      ? line.discrepancy > 0
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-danger)]"
                      : undefined,
                  )}
                >
                  {line.discrepancy ?? 0}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
