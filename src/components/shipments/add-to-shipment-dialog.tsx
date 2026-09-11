"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

interface OpenShipment {
  id: string;
  scheduledAt: string;
  warehouse: { id: string; name: string } | null;
}

/** Диалог добавления заказа к уже созданной (открытой) отгрузке. Открытие/закрытие управляется снаружи. */
export function AddToShipmentDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [shipmentId, setShipmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wbWarning, setWbWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments", "open"],
    queryFn: async () => (await apiClient.get<OpenShipment[]>("/shipments", { params: { status: "PLANNED,IN_PROGRESS" } })).data,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => apiClient.post<{ wbWarning: string | null }>(`/shipments/${shipmentId}/orders/${orderId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShipmentId("");
      if (res.data.wbWarning) {
        setWbWarning(res.data.wbWarning);
      } else {
        onOpenChange(false);
      }
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setError(null);
          setWbWarning(null);
        }
      }}
    >
      <DialogContent title="Добавить к отгрузке" description="Заказ будет привязан к выбранной отгрузке">
        {wbWarning ? (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-[var(--color-warning)]">
              Заказ добавлен локально, но не синхронизирован с WB: {wbWarning}
            </p>
            <Button onClick={() => onOpenChange(false)}>Понятно</Button>
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
              <Label htmlFor="shipmentId">Отгрузка</Label>
              <Select id="shipmentId" required value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} disabled={isLoading}>
                <option value="">{isLoading ? "Загрузка…" : "Выберите отгрузку"}</option>
                {shipments?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDateTime(s.scheduledAt)} · {s.warehouse?.name ?? "Склад не указан"}
                  </option>
                ))}
              </Select>
              {!isLoading && shipments?.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[var(--color-foreground-muted)]">Нет открытых отгрузок — создайте новую</p>
              ) : null}
            </div>
            {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
            <Button type="submit" disabled={!shipmentId || mutation.isPending}>
              {mutation.isPending ? "Добавляем…" : "Добавить"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
