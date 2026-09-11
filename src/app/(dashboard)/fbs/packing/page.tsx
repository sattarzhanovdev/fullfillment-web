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
import { Users, PackageCheck, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackingOrder {
  id: string;
  orderNumber: string;
  status: string;
  packagingTypeId: string | null;
  items: {
    id: string;
    qtyNeeded: number;
    qtyPicked: number;
    qtyPacked: number;
    product: { id: string; name: string; article: string; barcode: string };
  }[];
}

interface FlatItem {
  itemId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  qtyNeeded: number;
  qtyPicked: number;
  qtyPacked: number;
  product: { id: string; name: string; article: string; barcode: string };
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

export default function FbsPackingPage() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["packing-orders", clientId],
    queryFn: async () =>
      (await apiClient.get<PackingOrder[]>("/orders", { params: { clientId, status: "PICKED,PACKING" } })).data,
    enabled: !!clientId,
    refetchInterval: 10_000,
  });

  const { data: packagingTypes } = useQuery({
    queryKey: ["packaging"],
    queryFn: async () => (await apiClient.get("/packaging", { params: { activeOnly: "true" } })).data,
  });

  const flatItems: FlatItem[] = useMemo(() => {
    if (!orders) return [];
    const rows: FlatItem[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (item.qtyPicked <= 0) continue;
        rows.push({
          itemId: item.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          qtyNeeded: item.qtyNeeded,
          qtyPicked: item.qtyPicked,
          qtyPacked: item.qtyPacked,
          product: item.product,
        });
      }
    }
    return rows.sort((a, b) => Number(a.qtyPacked >= a.qtyNeeded) - Number(b.qtyPacked >= b.qtyNeeded));
  }, [orders]);

  const ordersReadyForPackaging = useMemo(
    () => (orders ?? []).filter((o) => o.items.length > 0 && o.items.every((i) => i.qtyPacked >= i.qtyNeeded) && !o.packagingTypeId),
    [orders],
  );

  const packMutation = useMutation({
    mutationFn: async (params: { orderId: string; barcode: string; itemId: string }) =>
      apiClient.post(`/orders/${params.orderId}/pack`, { barcode: params.barcode }),
    onSuccess: (_res, variables) => {
      setScanError(null);
      setFlashIds((f) => ({ ...f, [variables.itemId]: true }));
      playBeep(true);
      queryClient.invalidateQueries({ queryKey: ["packing-orders", clientId] });
      setTimeout(() => setFlashIds((f) => { const n = { ...f }; delete n[variables.itemId]; return n; }), 1200);
    },
    onError: (err) => {
      setScanError(apiErrorMessage(err, "Неверный товар"));
      playBeep(false);
    },
  });

  const packagingMutation = useMutation({
    mutationFn: async (params: { orderId: string; packagingTypeId: string }) =>
      apiClient.patch(`/orders/${params.orderId}/packaging`, { packagingTypeId: params.packagingTypeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packing-orders", clientId] }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [clientId]);

  function handleScanSubmit() {
    const barcode = scanValue.trim();
    setScanValue("");
    if (!barcode || !flatItems.length) return;

    const match = flatItems.find((i) => i.product.barcode === barcode && i.qtyPacked < i.qtyPicked);
    if (!match) {
      setScanError("Неверный товар: штрихкод не найден среди собранных позиций");
      playBeep(false);
      return;
    }
    packMutation.mutate({ orderId: match.orderId, barcode, itemId: match.itemId });
  }

  return (
    <div onClick={() => inputRef.current?.focus()}>
      <PageHeader title="FBS · Упаковка" description="Сканируйте уже собранные товары, чтобы упаковать заказ" />

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

      {!clientId ? (
        <EmptyState icon={Users} title="Выберите клиента" description="После выбора появится список собранных товаров" />
      ) : (
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

          {ordersReadyForPackaging.length > 0 && (
            <Card className="mb-5 p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
                <PackageCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
                Заказы, готовые к упаковке — выберите тип упаковки
              </p>
              <div className="flex flex-col gap-2.5">
                {ordersReadyForPackaging.map((order) => (
                  <PackagingRow
                    key={order.id}
                    orderNumber={order.orderNumber}
                    options={packagingTypes ?? []}
                    onSubmit={(packagingTypeId) => packagingMutation.mutate({ orderId: order.id, packagingTypeId })}
                    pending={packagingMutation.isPending}
                  />
                ))}
              </div>
            </Card>
          )}

          {isLoading ? (
            <LoadingBlock />
          ) : flatItems.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Нет собранных товаров" description="Сначала соберите заказы на экране сборки" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <Thead>
                  <tr>
                    <Th>Товар</Th>
                    <Th>Артикул</Th>
                    <Th>Штрихкод</Th>
                    <Th>Собрано</Th>
                    <Th>Упаковано</Th>
                    <Th>Заказ</Th>
                    <Th>Статус</Th>
                  </tr>
                </Thead>
                <tbody>
                  {flatItems.map((item) => {
                    const done = item.qtyPacked >= item.qtyPicked;
                    const flash = flashIds[item.itemId];
                    return (
                      <Tr key={item.itemId} className={cn(done && "opacity-50", flash && "bg-[var(--color-success-bg)]")}>
                        <Td className="font-medium">{item.product.name}</Td>
                        <Td>{item.product.article}</Td>
                        <Td className="font-mono text-[12.5px]">{item.product.barcode}</Td>
                        <Td>{item.qtyPicked}</Td>
                        <Td>{item.qtyPacked}</Td>
                        <Td>№{item.orderNumber}</Td>
                        <Td>{done ? <Badge variant="success">Упаковано</Badge> : <Badge variant="accent">В работе</Badge>}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PackagingRow({
  orderNumber,
  options,
  onSubmit,
  pending,
}: {
  orderNumber: string;
  options: { id: string; name: string }[];
  onSubmit: (packagingTypeId: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[13px] font-medium">№{orderNumber}</span>
      <Select value={value} onChange={(e) => setValue(e.target.value)} className="flex-1">
        <option value="">Выберите упаковку</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <Button size="sm" disabled={!value || pending} onClick={() => onSubmit(value)}>
        Упаковать
      </Button>
    </div>
  );
}
