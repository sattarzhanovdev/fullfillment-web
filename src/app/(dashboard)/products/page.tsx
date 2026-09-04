"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { search: search || undefined } })).data,
  });

  return (
    <div>
      <PageHeader title="Товары" description="Карточки товаров всех клиентов" actions={<CreateProductDialog />} />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-muted)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Артикул / штрихкод / название"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
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
              {data.map((p) => (
                <Tr key={p.id}>
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
