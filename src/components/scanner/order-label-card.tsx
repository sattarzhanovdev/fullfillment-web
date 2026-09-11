"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, Subcard } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { printBarcodeImage } from "@/lib/print-barcode";

interface WbLabel {
  contentType: string;
  fileBase64: string;
}

interface ScannedProduct {
  name: string;
  article: string;
  barcode: string;
}

/**
 * Показывает этикетку сразу после скана товара при сборке. Приоритет — настоящий стикер
 * заказа из WB (GET /marketplaces/orders/:orderId/label, тот же, что WB клеит на посылку).
 * Если недоступен (заказ не от WB, нет интеграции, WB ещё не подтвердил) — запасной
 * вариант: собственный CODE128 по штрихкоду товара (годится только для внутреннего скана).
 */
export function OrderLabelCard({ orderId, orderNumber, product }: { orderId: string; orderNumber: string; product: ScannedProduct }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    data: label,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["order-wb-label", orderId],
    queryFn: async () => (await apiClient.get<WbLabel>(`/marketplaces/orders/${orderId}/label`, { params: { width: 40, height: 30 } })).data,
    retry: false,
  });

  const showLocalFallback = !isLoading && (isError || !label);

  useEffect(() => {
    if (!showLocalFallback || !canvasRef.current) return;
    JsBarcode(canvasRef.current, product.barcode, { format: "CODE128", displayValue: true, fontSize: 14, height: 50, margin: 6 });
  }, [showLocalFallback, product.barcode]);

  function handlePrint() {
    const dataUrl = label ? `data:${label.contentType};base64,${label.fileBase64}` : canvasRef.current?.toDataURL("image/png");
    if (!dataUrl) return;
    // Реальная этикетка WB запрошена под размер 40×30мм — печатаем на такой же физической странице.
    printBarcodeImage(dataUrl, `${product.name} · Заказ №${orderNumber}`, 1, label ? { width: 40, height: 30 } : undefined);
  }

  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--color-foreground-muted)]">Отсканирован товар · заказ №{orderNumber}</p>
          <p className="truncate text-[14px] font-semibold">{product.name}</p>
          <p className="text-[12.5px] text-[var(--color-foreground-muted)]">Артикул: {product.article}</p>
        </div>
        {!isLoading ? (
          <Button size="sm" variant="secondary" onClick={handlePrint} className="shrink-0">
            <Printer className="h-3.5 w-3.5" />
            Печать
          </Button>
        ) : null}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <LoadingBlock />
        ) : label ? (
          <Subcard className="inline-flex p-2">
            <img
              src={`data:${label.contentType};base64,${label.fileBase64}`}
              alt="Этикетка WB"
              className="h-auto w-[180px] rounded-[6px] bg-white"
            />
          </Subcard>
        ) : (
          <>
            <Subcard className="inline-flex p-2">
              <canvas ref={canvasRef} />
            </Subcard>
            <p className="mt-2 text-[11.5px] text-[var(--color-foreground-muted)]">
              Этикетка WB недоступна{error ? `: ${apiErrorMessage(error)}` : ""} — показан внутренний штрихкод товара
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
