"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";

interface ServicePrice {
  key: string;
  label: string;
  unit: string;
  settingKey: string;
}

const SERVICES: ServicePrice[] = [
  { key: "receiving", label: "Приёмка", unit: "₽/шт", settingKey: "service_price_receiving" },
  { key: "storage", label: "Хранение", unit: "₽/день", settingKey: "service_price_storage" },
  { key: "picking_fbs", label: "Сборка FBS", unit: "₽/заказ", settingKey: "service_price_picking_fbs" },
  { key: "packing", label: "Упаковка", unit: "₽/заказ", settingKey: "service_price_packing" },
  { key: "label", label: "Этикетка", unit: "₽/шт", settingKey: "service_price_label" },
  { key: "shipping", label: "Отгрузка", unit: "₽/заказ", settingKey: "service_price_shipping" },
  { key: "return", label: "Возврат", unit: "₽/заказ", settingKey: "service_price_return" },
  { key: "pallet", label: "Паллет", unit: "₽/паллет", settingKey: "service_price_pallet" },
];

export default function ServicesPricePage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await apiClient.get<Record<string, unknown>>("/settings")).data,
  });

  useEffect(() => {
    if (settings) {
      const next: Record<string, string> = {};
      for (const s of SERVICES) {
        next[s.key] = String(settings[s.settingKey] ?? "");
      }
      setValues(next);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        SERVICES.map((s) =>
          apiClient.put(`/settings/${s.settingKey}`, { value: Number(values[s.key]) }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Прайс-лист услуг"
        description="Стоимость услуг склада — применяется в накладных и расчёте задолженности"
      />

      <Card className="max-w-lg">
        <CardContent>
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              {SERVICES.map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <Label htmlFor={s.key} className="w-36 shrink-0">
                    {s.label}
                  </Label>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      id={s.key}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={values[s.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                      className="w-28"
                    />
                    <span className="text-[13px] text-[var(--color-foreground-muted)]">{s.unit}</span>
                  </div>
                </div>
              ))}

              {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
              {saved ? <p className="text-[13px] text-[var(--color-success)]">Сохранено</p> : null}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Сохраняем…" : "Сохранить"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
