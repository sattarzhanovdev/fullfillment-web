"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_LABELS } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

interface Integration {
  id: string;
  clientId: string;
  marketplace: string;
  status: string;
  lastSyncAt: string | null;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  CONNECTED: "success",
  SYNCING: "warning",
  ERROR: "danger",
  NOT_CONNECTED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: "Подключено",
  SYNCING: "Синхронизация…",
  ERROR: "Ошибка",
  NOT_CONNECTED: "Не подключено",
};

export default function IntegrationsSettingsPage() {
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const integrationQueries = useQueries({
    queries: (clients ?? []).map((c) => ({
      queryKey: ["marketplaces-for-client", c.id],
      queryFn: async () => (await apiClient.get<Integration[]>(`/marketplaces/client/${c.id}`)).data,
      enabled: !!clients,
    })),
  });

  const isLoading = clientsLoading || integrationQueries.some((q) => q.isLoading);

  const rows = (clients ?? []).flatMap((client, i) =>
    (integrationQueries[i]?.data ?? []).map((integration) => ({ client, integration })),
  );

  return (
    <div>
      <PageHeader title="Маркетплейсы и интеграции" description="Обзор подключений всех клиентов" />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Адаптеры маркетплейсов</CardTitle>
          <CardDescription>Управление ключами API — в карточке каждого клиента</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pt-0">
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3.5">
            <p className="text-[13.5px] font-medium">Wildberries API</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-foreground-muted)]">https://suppliers-api.wildberries.ru</p>
            <Badge variant="warning" className="mt-2">
              Заглушка — ожидает реальных ключей
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="Интеграции не настроены" description="Подключите маркетплейс в карточке клиента" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Клиент</Th>
                <Th>Маркетплейс</Th>
                <Th>Статус</Th>
                <Th>Последняя синхронизация</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map(({ client, integration }) => (
                <Tr key={integration.id}>
                  <Td className="font-medium">{client.name}</Td>
                  <Td>{MARKETPLACE_LABELS[integration.marketplace] ?? integration.marketplace}</Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[integration.status] ?? "neutral"}>
                      {STATUS_LABEL[integration.status] ?? integration.status}
                    </Badge>
                  </Td>
                  <Td>{formatDateTime(integration.lastSyncAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
