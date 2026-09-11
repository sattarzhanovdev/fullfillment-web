"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";

interface ShippingPoint {
  id: number;
  name: string;
  address: string;
  city: string;
  officeType: "sc" | "sw" | "pp";
}

const CARGO_TYPE_LABELS: Record<string, string> = { "1": "МГТ (малогабаритный)", "2": "СГТ (сверхгабаритный)", "3": "КГТ+ (крупногабаритный)" };
const OFFICE_TYPE_LABELS: Record<string, string> = { sc: "Сортировочный центр", sw: "Склад", pp: "ПВЗ" };

/**
 * Пункт отгрузки WB обязателен, чтобы закрыть поставку (deliver) и получить официальный
 * штрихкод — без него deliver вернёт 409. Ищем точки по городу через реальный WB API.
 */
export function WbShippingMethodDialog({
  shipmentId,
  currentPointId,
}: {
  shipmentId: string;
  currentPointId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [cargoType, setCargoType] = useState("1");
  const [pointId, setPointId] = useState("");
  const [shippingType, setShippingType] = useState<"selfShipping" | "transportCompany">("selfShipping");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: points,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["shipment-wb-shipping-points", shipmentId, city, cargoType],
    queryFn: async () =>
      (await apiClient.get<ShippingPoint[]>(`/shipments/${shipmentId}/wb-shipping-points`, { params: { city, cargoType } })).data,
    enabled: false,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/shipments/${shipmentId}/wb-shipping-method`, { shippingPointId: Number(pointId), shippingType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      setOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <MapPin className="h-3.5 w-3.5" />
          {currentPointId ? "Пункт отгрузки WB ✓" : "Указать пункт отгрузки"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Пункт отгрузки WB"
        description="Обязательно перед закрытием поставки — иначе WB не выдаст штрихкод"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="city">Город</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
            </div>
            <div className="w-40">
              <Label htmlFor="cargoType">Тип товара</Label>
              <Select id="cargoType" value={cargoType} onChange={(e) => setCargoType(e.target.value)}>
                {Object.entries(CARGO_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="secondary" disabled={!city || isFetching} onClick={() => refetch()}>
              {isFetching ? "Ищем…" : "Найти"}
            </Button>
          </div>

          {points ? (
            points.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-foreground-muted)]">Пунктов не найдено для этого города/типа товара</p>
            ) : (
              <div>
                <Label htmlFor="point">Пункт отгрузки</Label>
                <Select id="point" value={pointId} onChange={(e) => setPointId(e.target.value)}>
                  <option value="">Выберите пункт</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {OFFICE_TYPE_LABELS[p.officeType]} · {p.address}
                    </option>
                  ))}
                </Select>
              </div>
            )
          ) : null}

          <div>
            <Label htmlFor="shippingType">Способ доставки до пункта</Label>
            <Select id="shippingType" value={shippingType} onChange={(e) => setShippingType(e.target.value as typeof shippingType)}>
              <option value="selfShipping">Силами продавца</option>
              <option value="transportCompany">Транспортной компанией</option>
            </Select>
          </div>

          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" disabled={!pointId || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
