"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import type { Product } from "@/lib/types";

interface NeedsPriceEntry {
  product: Product;
  result: { price: null; source: "NEEDS_PRICE"; reason?: string };
}

export default function NeedsPricePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["prices", "needs-price"],
    queryFn: async () => (await apiClient.get<NeedsPriceEntry[]>("/prices/needs-price/queue")).data,
  });

  return (
    <div>
      <PageHeader
        title="Требует цены"
        description="Товары, для которых невозможно рассчитать стоимость обработки — деньги за них не начисляются"
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Очередь пуста" description="Все товары можно рассчитать по текущим правилам" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Клиент</Th>
                <Th>Причина</Th>
                <Th>Габариты</Th>
                <Th>Назначить цену</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((entry) => (
                <NeedsPriceRow key={entry.product.id} entry={entry} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function NeedsPriceRow({ entry }: { entry: NeedsPriceEntry }) {
  const { product, result } = entry;
  const queryClient = useQueryClient();
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => apiClient.patch(`/products/${product.id}`, { fbsProcessingPrice: Number(price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prices", "needs-price"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const dims =
    product.lengthCm && product.widthCm && product.heightCm
      ? `${product.lengthCm}×${product.widthCm}×${product.heightCm} см`
      : "не указаны";

  return (
    <Tr>
      <Td className="font-medium">
        {product.name} <span className="text-[var(--color-foreground-muted)]">({product.article})</span>
      </Td>
      <Td>{product.client?.name ?? "—"}</Td>
      <Td className="text-[var(--color-warning)]">{result.reason ?? "Нет подходящих условий"}</Td>
      <Td>{dims}</Td>
      <Td>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex items-center gap-2"
        >
          <Input
            type="number"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="₽"
            className="h-8 w-24"
          />
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            Сохранить
          </Button>
        </form>
        {error ? <p className="mt-1 text-[12px] text-[var(--color-danger)]">{error}</p> : null}
      </Td>
    </Tr>
  );
}
