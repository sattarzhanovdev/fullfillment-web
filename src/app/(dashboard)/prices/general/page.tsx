"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";

interface PriceRule {
  id: string;
  firstLiterPrice: string;
  nextLiterPrice: string;
}

export default function GeneralPricePage() {
  const queryClient = useQueryClient();
  const [firstLiterPrice, setFirstLiterPrice] = useState("");
  const [nextLiterPrice, setNextLiterPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["prices", "general"],
    queryFn: async () => (await apiClient.get<PriceRule | null>("/prices/general")).data,
  });

  useEffect(() => {
    if (data) {
      setFirstLiterPrice(String(data.firstLiterPrice));
      setNextLiterPrice(String(data.nextLiterPrice));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/prices/general", {
        firstLiterPrice: Number(firstLiterPrice),
        nextLiterPrice: Number(nextLiterPrice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prices", "general"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Общая цена FBS" description="Базовая формула расчёта стоимости обработки по объёму товара" />

      <Card className="max-w-lg">
        <CardContent>
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                mutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <Label htmlFor="firstLiterPrice">Цена первого литра, ₽</Label>
                <Input
                  id="firstLiterPrice"
                  type="number"
                  step="0.01"
                  required
                  value={firstLiterPrice}
                  onChange={(e) => setFirstLiterPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nextLiterPrice">Цена следующего литра, ₽</Label>
                <Input
                  id="nextLiterPrice"
                  type="number"
                  step="0.01"
                  required
                  value={nextLiterPrice}
                  onChange={(e) => setNextLiterPrice(e.target.value)}
                />
              </div>

              <p className="rounded-[var(--radius-control)] bg-[var(--color-surface-2)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-foreground-muted)]">
                Цена = цена первого литра + (литры − 1) × цена следующего литра.
                <br />
                Объём округляется вверх до целого литра (минимум 1 л): например, 0,7 л → 1 л, 1,2 л → 2 л, 2,3 л → 3 л.
              </p>

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
