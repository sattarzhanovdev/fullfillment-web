"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

interface Warehouse {
  id: string;
  name: string;
  zones: { id: string; code: string; cells: { id: string; code: string }[] }[];
}
interface InventoryCount {
  id: string;
  scope: string;
  status: string;
  createdAt: string;
  client: { name: string } | null;
  _count: { lines: number };
}

const SCOPE_LABELS: Record<string, string> = {
  WAREHOUSE: "Весь склад",
  CLIENT: "Клиент",
  ZONE: "Зона",
  CELL: "Ячейка",
  PRODUCTS: "Выбранные товары",
};

export default function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await apiClient.get<InventoryCount[]>("/inventory")).data,
  });

  return (
    <div>
      <PageHeader title="Склад · Инвентаризация" description="Сверка системного и фактического остатка" actions={<CreateInventoryDialog />} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Инвентаризаций пока не было" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Область</Th>
                <Th>Клиент</Th>
                <Th>Позиций</Th>
                <Th>Статус</Th>
                <Th>Создана</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/warehouse/inventory/${c.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                      {SCOPE_LABELS[c.scope] ?? c.scope}
                    </Link>
                  </Td>
                  <Td>{c.client?.name ?? "—"}</Td>
                  <Td>{c._count.lines}</Td>
                  <Td>
                    <Badge variant={c.status === "completed" ? "success" : "accent"}>
                      {c.status === "completed" ? "Завершена" : "В процессе"}
                    </Badge>
                  </Td>
                  <Td>{formatDateTime(c.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function CreateInventoryDialog() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("WAREHOUSE");
  const [warehouseId, setWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [cellId, setCellId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get<Warehouse[]>("/warehouses")).data,
    enabled: open,
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });

  const selectedWarehouse = warehouses?.find((w) => w.id === warehouseId);
  const selectedZone = selectedWarehouse?.zones.find((z) => z.id === zoneId);

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/inventory", {
        scope,
        warehouseId: warehouseId || undefined,
        clientId: scope === "CLIENT" ? clientId || undefined : undefined,
        zoneId: zoneId || undefined,
        cellId: cellId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Создать инвентаризацию
        </Button>
      </DialogTrigger>
      <DialogContent title="Новая инвентаризация">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label htmlFor="scope">Область</Label>
            <Select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="WAREHOUSE">Весь склад</option>
              <option value="CLIENT">Клиент</option>
              <option value="ZONE">Зона</option>
              <option value="CELL">Ячейка</option>
            </Select>
          </div>

          {(scope === "WAREHOUSE" || scope === "ZONE" || scope === "CELL") && (
            <div>
              <Label htmlFor="warehouse">Склад</Label>
              <Select id="warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Выберите склад</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {scope === "CLIENT" && (
            <div>
              <Label htmlFor="ic-client">Клиент</Label>
              <Select id="ic-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Выберите клиента</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {(scope === "ZONE" || scope === "CELL") && selectedWarehouse && (
            <div>
              <Label htmlFor="zone">Зона</Label>
              <Select id="zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">Выберите зону</option>
                {selectedWarehouse.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {scope === "CELL" && selectedZone && (
            <div>
              <Label htmlFor="cell">Ячейка</Label>
              <Select id="cell" value={cellId} onChange={(e) => setCellId(e.target.value)}>
                <option value="">Выберите ячейку</option>
                {selectedZone.cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Создаём…" : "Создать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
