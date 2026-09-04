"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import type { Product } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface StockTotals {
  physicalQty: number;
  reservedQty: number;
  blockedQty: number;
  availableQty: number;
}

export default function PortalProductsPage() {
  const clientId = useAuthStore((s) => s.user?.clientId);

  const { data: products, isLoading } = useQuery({
    queryKey: ["portal-products", clientId],
    queryFn: async () => (await apiClient.get<Product[]>("/products", { params: { clientId } })).data,
    enabled: !!clientId,
  });

  const stockQueries = useQueries({
    queries: (products ?? []).map((p) => ({
      queryKey: ["portal-stock-totals", p.id],
      queryFn: async () => (await apiClient.get<StockTotals>(`/stock/product/${p.id}/totals`)).data,
    })),
  });

  return (
    <div>
      <PageHeader title="Товары" description="Ваши товары на складе" />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !products || products.length === 0 ? (
          <EmptyState title="Товаров пока нет" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>SKU</Th>
                <Th>Название</Th>
                <Th>Артикул</Th>
                <Th>Штрихкод</Th>
                <Th>Габариты, см</Th>
                <Th>Остаток</Th>
                <Th>Резерв</Th>
                <Th>Доступно</Th>
              </tr>
            </Thead>
            <tbody>
              {products.map((p, i) => {
                const totals = stockQueries[i]?.data;
                return (
                  <Tr key={p.id}>
                    <Td>{p.sku}</Td>
                    <Td className="font-medium">{p.name}</Td>
                    <Td>{p.article}</Td>
                    <Td className="font-mono text-[12.5px]">{p.barcode}</Td>
                    <Td>
                      {p.lengthCm && p.widthCm && p.heightCm ? `${p.lengthCm}×${p.widthCm}×${p.heightCm}` : "не указаны"}
                    </Td>
                    <Td>{totals ? totals.physicalQty : "…"}</Td>
                    <Td>
                      {totals ? (
                        <Badge variant="reserve">{totals.reservedQty}</Badge>
                      ) : (
                        "…"
                      )}
                    </Td>
                    <Td className="font-medium">{totals ? totals.availableQty : "…"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
