"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Info, Package } from "lucide-react";
import { Card, CardContent, CardTitle, Subcard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";

interface Showcase {
  physicalQty: number;
  reservedQty: number;
  blockedQty: number;
  availableQty: number;
  bufferPercent: number;
  showcaseQty: number;
}

export default function BufferPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await apiClient.get<Record<string, unknown>>("/settings")).data,
  });

  const [generalBuffer, setGeneralBuffer] = useState("0");

  useEffect(() => {
    if (settings) setGeneralBuffer(String(settings.general_buffer_percent ?? 0));
  }, [settings]);

  const saveGeneral = useMutation({
    mutationFn: async () => apiClient.put("/settings/general_buffer_percent", { value: Number(generalBuffer) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["showcase"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await apiClient.get<Product[]>("/products")).data,
  });

  return (
    <div>
      <PageHeader
        title="Буфер витрины"
        description="Часть физического остатка, которая не выкладывается на маркетплейс"
      />

      <Card className="mb-5 max-w-lg">
        <CardContent>
          <CardTitle className="mb-3">Общий буфер по умолчанию</CardTitle>
          {settingsLoading ? (
            <LoadingBlock />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                saveGeneral.mutate();
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <Label htmlFor="generalBuffer">Буфер, %</Label>
                <Input
                  id="generalBuffer"
                  type="number"
                  step="0.1"
                  value={generalBuffer}
                  onChange={(e) => setGeneralBuffer(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saveGeneral.isPending}>
                Сохранить
              </Button>
            </form>
          )}
          {saved ? <p className="mt-2 text-[12.5px] text-[var(--color-success)]">Сохранено</p> : null}
          {error ? <p className="mt-2 text-[12.5px] text-[var(--color-danger)]">{error}</p> : null}
          <Subcard className="mt-3 flex items-start gap-2.5 px-3.5 py-3 text-[12px] leading-relaxed text-[var(--color-foreground-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <span>
              Приоритет: ручной буфер товара → буфер клиента → общий буфер. Пустое поле у товара/клиента — использовать
              значение выше по приоритету; ноль — буфер отсутствует.
            </span>
          </Subcard>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardTitle className="px-5 pt-5">Витрина FBS</CardTitle>
        {productsLoading ? (
          <LoadingBlock />
        ) : !products || products.length === 0 ? (
          <EmptyState icon={Package} title="Товаров нет" description="Добавьте товары, чтобы настроить буфер витрины" />
        ) : (
          <Table className="mt-3">
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Остаток</Th>
                <Th>Резерв</Th>
                <Th>Доступно</Th>
                <Th>Буфер, %</Th>
                <Th>На витрине</Th>
              </tr>
            </Thead>
            <tbody>
              {products.map((p) => (
                <BufferRow key={p.id} product={p} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function BufferRow({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.bufferPercent ?? "");
  const [preview, setPreview] = useState<{ before: number; after: number } | null>(null);

  const { data: showcase, isLoading } = useQuery({
    queryKey: ["showcase", product.id],
    queryFn: async () => (await apiClient.get<Showcase>(`/stock/product/${product.id}/showcase`)).data,
  });

  const previewMutation = useMutation({
    mutationFn: async (bufferPercent: number) =>
      (await apiClient.post<{ before: number; after: number }>(`/stock/product/${product.id}/preview-buffer`, { bufferPercent }))
        .data,
    onSuccess: (data) => setPreview(data),
  });

  const saveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/products/${product.id}`, { bufferPercent: value === "" ? null : Number(value) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase", product.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(false);
      setPreview(null);
    },
  });

  function handleChange(v: string) {
    setValue(v);
    if (v !== "") previewMutation.mutate(Number(v));
    else setPreview(null);
  }

  return (
    <Tr>
      <Td className="font-medium">{product.name}</Td>
      <Td>{isLoading ? "…" : showcase?.physicalQty ?? "—"}</Td>
      <Td>
        <span className="text-[var(--color-reserve)]">{isLoading ? "…" : showcase?.reservedQty ?? "—"}</span>
      </Td>
      <Td>{isLoading ? "…" : showcase?.availableQty ?? "—"}</Td>
      <Td>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 w-20"
              autoFocus
            />
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-[var(--radius-control)] px-2 py-1 hover:bg-[var(--color-surface-2)]"
          >
            {showcase?.bufferPercent ?? 0}%
          </button>
        )}
        {preview ? (
          <p className="mt-1 text-[11.5px] text-[var(--color-foreground-muted)]">
            Было: {preview.before} → Станет: {preview.after}
          </p>
        ) : null}
      </Td>
      <Td className="font-medium">{isLoading ? "…" : showcase?.showcaseQty ?? "—"}</Td>
    </Tr>
  );
}
