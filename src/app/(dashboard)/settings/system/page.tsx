"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Sliders } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Subcard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface Settings {
  company_name?: string;
  general_buffer_percent?: number;
  general_debt_limit?: number;
  debt_blocked_operations?: string[];
  [key: string]: unknown;
}

const OP_LABELS: Record<string, string> = {
  receiving: "Приёмка",
  picking: "Сборка",
  packing: "Упаковка",
  shipping: "Отгрузка",
};

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings-all"],
    queryFn: async () => (await apiClient.get<Settings>("/settings")).data,
  });

  useEffect(() => {
    if (data?.company_name) setCompanyName(data.company_name);
  }, [data?.company_name]);

  const save = useMutation({
    mutationFn: async () => apiClient.put("/settings/company_name", { value: companyName }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-all"] }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Системные настройки" description="Общие параметры компании" />

      <div className="flex flex-col gap-5 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[var(--color-foreground-muted)]" />
              Название компании
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                save.mutate();
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <Label htmlFor="companyName">Название</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={save.isPending || isLoading}>
                {save.isPending ? "Сохраняем…" : "Сохранить"}
              </Button>
            </form>
            {error ? <p className="mt-2 text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[var(--color-foreground-muted)]" />
              Текущие параметры
            </CardTitle>
            <CardDescription>Буфер и лимит долга настраиваются в разделе «Цены»</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading || !data ? (
              <p className="text-[13.5px] text-[var(--color-foreground-muted)]">Загрузка…</p>
            ) : (
              <Subcard className="flex flex-col divide-y divide-[var(--color-border)] text-[13.5px]">
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <dt className="text-[var(--color-foreground-muted)]">Общий буфер витрины</dt>
                  <dd className="font-medium">{data.general_buffer_percent ?? 0}%</dd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <dt className="text-[var(--color-foreground-muted)]">Общий лимит задолженности</dt>
                  <dd className="font-medium">{data.general_debt_limit ?? 0} ₽</dd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <dt className="text-[var(--color-foreground-muted)]">Блокируемые операции при долге</dt>
                  <dd className="font-medium">
                    {(data.debt_blocked_operations ?? []).map((op) => OP_LABELS[op] ?? op).join(", ") || "—"}
                  </dd>
                </div>
              </Subcard>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
