"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";

const OPERATIONS: { key: string; label: string }[] = [
  { key: "receiving", label: "Приёмка" },
  { key: "picking", label: "Сборка" },
  { key: "packing", label: "Упаковка" },
  { key: "shipping", label: "Отгрузка" },
];

export default function DebtLimitPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await apiClient.get<Record<string, unknown>>("/settings")).data,
  });

  const [generalLimit, setGeneralLimit] = useState("10000");
  const [blockedOps, setBlockedOps] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setGeneralLimit(String(settings.general_debt_limit ?? 10000));
      setBlockedOps((settings.debt_blocked_operations as string[] | undefined) ?? []);
    }
  }, [settings]);

  const flash = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const saveLimit = useMutation({
    mutationFn: async () => apiClient.put("/settings/general_debt_limit", { value: Number(generalLimit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      flash("limit");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const saveOps = useMutation({
    mutationFn: async (next: string[]) => apiClient.put("/settings/debt_blocked_operations", { value: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      flash("ops");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function toggleOp(key: string) {
    const next = blockedOps.includes(key) ? blockedOps.filter((o) => o !== key) : [...blockedOps, key];
    setBlockedOps(next);
    saveOps.mutate(next);
  }

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  return (
    <div>
      <PageHeader
        title="Лимит задолженности"
        description="До 50% — норма, от 50% — предупреждение, от 80% — критично, 100% — блокировка новых заказов"
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="flex flex-col gap-5">
          <Card className="max-w-lg">
            <CardContent>
              <CardTitle className="mb-3">Общий лимит по умолчанию</CardTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  saveLimit.mutate();
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <Label htmlFor="generalLimit">Лимит, ₽</Label>
                  <Input
                    id="generalLimit"
                    type="number"
                    value={generalLimit}
                    onChange={(e) => setGeneralLimit(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saveLimit.isPending}>
                  Сохранить
                </Button>
              </form>
              {saved === "limit" ? <p className="mt-2 text-[12.5px] text-[var(--color-success)]">Сохранено</p> : null}
            </CardContent>
          </Card>

          <Card className="max-w-lg">
            <CardContent>
              <CardTitle className="mb-3">Блокируемые операции при 100% лимита</CardTitle>
              <div className="flex flex-col gap-2">
                {OPERATIONS.map((op) => (
                  <label key={op.key} className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                    <input type="checkbox" checked={blockedOps.includes(op.key)} onChange={() => toggleOp(op.key)} />
                    {op.label}
                  </label>
                ))}
              </div>
              {saved === "ops" ? <p className="mt-2 text-[12.5px] text-[var(--color-success)]">Сохранено</p> : null}
            </CardContent>
          </Card>

          <Card className="max-w-lg">
            <CardContent>
              <CardTitle className="mb-3">Персональный лимит клиента</CardTitle>
              <PerClientLimitForm clients={clients ?? []} />
            </CardContent>
          </Card>

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

function PerClientLimitForm({ clients }: { clients: Client[] }) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => apiClient.patch(`/clients/${clientId}`, { debtLimit: Number(limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="flex items-end gap-3"
    >
      <div className="flex-1">
        <Label htmlFor="client">Клиент</Label>
        <Select id="client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Выберите клиента</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <Label htmlFor="limit">Лимит, ₽</Label>
        <Input id="limit" type="number" required value={limit} onChange={(e) => setLimit(e.target.value)} />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        Сохранить
      </Button>
      {error ? <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
      {saved ? <p className="text-[12.5px] text-[var(--color-success)]">Сохранено</p> : null}
    </form>
  );
}
