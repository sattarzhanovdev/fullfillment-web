"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[12px] text-[var(--color-foreground-muted)]">Отсканирован товар · заказ №{orderNumber}</p>
        <p className="text-[14px] font-semibold">{product.name}</p>
        <p className="mb-2 text-[12.5px] text-[var(--color-foreground-muted)]">Артикул: {product.article}</p>
        {isLoading ? (
          <LoadingBlock />
        ) : label ? (
          <img src={`data:${label.contentType};base64,${label.fileBase64}`} alt="Этикетка WB" className="max-w-full" />
        ) : (
          <>
            <canvas ref={canvasRef} />
            <p className="mt-1 text-[11.5px] text-[var(--color-foreground-muted)]">
              Этикетка WB недоступна{error ? `: ${apiErrorMessage(error)}` : ""} — показан внутренний штрихкод товара
            </p>
          </>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5" />
        Печать
      </Button>
    </Card>
  );
}
