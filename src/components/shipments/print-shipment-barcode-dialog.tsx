"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import { printBarcodeImage } from "@/lib/print-barcode";

interface WbBarcode {
  contentType: string;
  fileBase64: string;
}

/**
 * Печать этикетки короба отгрузки. Если у клиента отгрузки подключён WB API — используется
 * официальный штрихкод поставки из WB (GET /shipments/:id/wb-barcode, WB его распознает при
 * приёмке). Иначе — запасной вариант: собственный CODE128 по внутреннему barcode отгрузки
 * (годится только для сканирования внутри этого приложения на /fbs/shipping/scan).
 */
export function PrintShipmentBarcodeDialog({ shipmentId, barcode, title }: { shipmentId: string; barcode: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    data: wbBarcode,
    isLoading: wbLoading,
    isError: wbUnavailable,
    error: wbError,
  } = useQuery({
    queryKey: ["shipment-wb-barcode", shipmentId],
    queryFn: async () => (await apiClient.get<WbBarcode>(`/shipments/${shipmentId}/wb-barcode`)).data,
    enabled: open,
    retry: false,
  });

  const showLocalFallback = open && !wbLoading && (wbUnavailable || !wbBarcode);

  useEffect(() => {
    if (!showLocalFallback || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, barcode, { format: "CODE128", displayValue: true, fontSize: 16, height: 60, margin: 8 });
      setError(null);
    } catch {
      setError("Не удалось сгенерировать штрихкод");
    }
  }, [showLocalFallback, barcode]);

  function handlePrint() {
    const dataUrl = wbBarcode ? `data:${wbBarcode.contentType};base64,${wbBarcode.fileBase64}` : canvasRef.current?.toDataURL("image/png");
    if (!dataUrl) return;
    const count = Math.max(1, Math.min(20, Number(quantity) || 1));
    if (!printBarcodeImage(dataUrl, `Короб ${barcode} · ${title}`, count)) {
      setError("Не удалось подготовить печать — попробуйте снова");
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Printer className="h-3.5 w-3.5" />
          Этикетка короба
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Печать этикетки короба"
        description={wbBarcode ? "Официальный штрихкод WB — распознаётся при приёмке поставки" : "Наклейте на короб — сканируется на странице «Сканирование»"}
      >
        <div className="flex flex-col gap-3">
          {wbLoading ? (
            <LoadingBlock />
          ) : wbBarcode ? (
            <img
              src={`data:${wbBarcode.contentType};base64,${wbBarcode.fileBase64}`}
              alt="Штрихкод поставки WB"
              className="mx-auto max-w-full"
            />
          ) : (
            <>
              <canvas ref={canvasRef} className="mx-auto max-w-full" />
              <p className="text-[12px] text-[var(--color-foreground-muted)]">
                Штрихкод WB недоступен{wbError ? `: ${apiErrorMessage(wbError)}` : ""}. Используется внутренний штрихкод — при
                физической приёмке на складе WB он не распознается, годится только для сканирования в этом приложении.
              </p>
            </>
          )}
          <div>
            <Label htmlFor="qty">Количество копий</Label>
            <Input id="qty" type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!!error || wbLoading}>
              Печать
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
