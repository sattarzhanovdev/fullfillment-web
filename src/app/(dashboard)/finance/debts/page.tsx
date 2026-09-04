"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DEBT_STATE_LABELS, DEBT_STATE_VARIANT } from "@/lib/status";
import { formatMoney } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface DebtSummary {
  clientId: string;
  debt: number;
  inProgress: number;
  free: number;
  limit: number;
  percent: number;
  state: string;
}

export default function DebtsPage() {
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => (await apiClient.get<DebtSummary[]>("/debts")).data,
  });

  const [action, setAction] = useState<{ clientId: string; kind: "charge" | "pay" } | null>(null);
  const clientName = (id: string) => clients?.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader title="Долги клиентов" description="Задолженность, свободный лимит и текущее состояние" />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Нет активных клиентов" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Клиент</Th>
                <Th>Долг</Th>
                <Th>В работе</Th>
                <Th>Свободно</Th>
                <Th>Состояние</Th>
                <Th>Лимит</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((row) => (
                <Tr key={row.clientId}>
                  <Td className="font-medium">{clientName(row.clientId)}</Td>
                  <Td className={row.debt > 0 ? "text-[var(--color-warning)]" : undefined}>{formatMoney(row.debt)}</Td>
                  <Td>{formatMoney(row.inProgress)}</Td>
                  <Td>{formatMoney(row.free)}</Td>
                  <Td>
                    <Badge variant={DEBT_STATE_VARIANT[row.state] ?? "neutral"}>
                      {DEBT_STATE_LABELS[row.state] ?? row.state}
                    </Badge>
                  </Td>
                  <Td>{formatMoney(row.limit)}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setAction({ clientId: row.clientId, kind: "charge" })}>
                        Начислить
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setAction({ clientId: row.clientId, kind: "pay" })}>
                        Оплатить
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {action ? (
        <DebtActionDialog
          clientId={action.clientId}
          clientName={clientName(action.clientId)}
          kind={action.kind}
          onClose={() => setAction(null)}
        />
      ) : null}
    </div>
  );
}

function DebtActionDialog({
  clientId,
  clientName,
  kind,
  onClose,
}: {
  clientId: string;
  clientName: string;
  kind: "charge" | "pay";
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`/debts/${clientId}/${kind}`, { amount: Number(amount), reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={kind === "charge" ? `Начислить: ${clientName}` : `Оплата: ${clientName}`}
        description={kind === "charge" ? "Добавить сумму к задолженности клиента" : "Зафиксировать оплату клиента"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="amount">Сумма, ₽</Label>
            <Input id="amount" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reason">Основание</Label>
            <Input id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Сохраняем…" : "Подтвердить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
