"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  PackageOpen,
  PackagePlus,
  Truck,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { useAuthStore } from "@/lib/auth-store";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

interface DashboardSummary {
  totalClients: number;
  activeClients: number;
  totalProducts: number;
  totalStockUnits: number;
  ordersToday: number;
  ordersPicking: number;
  ordersPacked: number;
  ordersAwaitingShipment: number;
  shippedToday: number;
  fbsOrdersCount: number;
  fboSuppliesCount: number;
  revenueDay: number;
  revenueMonth: number;
  totalDebt: number;
  blockedDebtOrders: number;
  needsPriceOrders: number;
  productsWithoutDimensions: number;
  criticalStockCount: number;
}

interface TrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface AttentionOrder {
  id: string;
  orderNumber: string;
  status: string;
  updatedAt: string;
  client: { id: string; name: string };
}

interface LowStockRow {
  available: number;
  product: { id: string; name: string; article: string; client: { id: string; name: string } };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  client: { id: string; name: string };
}

interface UpcomingShipment {
  id: string;
  scheduledAt: string;
  transport: string | null;
  driverName: string | null;
  status: string;
  _count: { orders: number; supplies: number };
}

const SHIPMENT_STATUS: Record<string, { label: string; variant: "neutral" | "accent" | "success" | "warning" | "danger" }> = {
  PLANNED: { label: "Планируется", variant: "neutral" },
  IN_PROGRESS: { label: "В процессе", variant: "accent" },
  SHIPPED: { label: "Отгружено", variant: "success" },
  COMPLETED: { label: "Завершено", variant: "success" },
  CANCELLED: { label: "Отменено", variant: "neutral" },
  OVERDUE: { label: "Просрочено", variant: "danger" },
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

const QUICK_ACTIONS = [
  { label: "Новый заказ", href: "/fbs/orders", icon: ClipboardList },
  { label: "Новая поставка", href: "/fbo/supplies", icon: PackagePlus },
  { label: "Приёмка", href: "/receiving", icon: PackageOpen },
  { label: "Инвентаризация", href: "/warehouse/inventory", icon: ClipboardCheck },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await apiClient.get<DashboardSummary>("/dashboard/summary")).data,
    refetchInterval: 60_000,
  });
  const { data: trend } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: async () => (await apiClient.get<TrendPoint[]>("/dashboard/trend", { params: { days: 14 } })).data,
  });
  const { data: attention } = useQuery({
    queryKey: ["dashboard-attention"],
    queryFn: async () => (await apiClient.get<AttentionOrder[]>("/dashboard/attention")).data,
    refetchInterval: 30_000,
  });
  const { data: lowStock } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => (await apiClient.get<LowStockRow[]>("/dashboard/low-stock")).data,
  });
  const { data: recentOrders } = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: async () => (await apiClient.get<RecentOrder[]>("/dashboard/recent-orders")).data,
    refetchInterval: 30_000,
  });
  const { data: upcomingShipments } = useQuery({
    queryKey: ["dashboard-upcoming-shipments"],
    queryFn: async () => (await apiClient.get<UpcomingShipment[]>("/dashboard/upcoming-shipments")).data,
  });

  const attentionCount = attention?.length ?? 0;
  const revenueTrendTotal = useMemo(() => (trend ?? []).reduce((s, p) => s + p.revenue, 0), [trend]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {greeting()}{user ? `, ${user.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--color-foreground-muted)]">
            {new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.href} variant="secondary" size="sm" asChild>
              <Link href={action.href}>
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <LoadingBlock label="Загрузка показателей…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            <StatCard label="Заказов сегодня" value={data.ordersToday} />
            <StatCard label="Отгружено сегодня" value={data.shippedToday} tone="success" />
            <StatCard label="Выручка за день" value={formatMoney(data.revenueDay)} tone="success" />
            <StatCard
              label="Требует внимания"
              value={attentionCount}
              tone={attentionCount > 0 ? "danger" : "neutral"}
              hint={attentionCount > 0 ? "заказы с проблемами" : "всё в порядке"}
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Динамика за 14 дней</CardTitle>
                <CardDescription>Выручка: {formatMoney(revenueTrendTotal)} суммарно</CardDescription>
              </div>
              <Link
                href="/analytics"
                className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-accent)] hover:underline"
              >
                Вся аналитика <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              {!trend ? (
                <LoadingBlock />
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={trend} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[var(--shadow-elevated)]">
                            <p className="font-medium">
                              {new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(label ?? Date.now()))}
                            </p>
                            <p style={{ color: "var(--color-accent)" }}>Выручка: {formatMoney(payload[0]?.value as number)}</p>
                            <p className="text-[var(--color-foreground-muted)]">Заказов: {payload[0]?.payload.orders}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2} fill="url(#dashRevenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                  Требует внимания
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {!attention || attention.length === 0 ? (
                  <EmptyState title="Проблемных заказов нет" description="Все заказы обрабатываются штатно" />
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-border)]">
                    {attention.map((o) => (
                      <Link
                        key={o.id}
                        href={`/fbs/orders/${o.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-70"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium">№{o.orderNumber}</p>
                          <p className="truncate text-[12px] text-[var(--color-foreground-muted)]">{o.client.name}</p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <PackageOpen className="h-4 w-4 text-[var(--color-danger)]" />
                  Критические остатки
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {!lowStock || lowStock.length === 0 ? (
                  <EmptyState title="Дефицита нет" description="Остатки в норме" />
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-border)]">
                    {lowStock.map((row) => (
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Последние заказы</CardTitle>
                <Link href="/fbs/orders" className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                  Все заказы
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {!recentOrders || recentOrders.length === 0 ? (
                  <EmptyState title="Заказов пока нет" />
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-border)]">
                    {recentOrders.map((o) => (
                      <Link
                        key={o.id}
                        href={`/fbs/orders/${o.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-70"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium">№{o.orderNumber}</p>
                          <p className="truncate text-[12px] text-[var(--color-foreground-muted)]">
                            {o.client.name} · {formatDateTime(o.createdAt)}
                          </p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-[var(--color-accent)]" />
                  Ближайшие отгрузки
                </CardTitle>
                <Link href="/calendar" className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                  Календарь
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {!upcomingShipments || upcomingShipments.length === 0 ? (
                  <EmptyState title="Отгрузок не запланировано" />
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-border)]">
                    {upcomingShipments.map((s) => {
                      const meta = SHIPMENT_STATUS[s.status] ?? { label: s.status, variant: "neutral" as const };
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium">{formatDateTime(s.scheduledAt)}</p>
                            <p className="truncate text-[12px] text-[var(--color-foreground-muted)]">
                              {s._count.orders + s._count.supplies} отправлений
                              {s.transport ? ` · ${s.transport}` : ""}
                            </p>
                          </div>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Показатели</CardTitle>
              <CardDescription>Полная сводка по складу, заказам и финансам</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3 xl:grid-cols-5">
              <StatCard label="Всего клиентов" value={data.totalClients} />
              <StatCard label="Активных клиентов" value={data.activeClients} />
              <StatCard label="Товаров на складе" value={data.totalProducts} />
              <StatCard label="Остаток товаров, шт" value={data.totalStockUnits} />
              <StatCard label="Заказов в сборке" value={data.ordersPicking} />
              <StatCard label="Заказов упаковано" value={data.ordersPacked} />
              <StatCard label="Ожидает отгрузки" value={data.ordersAwaitingShipment} />
              <StatCard label="FBS заказов" value={data.fbsOrdersCount} />
              <StatCard label="FBO поставок" value={data.fboSuppliesCount} />
              <StatCard label="Выручка за месяц" value={formatMoney(data.revenueMonth)} tone="success" />
              <StatCard label="Долги клиентов" value={formatMoney(data.totalDebt)} tone={data.totalDebt > 0 ? "warning" : "neutral"} />
              <StatCard
                label="Заблокировано по долгу"
                value={data.blockedDebtOrders}
                tone={data.blockedDebtOrders > 0 ? "danger" : "neutral"}
              />
              <StatCard
                label="Требуют цены"
                value={data.needsPriceOrders}
                tone={data.needsPriceOrders > 0 ? "warning" : "neutral"}
              />
              <StatCard label="Товары без габаритов" value={data.productsWithoutDimensions} />
              <StatCard
                label="Критический остаток"
                value={data.criticalStockCount}
                tone={data.criticalStockCount > 0 ? "danger" : "neutral"}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
