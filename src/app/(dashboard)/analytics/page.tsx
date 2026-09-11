"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, TrendingDown, TrendingUp, Trophy, Wallet, ShoppingCart, CircleCheck, PackageOpen } from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Cell,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingBlock } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/table";
import { cn, exportToCsv, formatMoney, formatPercent } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, type BadgeVariant } from "@/lib/status";
import type { Client } from "@/lib/types";

interface User {
  id: string;
  fullName: string;
}

interface TimeSeriesPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  productId: string;
  name: string;
  article: string;
  qty: number;
}

interface TopClient {
  clientId: string;
  name: string;
  revenue: number;
}

interface Comparison {
  current: { revenue: number; orders: number };
  previous: { revenue: number; orders: number };
  change: { revenuePct: number; ordersPct: number };
}

interface LowStockRow {
  available: number;
  product: { id: string; name: string; article: string; client: { id: string; name: string } };
}

function toIso(dateStr: string) {
  return new Date(dateStr).toISOString();
}

/** Аккуратное форматирование длительности: секунды для коротких значений, чтобы "0 мин" не выглядело как отсутствие данных. */
function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)} сек`;
  return `${Math.round(ms / 60000)} мин`;
}

function durationMinutes(ms: number | null): number {
  if (ms === null || ms === undefined) return 0;
  return Math.round((ms / 60000) * 10) / 10;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
}

const VARIANT_COLOR: Record<BadgeVariant, string> = {
  neutral: "var(--color-foreground-muted)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  reserve: "var(--color-reserve)",
};

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "Квартал", days: 90 },
  { label: "Год", days: 365 },
];

function ChangeBadge({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium",
        positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
      )}
    >
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {formatPercent(pct)}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] shadow-[var(--shadow-elevated)]">
      <p className="mb-1 font-medium text-[var(--color-foreground)]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === "revenue" ? formatMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/** Универсальный горизонтальный bar-chart: список подписей с числом и цветной полосой. Аккуратно занимает ровно столько места, сколько нужно, без обрезки колонок. */
function HorizontalBarList({
  data,
  dataKey,
  labelKey,
  colorFor,
  valueFormatter,
  onBarClick,
  emptyLabel = "Нет данных за период",
}: {
  data: Record<string, any>[];
  dataKey: string;
  labelKey: string;
  colorFor?: (row: any, index: number) => string;
  valueFormatter?: (value: number) => string;
  onBarClick?: (row: any) => void;
  emptyLabel?: string;
}) {
  if (!data || data.length === 0) return <EmptyState title={emptyLabel} />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48 }}>
        <XAxis type="number" hide allowDecimals={false} domain={[0, (max: number) => Math.ceil(max * 1.2) || 1]} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={150}
          tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-2)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] shadow-[var(--shadow-elevated)]">
                {payload[0].payload[labelKey]} — {valueFormatter ? valueFormatter(payload[0].value as number) : payload[0].value}
              </div>
            ) : null
          }
        />
        <Bar
          dataKey={dataKey}
          radius={[0, 6, 6, 0]}
          barSize={18}
          onClick={onBarClick ? (d: any) => onBarClick(d) : undefined}
          cursor={onBarClick ? "pointer" : undefined}
          label={{
            position: "right",
            fontSize: 12,
            fill: "var(--color-foreground-muted)",
            formatter: (v: any) => (valueFormatter ? valueFormatter(Number(v)) : String(v ?? "")),
          }}
        >
          {data.map((row, i) => (
            <Cell key={i} fill={colorFor ? colorFor(row, i) : "var(--color-accent)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState("overview");

  const range = useMemo(() => ({ from: toIso(from), to: toIso(to + "T23:59:59") }), [from, to]);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });
  const clientMap = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.name])), [clients]);

  const { data: users } = useQuery({
    queryKey: ["users-for-kpi"],
    queryFn: async () => (await apiClient.get<User[]>("/users")).data,
  });
  const userMap = useMemo(() => new Map((users ?? []).map((u) => [u.id, u.fullName])), [users]);

  const comparisonQuery = useQuery({
    queryKey: ["analytics-comparison", range],
    queryFn: async () => (await apiClient.get<Comparison>("/analytics/comparison", { params: range })).data,
  });
  const timeSeriesQuery = useQuery({
    queryKey: ["analytics-timeseries", range],
    queryFn: async () => (await apiClient.get<TimeSeriesPoint[]>("/analytics/timeseries", { params: range })).data,
  });
  const topProductsQuery = useQuery({
    queryKey: ["analytics-top-products", range],
    queryFn: async () => (await apiClient.get<TopProduct[]>("/analytics/top-products", { params: { ...range, limit: 8 } })).data,
  });
  const topClientsQuery = useQuery({
    queryKey: ["analytics-top-clients", range],
    queryFn: async () => (await apiClient.get<TopClient[]>("/analytics/top-clients", { params: { ...range, limit: 8 } })).data,
  });
  const ordersQuery = useQuery({
    queryKey: ["analytics-orders", range],
    queryFn: async () => (await apiClient.get("/analytics/orders", { params: range })).data,
  });
  const warehouseQuery = useQuery({
    queryKey: ["analytics-warehouse"],
    queryFn: async () => (await apiClient.get("/analytics/warehouse")).data,
  });
  const financeQuery = useQuery({
    queryKey: ["analytics-finance", range],
    queryFn: async () => (await apiClient.get("/analytics/finance", { params: range })).data,
  });
  const efficiencyQuery = useQuery({
    queryKey: ["analytics-efficiency", range],
    queryFn: async () => (await apiClient.get("/analytics/efficiency", { params: range })).data,
  });
  const kpiQuery = useQuery({
    queryKey: ["analytics-kpi", range],
    queryFn: async () => (await apiClient.get("/analytics/kpi", { params: range })).data,
  });
  const lowStockQuery = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => (await apiClient.get<LowStockRow[]>("/dashboard/low-stock")).data,
    enabled: activeTab === "warehouse",
  });

  // Производные данные для вкладки «Заказы»
  const totalOrders = ordersQuery.data?.byStatus?.reduce((s: number, r: any) => s + r._count, 0) ?? 0;
  const cancelledCount = ordersQuery.data?.byStatus?.find((r: any) => r.status === "CANCELLED")?._count ?? 0;
  const avgCheck = totalOrders > 0 && financeQuery.data ? financeQuery.data.charged / totalOrders : 0;

  const statusRows = useMemo(
    () =>
      (ordersQuery.data?.byStatus ?? [])
        .map((r: any) => ({ status: ORDER_STATUS_LABELS[r.status] ?? r.status, count: r._count, raw: r.status }))
        .sort((a: any, b: any) => b.count - a.count),
    [ordersQuery.data],
  );
  const clientOrderRows = useMemo(
    () =>
      (ordersQuery.data?.byClient ?? [])
        .map((r: any) => ({ client: clientMap.get(r.clientId) ?? "—", count: r._count, clientId: r.clientId }))
        .sort((a: any, b: any) => b.count - a.count),
    [ordersQuery.data, clientMap],
  );

  const warehouseBars = warehouseQuery.data
    ? [
        { label: "Физический остаток", value: warehouseQuery.data.totalPhysical, color: "var(--color-foreground-muted)" },
        { label: "В резерве", value: warehouseQuery.data.totalReserved, color: "var(--color-reserve)" },
        { label: "Доступно", value: warehouseQuery.data.totalAvailable, color: "var(--color-success)" },
      ]
    : [];

  const financeBars = financeQuery.data
    ? [
        { label: "Начислено", value: financeQuery.data.charged, color: "var(--color-success)" },
        { label: "Оплачено", value: financeQuery.data.paid, color: "var(--color-accent)" },
        { label: "Задолженность", value: financeQuery.data.currentDebt, color: "var(--color-warning)" },
      ]
    : [];

  const efficiencyBars = efficiencyQuery.data
    ? [
        { label: "Сборка", value: durationMinutes(efficiencyQuery.data.avgPickingMs), color: "var(--color-accent)" },
        { label: "Упаковка", value: durationMinutes(efficiencyQuery.data.avgPackingMs), color: "var(--color-reserve)" },
        { label: "Заказ → отгрузка", value: durationMinutes(efficiencyQuery.data.avgOrderToShipMs), color: "var(--color-success)" },
      ]
    : [];

  function kpiRows(data: Record<string, number> | undefined) {
    return Object.entries(data ?? {})
      .map(([userId, count]) => ({ userId, name: userMap.get(userId) ?? userId, count }))
      .sort((a, b) => b.count - a.count);
  }
  const pickedRows = kpiRows(kpiQuery.data?.ordersPickedByUser);
  const packedRows = kpiRows(kpiQuery.data?.ordersPackedByUser);
  const receiptRows = kpiRows(kpiQuery.data?.receiptsByUser);

  function handleExport() {
    if (activeTab === "overview" && timeSeriesQuery.data) {
      exportToCsv(
        `analytics-overview_${from}_${to}`,
        timeSeriesQuery.data.map((p) => ({ Дата: p.date, Заказов: p.orders, Выручка: p.revenue })),
      );
    } else if (activeTab === "orders") {
      exportToCsv(`analytics-orders_${from}_${to}`, [
        ...statusRows.map((r: any) => ({ Категория: "Статус", Значение: r.status, Количество: r.count })),
        ...clientOrderRows.map((r: any) => ({ Категория: "Клиент", Значение: r.client, Количество: r.count })),
      ]);
    } else if (activeTab === "finance" && financeQuery.data) {
      exportToCsv(`analytics-finance_${from}_${to}`, [
        { Показатель: "Начислено", Значение: financeQuery.data.charged },
        { Показатель: "Оплачено", Значение: financeQuery.data.paid },
        { Показатель: "Текущая задолженность", Значение: financeQuery.data.currentDebt },
      ]);
    } else if (activeTab === "kpi") {
      exportToCsv(`analytics-kpi_${from}_${to}`, [
        ...pickedRows.map((r) => ({ Сотрудник: r.name, Показатель: "Собрано заказов", Значение: r.count })),
        ...packedRows.map((r) => ({ Сотрудник: r.name, Показатель: "Упаковано заказов", Значение: r.count })),
        ...receiptRows.map((r) => ({ Сотрудник: r.name, Показатель: "Приёмок оформлено", Значение: r.count })),
      ]);
    } else if (activeTab === "warehouse" && warehouseQuery.data) {
      exportToCsv(`analytics-warehouse_${from}_${to}`, [
        { Показатель: "Физический остаток", Значение: warehouseQuery.data.totalPhysical },
        { Показатель: "В резерве", Значение: warehouseQuery.data.totalReserved },
        { Показатель: "Доступно", Значение: warehouseQuery.data.totalAvailable },
        { Показатель: "Дефицит (≤5 шт)", Значение: warehouseQuery.data.lowStockCount },
        { Показатель: "Залежавшиеся товары", Значение: warehouseQuery.data.staleProductsCount },
      ]);
    } else if (activeTab === "efficiency" && efficiencyQuery.data) {
      exportToCsv(`analytics-efficiency_${from}_${to}`, [
        { Показатель: "Среднее время сборки", Значение: formatDuration(efficiencyQuery.data.avgPickingMs) },
        { Показатель: "Среднее время упаковки", Значение: formatDuration(efficiencyQuery.data.avgPackingMs) },
        { Показатель: "От заказа до отгрузки", Значение: formatDuration(efficiencyQuery.data.avgOrderToShipMs) },
        { Показатель: "Товар не найден, %", Значение: (efficiencyQuery.data.itemNotFoundRatio * 100).toFixed(1) },
      ]);
    }
  }

  return (
    <div>
      <PageHeader
        title="Аналитика"
        description="Отчёты для руководителя: заказы, склад, финансы, эффективность"
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Экспорт CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Печать / PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-6 print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 !p-4">
          <div>
            <Label htmlFor="from">С</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label htmlFor="to">По</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-1.5 pb-0.5">
            {PRESETS.map((p) => (
              <Button key={p.days} type="button" variant="ghost" size="sm" onClick={() => applyPreset(p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 hidden text-[12px] text-[var(--color-foreground-muted)] print:block">
        Период: {from} — {to}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5 flex-wrap print:hidden">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="warehouse">Склад</TabsTrigger>
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="efficiency">Эффективность</TabsTrigger>
          <TabsTrigger value="kpi">KPI сотрудников</TabsTrigger>
        </TabsList>

        {/* ---------- ОБЗОР ---------- */}
        <TabsContent value="overview" className="flex flex-col gap-5">
          {comparisonQuery.isLoading || !comparisonQuery.data ? (
            <LoadingBlock />
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Выручка за период"
                value={formatMoney(comparisonQuery.data.current.revenue)}
                tone="success"
                icon={Wallet}
                hint={<ChangeBadge pct={comparisonQuery.data.change.revenuePct} />}
              />
              <StatCard
                label="Заказов за период"
                value={comparisonQuery.data.current.orders}
                tone="accent"
                icon={ShoppingCart}
                hint={<ChangeBadge pct={comparisonQuery.data.change.ordersPct} />}
              />
              <StatCard
                label="Текущая задолженность"
                value={financeQuery.data ? formatMoney(financeQuery.data.currentDebt) : "—"}
                tone={financeQuery.data?.currentDebt > 0 ? "warning" : "neutral"}
                icon={Wallet}
              />
              <StatCard
                label="Дефицит склада"
                value={warehouseQuery.data?.lowStockCount ?? "—"}
                tone={warehouseQuery.data?.lowStockCount > 0 ? "danger" : "neutral"}
                icon={PackageOpen}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Динамика заказов и выручки</CardTitle>
              <CardDescription>По дням за выбранный период</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {timeSeriesQuery.isLoading || !timeSeriesQuery.data ? (
                <LoadingBlock />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={timeSeriesQuery.data} margin={{ left: -10 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11.5, fill: "var(--color-foreground-muted)" }}
                      axisLine={{ stroke: "var(--color-border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="orders"
                      allowDecimals={false}
                      tick={{ fontSize: 11.5, fill: "var(--color-foreground-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="right"
                      tick={{ fontSize: 11.5, fill: "var(--color-foreground-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      name="Выручка"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                    <Bar yAxisId="orders" dataKey="orders" name="Заказы" fill="var(--color-reserve)" radius={[4, 4, 0, 0]} barSize={16} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Топ товаров</CardTitle>
                <CardDescription>По количеству в заказах</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {topProductsQuery.isLoading ? (
                  <LoadingBlock />
                ) : (
                  <HorizontalBarList
                    data={topProductsQuery.data ?? []}
                    dataKey="qty"
                    labelKey="name"
                    valueFormatter={(v) => `${v} шт.`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ клиентов</CardTitle>
                <CardDescription>По обороту за период — клик открывает карточку</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {topClientsQuery.isLoading ? (
                  <LoadingBlock />
                ) : (
                  <HorizontalBarList
                    data={topClientsQuery.data ?? []}
                    dataKey="revenue"
                    labelKey="name"
                    colorFor={() => "var(--color-reserve)"}
                    valueFormatter={(v) => formatMoney(v)}
                    onBarClick={(row) => router.push(`/clients/${row.clientId}`)}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------- ЗАКАЗЫ ---------- */}
        <TabsContent value="orders" className="flex flex-col gap-5">
          {ordersQuery.isLoading ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Всего заказов" value={totalOrders} />
                <StatCard label="Средний чек" value={formatMoney(avgCheck)} tone="success" />
                <StatCard
                  label="Отменено"
                  value={`${cancelledCount} (${totalOrders ? ((cancelledCount / totalOrders) * 100).toFixed(1) : 0}%)`}
                  tone={cancelledCount > 0 ? "warning" : "neutral"}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>По статусам</CardTitle>
                    <CardDescription>Распределение заказов по воронке</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <HorizontalBarList
                      data={statusRows}
                      dataKey="count"
                      labelKey="status"
                      colorFor={(row) => VARIANT_COLOR[ORDER_STATUS_VARIANT[row.raw] ?? "neutral"]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>По клиентам</CardTitle>
                    <CardDescription>Клик открывает карточку клиента</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <HorizontalBarList
                      data={clientOrderRows}
                      dataKey="count"
                      labelKey="client"
                      colorFor={() => "var(--color-accent)"}
                      onBarClick={(row) => router.push(`/clients/${row.clientId}`)}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ---------- СКЛАД ---------- */}
        <TabsContent value="warehouse" className="flex flex-col gap-5">
          {warehouseQuery.isLoading || !warehouseQuery.data ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Физический остаток" value={warehouseQuery.data.totalPhysical} />
                <StatCard label="В резерве" value={warehouseQuery.data.totalReserved} />
                <StatCard label="Доступно" value={warehouseQuery.data.totalAvailable} />
                <StatCard
                  label="Дефицит (≤5 шт)"
                  value={warehouseQuery.data.lowStockCount}
                  tone={warehouseQuery.data.lowStockCount > 0 ? "warning" : "neutral"}
                />
                <StatCard label="Залежавшиеся товары" value={warehouseQuery.data.staleProductsCount} />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Структура остатка</CardTitle>
                    <CardDescription>Физический / резерв / доступно, шт.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <HorizontalBarList
                      data={warehouseBars}
                      dataKey="value"
                      labelKey="label"
                      colorFor={(row) => row.color}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Дефицитные товары</CardTitle>
                    <CardDescription>Доступно ≤ 5 шт.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {lowStockQuery.isLoading ? (
                      <LoadingBlock />
                    ) : !lowStockQuery.data || lowStockQuery.data.length === 0 ? (
                      <EmptyState icon={CircleCheck} title="Дефицита нет" description="Остатки в норме" />
                    ) : (
                      <div className="flex flex-col divide-y divide-[var(--color-border)]">
                        {lowStockQuery.data.map((row) => (
                          <div key={row.product.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-medium">{row.product.name}</p>
                              <p className="truncate text-[12px] text-[var(--color-foreground-muted)]">
                                {row.product.article} · {row.product.client.name}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-semibold",
                                row.available <= 0 ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]",
                              )}
                            >
                              {row.available} шт.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ---------- ФИНАНСЫ ---------- */}
        <TabsContent value="finance" className="flex flex-col gap-5">
          {financeQuery.isLoading || !financeQuery.data ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Начислено" value={formatMoney(financeQuery.data.charged)} tone="success" />
                <StatCard label="Оплачено" value={formatMoney(financeQuery.data.paid)} />
                <StatCard
                  label="Текущая задолженность"
                  value={formatMoney(financeQuery.data.currentDebt)}
                  tone={financeQuery.data.currentDebt > 0 ? "warning" : "neutral"}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Динамика выручки</CardTitle>
                    <CardDescription>По дням за выбранный период</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {!timeSeriesQuery.data ? (
                      <LoadingBlock />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={timeSeriesQuery.data} margin={{ left: -10 }}>
                          <defs>
                            <linearGradient id="financeRevenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={shortDate}
                            tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
                            axisLine={{ stroke: "var(--color-border)" }}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }} axisLine={false} tickLine={false} width={48} />
                          <Tooltip
                            content={({ active, payload, label }) =>
                              active && payload?.length ? (
                                <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[var(--shadow-elevated)]">
                                  <p className="font-medium">{label}</p>
                                  <p style={{ color: "var(--color-success)" }}>Выручка: {formatMoney(payload[0]?.value as number)}</p>
                                </div>
                              ) : null
                            }
                          />
                          <Area type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={2} fill="url(#financeRevenueFill)" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Начислено / оплачено / долг</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <HorizontalBarList data={financeBars} dataKey="value" labelKey="label" colorFor={(row) => row.color} valueFormatter={(v) => formatMoney(v)} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ---------- ЭФФЕКТИВНОСТЬ ---------- */}
        <TabsContent value="efficiency" className="flex flex-col gap-5">
          {efficiencyQuery.isLoading || !efficiencyQuery.data ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Среднее время сборки" value={formatDuration(efficiencyQuery.data.avgPickingMs)} />
                <StatCard label="Среднее время упаковки" value={formatDuration(efficiencyQuery.data.avgPackingMs)} />
                <StatCard label="От заказа до отгрузки" value={formatDuration(efficiencyQuery.data.avgOrderToShipMs)} />
                <StatCard
                  label="Товар не найден"
                  value={`${(efficiencyQuery.data.itemNotFoundRatio * 100).toFixed(1)}%`}
                  tone={efficiencyQuery.data.itemNotFoundRatio > 0 ? "danger" : "neutral"}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Сравнение этапов обработки</CardTitle>
                  <CardDescription>Среднее время, минут</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <HorizontalBarList
                    data={efficiencyBars}
                    dataKey="value"
                    labelKey="label"
                    colorFor={(row) => row.color}
                    valueFormatter={(v) => `${v} мин`}
                    emptyLabel="Недостаточно данных за период"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------- KPI ---------- */}
        <TabsContent value="kpi" className="flex flex-col gap-5">
          {kpiQuery.isLoading ? (
            <LoadingBlock />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <KpiCard title="Собрано заказов" rows={pickedRows} />
              <KpiCard title="Упаковано заказов" rows={packedRows} />
              <KpiCard title="Приёмок оформлено" rows={receiptRows} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ title, rows }: { title: string; rows: { userId: string; name: string; count: number }[] }) {
  const leader = rows[0];
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {leader && leader.count > 0 ? (
          <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-warning)]">
            <Trophy className="h-3.5 w-3.5" />
            {leader.name}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        <HorizontalBarList data={rows} dataKey="count" labelKey="name" colorFor={() => "var(--color-accent)"} />
      </CardContent>
    </Card>
  );
}
