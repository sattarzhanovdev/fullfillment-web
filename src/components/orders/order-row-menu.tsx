"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, PackagePlus, PackageCheck, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CreateShipmentDialog } from "@/components/shipments/create-shipment-dialog";
import { AddToShipmentDialog } from "@/components/shipments/add-to-shipment-dialog";

const NON_CANCELLABLE = ["CANCELLED", "COMPLETED"];

export function OrderRowMenu({ order }: { order: { id: string; orderNumber: string; status: string; shipmentId: string | null } }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/orders/${order.id}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setConfirmCancelOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!order.shipmentId ? (
            <>
              <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                <PackagePlus className="h-3.5 w-3.5" />
                Создать поставку
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAddOpen(true)}>
                <PackageCheck className="h-3.5 w-3.5" />
                Добавить к созданной
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {!NON_CANCELLABLE.includes(order.status) ? (
            <DropdownMenuItem danger onSelect={() => setConfirmCancelOpen(true)}>
              <X className="h-3.5 w-3.5" />
              Отменить заказ
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateShipmentDialog attachOrderId={order.id} open={createOpen} onOpenChange={setCreateOpen} />
      <AddToShipmentDialog orderId={order.id} open={addOpen} onOpenChange={setAddOpen} />

      <Dialog
        open={confirmCancelOpen}
        onOpenChange={(v) => {
          setConfirmCancelOpen(v);
          if (!v) setError(null);
        }}
      >
        <DialogContent title="Отменить заказ?" description={`Заказ №${order.orderNumber} будет отменён, резервы освобождены.`}>
          <div className="flex flex-col gap-4">
            {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmCancelOpen(false)}>
                Не отменять
              </Button>
              <Button variant="danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                {cancelMutation.isPending ? "Отменяем…" : "Отменить заказ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
