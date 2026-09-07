"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Package, ArrowRight } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney } from "@/lib/utils";

const PRICE_SOURCE_LABELS: Record<string, string> = {
  PRODUCT: "Цена товара",
  CLIENT_FLAT: "Цена клиента",
  CLIENT_FORMULA: "Формула клиента",
  GENERAL: "Общая формула",
  NEEDS_PRICE: "Требует цены",
};

type StatusFilter = "all" | "active" | "hidden" | "no-dimensions" | "has-dimensions";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Все статусы",
  active: "Активен",
  hidden: "Скрыт",
  "no-dimensions": "Без габаритов",
  "has-dimensions": "С габаритами",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, clientId],
    queryFn: async () =>
      (
        await apiClient.get<Product[]>("/products", {
          params: { search: search || undefined, clientId: clientId || undefined },
        })
      ).data,
  });

  const filtered = (data ?? []).filter((p) => {
    switch (statusFilter) {
      case "active":
        return p.isActive;
      case "hidden":
        return !p.isActive;
      case "no-dimensions":
        return !p.lengthCm || !p.widthCm || !p.heightCm;
      case "has-dimensions":
        return !!(p.lengthCm && p.widthCm && p.heightCm);
      default:
        return true;
    }
  });

  return (
    <div>
      <PageHeader
        title="Товары"
        description={data ? `Карточки товаров всех клиентов · показано ${filtered.length} из ${data.length}` : "Карточки товаров всех клиентов"}
        actions={<CreateProductDialog />}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Артикул / штрихкод / название"
            className="pl-9"
          />
        </div>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-56">
          <option value="">Все клиенты</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-48">
          {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_FILTER_LABELS[key]}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <EmptyState title="Товары не найдены" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Товар</Th>
                <Th>Клиент</Th>
                <Th>Артикул</Th>
                <Th>Штрихкод</Th>
                <Th>Объём, л</Th>
                <Th>Вес, кг</Th>
                <Th>Статус</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.map((p) => (
                <Tr key={p.id} onClick={() => setSelectedId(p.id)} className="cursor-pointer">
                  <Td className="font-medium">{p.name}</Td>
                  <Td>{p.client?.name ?? "—"}</Td>
                  <Td>{p.article}</Td>
                  <Td className="font-mono text-[12.5px]">{p.barcode}</Td>
                  <Td>{p.volumeLiters ?? "—"}</Td>
                  <Td>{p.weightKg ?? "—"}</Td>
                  <Td>
                    {p.isActive ? (
                      <Badge variant="success">Активен</Badge>
                    ) : (
                      <Badge variant="neutral">Скрыт</Badge>
                    )}
                    {(!p.lengthCm || !p.widthCm || !p.heightCm) && (
                      <Badge variant="warning" className="ml-1.5">
                        Нет габаритов
                      </Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ProductDetailDialog productId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

interface ProductDetail extends Product {
  category: string | null;
  stock: { physicalQty: number; reservedQty: number; blockedQty: number; availableQty: number };
}

interface HistoryEntry {
  id: string;
  delta: number;
  reason: string;
  reference: string | null;
  createdAt: string;
}

interface PriceResult {
  price: number | null;
  source: string;
  reason?: string;
  liters?: number;
}

function ProductDetailDialog({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => (await apiClient.get<ProductDetail>(`/products/${productId}`)).data,
    enabled: !!productId,
  });
  const { data: history } = useQuery({
    queryKey: ["product-history", productId],
    queryFn: async () => (await apiClient.get<HistoryEntry[]>(`/products/${productId}/history`)).data,
    enabled: !!productId,
  });
  const { data: price } = useQuery({
    queryKey: ["product-price", productId],
    queryFn: async () => (await apiClient.get<PriceResult>(`/prices/product/${productId}`)).data,
    enabled: !!productId,
  });

  return (
    <Dialog open={!!productId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={product?.name ?? "Товар"} description={product ? `Артикул ${product.article}` : undefined}>
        {isLoading || !product ? (
          <LoadingBlock />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {product.isActive ? <Badge variant="success">Активен</Badge> : <Badge variant="neutral">Скрыт</Badge>}
              {(!product.lengthCm || !product.widthCm || !product.heightCm) && (
                <Badge variant="warning">Нет габаритов</Badge>
              )}
              {price && (
                <Badge variant={price.source === "NEEDS_PRICE" ? "warning" : "accent"}>
                  {PRICE_SOURCE_LABELS[price.source] ?? price.source}
                  {price.price !== null ? `: ${formatMoney(price.price)}` : ""}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <Field label="SKU" value={product.sku} />
              <Field label="Штрихкод" value={<span className="font-mono">{product.barcode}</span>} />
              <Field
                label="Клиент"
                value={
                  product.client ? (
                    <Link href={`/clients/${product.client.id}`} className="text-[var(--color-accent)] hover:underline">
                      {product.client.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Категория" value={product.category ?? "—"} />
              <Field
                label="Габариты, см"
                value={product.lengthCm && product.widthCm && product.heightCm ? `${product.lengthCm} × ${product.widthCm} × ${product.heightCm}` : "не указаны"}
              />
              <Field label="Объём" value={product.volumeLiters ? `${product.volumeLiters} л` : "—"} />
              <Field label="Вес" value={product.weightKg ? `${product.weightKg} кг` : "—"} />
              <Field label="Упаковка" value={product.packagingType?.name ?? "не задана"} />
            </div>

            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
                Остаток на складе
              </p>
              <div className="grid grid-cols-4 gap-2">
                <StockStat label="Физический" value={product.stock.physicalQty} />
                <StockStat label="Резерв" value={product.stock.reservedQty} tone="reserve" />
                <StockStat label="Заблокировано" value={product.stock.blockedQty} tone="danger" />
                <StockStat label="Доступно" value={product.stock.availableQty} tone="success" />
              </div>
            </div>

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  Последние движения
                </p>
                <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-control)] border border-[var(--color-border)]">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                      <div className="min-w-0">
                        <p className="truncate text-[var(--color-foreground)]">{h.reason}</p>
                        <p className="truncate text-[11.5px] text-[var(--color-foreground-muted)]">
                          {h.reference ?? "—"} · {formatDateTime(h.createdAt)}
                        </p>
                      </div>
                      <span className={h.delta >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
                        {h.delta >= 0 ? "+" : ""}
                        {h.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              {product.client ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/clients/${product.client.id}`}>
                    Карточка клиента <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={onClose}>
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] text-[var(--color-foreground-muted)]">{label}</p>
      <p className="mt-0.5 font-medium text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

function StockStat({ label, value, tone }: { label: string; value: number; tone?: "reserve" | "danger" | "success" }) {
  const toneClass = tone
    ? { reserve: "text-[var(--color-reserve)]", danger: "text-[var(--color-danger)]", success: "text-[var(--color-success)]" }[tone]
    : "text-[var(--color-foreground)]";
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 text-center">
      <p className={`text-[16px] font-semibold ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-[var(--color-foreground-muted)]">{label}</p>
    </div>
  );
}

function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });

  const [form, setForm] = useState({
    clientId: "",
    name: "",
    sku: "",
    article: "",
    barcode: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    weightKg: "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/products", {
        ...form,
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setForm({ clientId: "", name: "", sku: "", article: "", barcode: "", lengthCm: "", widthCm: "", heightCm: "", weightKg: "" });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Добавить товар
        </Button>
      </DialogTrigger>
      <DialogContent title="Новый товар" description="Габариты нужны для расчёта стоимости обработки">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="col-span-2">
            <Label htmlFor="clientId">Клиент</Label>
            <Select
              id="clientId"
              required
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="">Выберите клиента</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="name">Название</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="article">Артикул</Label>
            <Input id="article" required value={form.article} onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="barcode">Штрихкод</Label>
            <Input
              id="barcode"
              required
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="lengthCm">Длина, см</Label>
            <Input id="lengthCm" type="number" value={form.lengthCm} onChange={(e) => setForm((f) => ({ ...f, lengthCm: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="widthCm">Ширина, см</Label>
            <Input id="widthCm" type="number" value={form.widthCm} onChange={(e) => setForm((f) => ({ ...f, widthCm: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="heightCm">Высота, см</Label>
            <Input id="heightCm" type="number" value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="weightKg">Вес, кг</Label>
            <Input id="weightKg" type="number" value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))} />
          </div>
          {error ? <p className="col-span-2 text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <div className="col-span-2">
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Создаём…" : "Создать товар"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
