"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

interface Packaging {
  id: string;
  name: string;
  kind: string;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  weightKg: string | null;
  cost: string;
  maxVolumeL: string | null;
  isActive: boolean;
}

const KINDS = ["пакет", "коробка", "конверт", "стрейч", "паллета", "индивидуальная упаковка"];

const emptyForm = {
  name: "",
  kind: KINDS[0],
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  weightKg: "",
  cost: "0",
  maxVolumeL: "",
};

export default function PackagingSettingsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Packaging | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["settings-packaging"],
    queryFn: async () => (await apiClient.get<Packaging[]>("/packaging")).data,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Packaging) {
    setEditing(p);
    setForm({
      name: p.name,
      kind: p.kind,
      lengthCm: p.lengthCm ?? "",
      widthCm: p.widthCm ?? "",
      heightCm: p.heightCm ?? "",
      weightKg: p.weightKg ?? "",
      cost: p.cost,
      maxVolumeL: p.maxVolumeL ?? "",
    });
    setError(null);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        kind: form.kind,
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        cost: form.cost ? Number(form.cost) : 0,
        maxVolumeL: form.maxVolumeL ? Number(form.maxVolumeL) : undefined,
      };
      if (editing) return apiClient.patch(`/packaging/${editing.id}`, payload);
      return apiClient.post("/packaging", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-packaging"] });
      setOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Packaging) =>
      p.isActive ? apiClient.delete(`/packaging/${p.id}`) : apiClient.patch(`/packaging/${p.id}`, { isActive: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-packaging"] }),
  });

  return (
    <div>
      <PageHeader
        title="Упаковки"
        description="Справочник типов упаковки: пакеты, коробки, паллеты"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Добавить упаковку
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Package} title="Упаковок пока нет" description="Добавьте пакеты, коробки или паллеты для расчёта стоимости" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Тип</Th>
                <Th>Габариты, см</Th>
                <Th>Вес, кг</Th>
                <Th>Стоимость</Th>
                <Th>Макс. объём, л</Th>
                <Th>Статус</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td>{p.kind}</Td>
                  <Td>
                    {p.lengthCm && p.widthCm && p.heightCm ? `${p.lengthCm}×${p.widthCm}×${p.heightCm}` : "—"}
                  </Td>
                  <Td>{p.weightKg ?? "—"}</Td>
                  <Td>{formatMoney(p.cost)}</Td>
                  <Td>{p.maxVolumeL ?? "—"}</Td>
                  <Td>
                    <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Активна" : "Отключена"}</Badge>
                  </Td>
                  <Td className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                      Изменить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive.mutate(p)} disabled={toggleActive.isPending}>
                      {p.isActive ? "Отключить" : "Включить"}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? "Изменить упаковку" : "Новая упаковка"}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              save.mutate();
            }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="col-span-2">
              <Label htmlFor="name">Название</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="kind">Тип</Label>
              <Select id="kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
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
            <div>
              <Label htmlFor="cost">Стоимость, ₽</Label>
              <Input id="cost" type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="maxVolumeL">Макс. объём, л</Label>
              <Input id="maxVolumeL" type="number" value={form.maxVolumeL} onChange={(e) => setForm((f) => ({ ...f, maxVolumeL: e.target.value }))} />
            </div>
            {error ? <p className="col-span-2 text-[13px] text-[var(--color-danger)]">{error}</p> : null}
            <div className="col-span-2">
              <Button type="submit" disabled={save.isPending} className="w-full">
                {save.isPending ? "Сохраняем…" : "Сохранить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
