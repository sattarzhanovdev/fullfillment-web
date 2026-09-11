"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, Subcard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { MARKETPLACE_LABELS } from "@/lib/status";

interface ShipmentClient {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  scheduledAt: string;
  status: string;
  marketplace: string | null;
  transport: string | null;
  driverName: string | null;
  boxesCount: number | null;
  totalWeightKg: string | null;
  totalVolumeL: string | null;
  warehouse: { id: string; name: string } | null;
  orders: { id: string; orderNumber: string; client: ShipmentClient }[];
  supplies: { id: string; supplyNumber: string; client: ShipmentClient }[];
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function statusTone(shipment: Shipment): "neutral" | "accent" | "success" | "danger" {
  const isOverduePlanned = shipment.status === "PLANNED" && new Date(shipment.scheduledAt) < new Date();
  if (shipment.status === "OVERDUE" || isOverduePlanned) return "danger";
  if (shipment.status === "CANCELLED") return "neutral";
  if (shipment.status === "SHIPPED" || shipment.status === "COMPLETED") return "success";
  if (shipment.status === "IN_PROGRESS") return "accent";
  return "neutral";
}

function toneClasses(tone: "neutral" | "accent" | "success" | "danger") {
  return {
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-foreground-muted)] border-[var(--color-border)]",
    accent: "bg-[var(--color-accent)]/12 text-[var(--color-accent)] border-transparent",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-transparent",
    danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-transparent",
  }[tone];
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Shipment | null>(null);

  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  const { data, isLoading } = useQuery({
    queryKey: ["shipments-calendar", monthStart.toISOString()],
    queryFn: async () =>
      (
        await apiClient.get<Shipment[]>("/shipments", {
          params: { from: monthStart.toISOString(), to: monthEnd.toISOString() },
        })
      ).data,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Shipment[]>();
    for (const s of data ?? []) {
      const key = new Date(s.scheduledAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [data]);

  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor);
  const today = new Date().toDateString();

  return (
    <div>
      <PageHeader
        title="Календарь отгрузок"
        description="FBO-поставки, FBS-отгрузки и дедлайны маркетплейсов"
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-[13.5px] font-medium capitalize">{monthLabel}</span>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2 text-center text-[11.5px] font-semibold uppercase text-[var(--color-foreground-muted)]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridDays.map((day, i) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const shipments = byDay.get(day.toDateString()) ?? [];
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[110px] border-b border-r border-[var(--color-border)] p-2 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-[var(--color-surface-2)]/40",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]",
                      day.toDateString() === today && "bg-[var(--color-accent)] font-semibold text-white",
                      !inMonth && "text-[var(--color-foreground-muted)]",
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {shipments.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className={cn(
                          "truncate rounded-[6px] border px-1.5 py-0.5 text-left text-[11px] font-medium",
                          toneClasses(statusTone(s)),
                        )}
                      >
                        {s.marketplace ? MARKETPLACE_LABELS[s.marketplace] ?? s.marketplace : "Отгрузка"} ·{" "}
                        {new Date(s.scheduledAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    ))}
                    {shipments.length > 3 && (
                      <span className="text-[11px] text-[var(--color-foreground-muted)]">ещё {shipments.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent title={`Отгрузка ${formatDateTime(selected.scheduledAt)}`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[13.5px]">
                <span className="text-[var(--color-foreground-muted)]">Статус</span>
                <Badge variant={statusTone(selected) === "danger" ? "danger" : statusTone(selected) === "success" ? "success" : "neutral"}>
                  {selected.status}
                </Badge>
              </div>
              <Subcard className="flex flex-col divide-y divide-[var(--color-border)] px-3.5">
                <Row label="Маркетплейс" value={selected.marketplace ? MARKETPLACE_LABELS[selected.marketplace] ?? selected.marketplace : "—"} />
                <Row label="Склад" value={selected.warehouse?.name ?? "—"} />
                <Row label="Транспорт" value={selected.transport ?? "—"} />
                <Row label="Водитель" value={selected.driverName ?? "—"} />
                <Row label="Коробок" value={selected.boxesCount ?? "—"} />
                <Row label="Вес, кг" value={selected.totalWeightKg ?? "—"} />
                <Row label="Объём, л" value={selected.totalVolumeL ?? "—"} />
                <Row label="FBS-заказов" value={selected.orders.length} />
                <Row label="FBO-поставок" value={selected.supplies.length} />
              </Subcard>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-[13.5px]">
      <span className="text-[var(--color-foreground-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
