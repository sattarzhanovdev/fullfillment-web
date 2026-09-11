"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, Subcard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  zones: { id: string; cells: { id: string }[] }[];
}

export default function WarehousesSettingsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["settings-warehouses"],
    queryFn: async () => (await apiClient.get<Warehouse[]>("/warehouses")).data,
  });

  const create = useMutation({
    mutationFn: async () => apiClient.post("/warehouses", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-warehouses"] });
      setOpen(false);
      setForm({ name: "", address: "" });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: async (w: Warehouse) => apiClient.patch(`/warehouses/${w.id}`, { isActive: !w.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-warehouses"] }),
  });

  return (
    <div>
      <PageHeader
        title="Склады"
        description="Список складов. Управление зонами и ячейками — на отдельной странице."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Добавить склад
              </Button>
            </DialogTrigger>
            <DialogContent title="Новый склад">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  create.mutate();
                }}
                className="flex flex-col gap-3.5"
              >
                <div>
                  <Label htmlFor="name">Название</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="address">Адрес</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Создаём…" : "Создать"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={WarehouseIcon} title="Складов пока нет" description="Добавьте первый склад, чтобы начать работу" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Адрес</Th>
                <Th>Зон / ячеек</Th>
                <Th>Статус</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((w) => (
                <Tr key={w.id}>
                  <Td className="font-medium">{w.name}</Td>
                  <Td>{w.address ?? "—"}</Td>
                  <Td>
                    {w.zones.length} / {w.zones.reduce((s, z) => s + z.cells.length, 0)}
                  </Td>
                  <Td>
                    <Badge variant={w.isActive ? "success" : "neutral"}>{w.isActive ? "Активен" : "Отключён"}</Badge>
                  </Td>
                  <Td>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive.mutate(w)} disabled={toggleActive.isPending}>
                      {w.isActive ? "Отключить" : "Включить"}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Link href="/warehouse/cells" className="mt-4 block">
        <Subcard className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-border)]/40">
          <span className="text-[13.5px] font-medium text-[var(--color-foreground)]">Управление зонами и ячейками</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
        </Subcard>
      </Link>
    </div>
  );
}
