"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";

/**
 * Диалог создания отгрузки. Если передан attachOrderId — заказ сразу привязывается к новой отгрузке.
 * По умолчанию рендерит собственную кнопку-триггер; передайте open/onOpenChange, чтобы управлять
 * открытием снаружи (например, из пункта выпадающего меню) — тогда триггер не рендерится.
 */
export function CreateShipmentDialog({
  attachOrderId,
  triggerLabel = "Создать отгрузку",
  triggerVariant = "primary",
  onCreated,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  attachOrderId?: string;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost";
  onCreated?: (shipmentId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const externallyControlled = openProp !== undefined;
  const open = externallyControlled ? openProp : internalOpen;
  const setOpen = externallyControlled ? onOpenChangeProp! : setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [wbWarning, setWbWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get("/warehouses")).data,
    enabled: open,
  });

  const [form, setForm] = useState({ warehouseId: "", scheduledAt: "", transport: "", driverName: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/shipments", {
        marketplace: "WILDBERRIES",
        warehouseId: form.warehouseId || undefined,
        scheduledAt: form.scheduledAt,
        transport: form.transport || undefined,
        driverName: form.driverName || undefined,
      });
      let wbWarning: string | null = null;
      if (attachOrderId) {
        const attachRes = await apiClient.post<{ wbWarning: string | null }>(`/shipments/${res.data.id}/orders/${attachOrderId}`);
        wbWarning = attachRes.data.wbWarning;
      }
      return { shipment: res.data, wbWarning };
    },
    onSuccess: ({ shipment, wbWarning }) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setForm({ warehouseId: "", scheduledAt: "", transport: "", driverName: "" });
      onCreated?.(shipment.id);
      if (wbWarning) {
        setWbWarning(wbWarning);
      } else {
        setOpen(false);
      }
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setError(null);
          setWbWarning(null);
        }
      }}
    >
      {!externallyControlled ? (
        <DialogTrigger asChild>
          <Button variant={triggerVariant}>
            <Plus className="h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent title="Новая отгрузка" description="Заказы можно добавить после создания">
        {wbWarning ? (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-[var(--color-warning)]">
              Отгрузка создана, заказ привязан локально, но не синхронизирован с WB: {wbWarning}
            </p>
            <Button onClick={() => setOpen(false)}>Понятно</Button>
          </div>
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
              <Label htmlFor="scheduledAt">Дата и время</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="warehouseId">Склад</Label>
              <Select id="warehouseId" value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                <option value="">Не указан</option>
                {warehouses?.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="marketplace">Маркетплейс</Label>
              <Input id="marketplace" value="Wildberries" disabled />
            </div>
            <div>
              <Label htmlFor="transport">Транспорт</Label>
              <Input id="transport" value={form.transport} onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="driverName">Водитель</Label>
              <Input id="driverName" value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} />
            </div>
            {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Создаём…" : "Создать отгрузку"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
