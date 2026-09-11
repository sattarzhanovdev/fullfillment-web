"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Select, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Toolbar } from "@/components/ui/toolbar";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { OrderLabelCard } from "@/components/scanner/order-label-card";
import { Users, ClipboardList, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface PickableItem {
  id: string;
  orderId: string;
  cellId: string | null;
  qtyNeeded: number;
  qtyPicked: number;
  notFound: boolean;
  product: { id: string; name: string; article: string; barcode: string };
  order: { id: string; orderNumber: string; status: string };
}

function playBeep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    // аудио недоступно — не критично
  }
}

export default function FbsPickingPage() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Record<string, "ok" | "err">>({});
  const [lastScanned, setLastScanned] = useState<{
    orderId: string;
    orderNumber: string;
    product: { name: string; article: string; barcode: string };
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["picking-items", clientId],
    queryFn: async () => (await apiClient.get<PickableItem[]>("/orders/picking/items", { params: { clientId } })).data,
    enabled: !!clientId,
    refetchInterval: 10_000,
  });

  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const aDone = a.qtyPicked >= a.qtyNeeded || a.notFound;
      const bDone = b.qtyPicked >= b.qtyNeeded || b.notFound;
      return Number(aDone) - Number(bDone);
    });
  }, [items]);

  const pickMutation = useMutation({
    mutationFn: async (params: {
      orderId: string;
      barcode: string;
      itemId: string;
      orderNumber: string;
      product: { name: string; article: string; barcode: string };
    }) => apiClient.post(`/orders/${params.orderId}/pick`, { barcode: params.barcode }),
    onSuccess: async (_res, variables) => {
      setScanError(null);
      setFlashIds((f) => ({ ...f, [variables.itemId]: "ok" }));
      playBeep(true);
      queryClient.invalidateQueries({ queryKey: ["picking-items", clientId] });
      setTimeout(() => setFlashIds((f) => { const n = { ...f }; delete n[variables.itemId]; return n; }), 1200);

      // Подключаем заказ к отгрузке как можно раньше — только это заставляет WB подтвердить
      // заказ (supplierStatus new → confirm) и выдать стикер. Best-effort: если не удалось,
      // карточка ниже просто покажет запасной внутренний штрихкод.
      try {
        await apiClient.post(`/shipments/orders/${variables.orderId}/ensure`);
      } catch {
        // не критично
      }
      setLastScanned({ orderId: variables.orderId, orderNumber: variables.orderNumber, product: variables.product });
    },
    onError: (err) => {
      setScanError(apiErrorMessage(err, "Неверный товар"));
      playBeep(false);
    },
  });

  const notFoundMutation = useMutation({
    mutationFn: async (item: PickableItem) => apiClient.post(`/orders/${item.orderId}/items/${item.id}/not-found`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["picking-items", clientId] }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [clientId]);

  function handleScanSubmit() {
    const barcode = scanValue.trim();
    setScanValue("");
    if (!barcode || !items) return;

    const match = items.find((i) => i.product.barcode === barcode && i.qtyPicked < i.qtyNeeded && !i.notFound);
    if (!match) {
      setScanError("Неверный товар: штрихкод не найден среди ожидающих позиций");
      playBeep(false);
      return;
    }
    pickMutation.mutate({
      orderId: match.orderId,
      barcode,
      itemId: match.id,
      orderNumber: match.order.orderNumber,
      product: match.product,
    });
  }

  return (
    <div onClick={() => inputRef.current?.focus()}>
      <PageHeader title="FBS · Сборка" description="Выберите клиента и сканируйте товары по одному" />

      <Toolbar>
        <div className="w-64">
          <Label htmlFor="client-select" className="mb-1 flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Клиент
          </Label>
          <Select
            id="client-select"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setScanError(null);
            }}
            className="border-none bg-[var(--color-surface)]"
          >
            <option value="">Все клиенты</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {clientId ? (
        <>
          <Card className="mb-5 p-5">
            <Label htmlFor="scan-input" className="flex items-center gap-1.5">
              <ScanLine className="h-3.5 w-3.5" /> Сканируйте штрихкод
            </Label>
            <Input
              id="scan-input"
              ref={inputRef}
              autoFocus
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanSubmit();
                }
              }}
              placeholder="Штрихкод → Enter"
              className="h-14 text-[20px] font-mono tracking-wide"
            />
            {scanError ? <p className="mt-2 text-[13.5px] font-medium text-[var(--color-danger)]">{scanError}</p> : null}
          </Card>

          {lastScanned ? (
            <OrderLabelCard orderId={lastScanned.orderId} orderNumber={lastScanned.orderNumber} product={lastScanned.product} />
          ) : null}

          {isLoading ? (
            <LoadingBlock />
          ) : !sorted || sorted.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Нет товаров для сборки" description="У этого клиента сейчас нет активных заказов" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <Thead>
                  <tr>
                    <Th>Товар</Th>
                    <Th>Артикул</Th>
                    <Th>Штрихкод</Th>
                    <Th>Ячейка</Th>
                    <Th>Нужно</Th>
                    <Th>Собрано</Th>
                    <Th>Осталось</Th>
                    <Th>Заказ</Th>
                    <Th>Статус</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <tbody>
                  {sorted.map((item) => {
                    const done = item.qtyPicked >= item.qtyNeeded;
                    const flash = flashIds[item.id];
                    return (
                      <Tr
                        key={item.id}
                        className={cn(
                          done && !item.notFound && "opacity-50",
                          flash === "ok" && "bg-[var(--color-success-bg)]",
                          item.notFound && "bg-[var(--color-danger-bg)]/40",
                        )}
                      >
                        <Td className="font-medium">{item.product.name}</Td>
                        <Td>{item.product.article}</Td>
                        <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                        <Td>{item.cellId ?? "—"}</Td>
                        <Td>{item.qtyNeeded}</Td>
                        <Td>{item.qtyPicked}</Td>
                        <Td>{Math.max(0, item.qtyNeeded - item.qtyPicked)}</Td>
                        <Td>№{item.order.orderNumber}</Td>
                        <Td>
                          {item.notFound ? (
                            <Badge variant="danger">Не найден</Badge>
                          ) : done ? (
                            <Badge variant="success">Собрано</Badge>
                          ) : (
                            <Badge variant="accent">В работе</Badge>
                          )}
                        </Td>
                        <Td>
                          {!done && !item.notFound && (
                            <Button size="sm" variant="secondary" onClick={() => notFoundMutation.mutate(item)}>
                              Не нашёл
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      ) : (
        <EmptyState icon={Users} title="Выберите клиента" description="После выбора появится список товаров к сборке" />
      )}
    </div>
  );
}
