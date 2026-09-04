"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/utils";
import { DEBT_STATE_LABELS, DEBT_STATE_VARIANT } from "@/lib/status";

interface ClientAnalytics {
  ordersCount: number;
  fbsCount: number;
  fboCount: number;
  revenue: number;
  debt: number;
}

interface DebtSummary {
  debt: number;
  inProgress: number;
  free: number;
  limit: number;
  percent: number;
  state: string;
}

export default function PortalHomePage() {
  const clientId = useAuthStore((s) => s.user?.clientId);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["portal-analytics", clientId],
    queryFn: async () => (await apiClient.get<ClientAnalytics>(`/clients/${clientId}/analytics`)).data,
    enabled: !!clientId,
  });

  const { data: debt, isLoading: debtLoading } = useQuery({
    queryKey: ["portal-debt", clientId],
    queryFn: async () => (await apiClient.get<DebtSummary>(`/debts/${clientId}`)).data,
    enabled: !!clientId,
  });

  const isLoading = analyticsLoading || debtLoading;

  return (
    <div>
      <PageHeader title="Главная" description="Сводка по вашему аккаунту" />

      {isLoading || !analytics || !debt ? (
        <LoadingBlock />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Заказов (30 дней)" value={analytics.ordersCount} />
          <StatCard label="FBS-заказов" value={analytics.fbsCount} />
          <StatCard label="FBO-поставок" value={analytics.fboCount} />
          <StatCard label="Выручка" value={formatMoney(analytics.revenue)} tone="success" />
          <StatCard
            label="Задолженность"
            value={formatMoney(debt.debt)}
            hint={
              <Badge variant={DEBT_STATE_VARIANT[debt.state] ?? "neutral"}>{DEBT_STATE_LABELS[debt.state] ?? debt.state}</Badge>
            }
            tone={debt.debt > 0 ? "warning" : "neutral"}
          />
          <StatCard label="Свободный лимит" value={formatMoney(debt.free)} />
        </div>
      )}
    </div>
  );
}
