"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, PackageOpen } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client, Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface Warehouse {
  id: string;
  name: string;
}
interface Receipt {
  id: string;
  documentNumber: string | null;
  date: string;
  expectedPlaces: number | null;
  expectedItems: number | null;
  status: string;
  client: { name: string };
  items: { actualQty: number }[];
}

const STATUS_LABEL: Record<string, string> = { DRAFT: "Черновик", IN_PROGRESS: "В процессе", COMPLETED: "Завершена", CANCELLED: "Отменена" };
const STATUS_VARIANT: Record<string, "neutral" | "accent" | "success" | "danger"> = {
  DRAFT: "neutral",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function ReceivingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => (await apiClient.get<Receipt[]>("/receipts")).data,
  });

  return (
    <div>
      <PageHeader title="Приёмка" description="Приёмка товаров от клиентов на склад" actions={<CreateReceiptDialog />} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Приёмок пока нет" description="Создайте первую, когда придёт товар от клиента" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Клиент</Th>
                <Th>Документ</Th>
                <Th>Дата</Th>
                <Th>Мест</Th>
                <Th>Ожидалось / принято</Th>
                <Th>Статус</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((r) => {
                const actual = r.items.reduce((s, i) => s + i.actualQty, 0);
                return (
                  <Tr key={r.id}>
                    <Td>{r.client.name}</Td>
                    <Td>
                      <Link href={`/receiving/${r.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                        {r.documentNumber ?? `№${r.id.slice(-6)}`}
                      </Link>
                    </Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{r.expectedPlaces ?? "—"}</Td>
                    <Td>
                      {r.expectedItems ?? 0} / {actual}
                    </Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function CreateReceiptDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get<Warehouse[]>("/warehouses")).data,
    enabled: open,
  });

  const [clientId, setClientId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [expectedPlaces, setExpectedPlaces] = useState("");
  const [items, setItems] = useState<{ productId: string; expectedQty: string }[]>([{ productId: "", expectedQty: "1" }]);

  const { data: products } = useQuery({
    queryKey: ["products", clientId],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { clientId } })).data,
    enabled: open && !!clientId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/receipts", {
        clientId,
        warehouseId,
        documentNumber: documentNumber || undefined,
        expectedPlaces: expectedPlaces ? Number(expectedPlaces) : undefined,
        items: items.filter((i) => i.productId).map((i) => ({ productId: i.productId, expectedQty: Number(i.expectedQty) })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setOpen(false);
      setClientId("");
      setDocumentNumber("");
      setItems([{ productId: "", expectedQty: "1" }]);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Создать приёмку
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая приёмка">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="client">Клиент</Label>
              <Select id="client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Выберите</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="warehouse">Склад</Label>
              <Select id="warehouse" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Выберите</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="docNumber">Номер документа</Label>
              <Input id="docNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="places">Ожидаемое кол-во мест</Label>
              <Input id="places" type="number" value={expectedPlaces} onChange={(e) => setExpectedPlaces(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Ожидаемые товары</Label>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    disabled={!clientId}
                    onChange={(e) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))}
                  >
                    <option value="">Товар…</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.article})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    value={item.expectedQty}
                    onChange={(e) =>
                      setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, expectedQty: e.target.value } : it)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                    className="text-[var(--color-foreground-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setItems((arr) => [...arr, { productId: "", expectedQty: "1" }])}
                className="self-start"
              >
                <Plus className="h-3.5 w-3.5" /> Добавить товар
              </Button>
            </div>
          </div>

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Создаём…" : "Создать приёмку"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
