"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/table";

interface Cell {
  id: string;
  code: string;
  type: string;
  capacity: number | null;
  isActive: boolean;
}
interface Zone {
  id: string;
  code: string;
  name: string | null;
  isReturns: boolean;
  cells: Cell[];
}
interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  zones: Zone[];
}

const CELL_TYPE_LABELS: Record<string, string> = {
  SHELF: "Стеллаж",
  FLOOR: "Пол",
  RETURNS: "Возврат",
  PICKING: "Отбор",
};

export default function WarehouseCellsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get<Warehouse[]>("/warehouses")).data,
  });

  return (
    <div>
      <PageHeader title="Склад · Ячейки" description="Адресное хранение: склад → зона → ячейка" actions={<CreateWarehouseDialog />} />

      {isLoading ? (
        <LoadingBlock />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Складов пока нет" description="Создайте первый склад" />
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((wh) => (
            <WarehouseBlock key={wh.id} warehouse={wh} />
          ))}
        </div>
      )}
    </div>
  );
}

function WarehouseBlock({ warehouse }: { warehouse: Warehouse }) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardContent>
        <div className="flex w-full items-center justify-between text-left">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-[var(--color-accent)]" />
            <span className="text-[14.5px] font-semibold">{warehouse.name}</span>
            {warehouse.address ? <span className="text-[12.5px] text-[var(--color-foreground-muted)]">{warehouse.address}</span> : null}
          </button>
          <CreateZoneDialog warehouseId={warehouse.id} />
        </div>

        {open ? (
          <div className="mt-4 flex flex-col gap-3 border-l border-[var(--color-border)] pl-4">
            {warehouse.zones.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-foreground-muted)]">Зон пока нет</p>
            ) : (
              warehouse.zones.map((zone) => <ZoneBlock key={zone.id} zone={zone} />)
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ZoneBlock({ zone }: { zone: Zone }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium">
            Зона {zone.code}
            {zone.name ? ` · ${zone.name}` : ""}
          </span>
          {zone.isReturns ? <Badge variant="warning">Возвраты</Badge> : null}
        </div>
        <CreateCellDialog zoneId={zone.id} />
      </div>
      {zone.cells.length === 0 ? (
        <p className="text-[12px] text-[var(--color-foreground-muted)]">Ячеек пока нет</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {zone.cells.map((cell) => (
            <div
              key={cell.id}
              className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-[12.5px]"
            >
              <span className="font-mono font-medium">{cell.code}</span>
              <span className="ml-1.5 text-[var(--color-foreground-muted)]">
                {CELL_TYPE_LABELS[cell.type] ?? cell.type}
                {cell.capacity ? ` · до ${cell.capacity}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateWarehouseDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => apiClient.post("/warehouses", { name, address: address || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
      setName("");
      setAddress("");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Создать склад
        </Button>
      </DialogTrigger>
      <DialogContent title="Новый склад">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label htmlFor="wh-name">Название</Label>
            <Input id="wh-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="wh-address">Адрес</Label>
            <Input id="wh-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateZoneDialog({ warehouseId }: { warehouseId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isReturns, setIsReturns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`/warehouses/${warehouseId}/zones`, { code, name: name || undefined, isReturns }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
      setCode("");
      setName("");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
          <Plus className="h-3.5 w-3.5" /> Зона
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая зона">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label htmlFor="zone-code">Код зоны</Label>
            <Input id="zone-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="B" />
          </div>
          <div>
            <Label htmlFor="zone-name">Название</Label>
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={isReturns} onChange={(e) => setIsReturns(e.target.checked)} />
            Зона возвратов
          </label>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateCellDialog({ zoneId }: { zoneId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState("SHELF");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/warehouses/zones/${zoneId}/cells`, { code, type, capacity: capacity ? Number(capacity) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
      setCode("");
      setCapacity("");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="h-3 w-3" /> Ячейка
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая ячейка">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label htmlFor="cell-code">Код ячейки</Label>
            <Input id="cell-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="A-02-01" />
          </div>
          <div>
            <Label htmlFor="cell-type">Тип</Label>
            <Select id="cell-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="SHELF">Стеллаж</option>
              <option value="FLOOR">Пол</option>
              <option value="RETURNS">Возврат</option>
              <option value="PICKING">Отбор</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="cell-capacity">Вместимость</Label>
            <Input id="cell-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
