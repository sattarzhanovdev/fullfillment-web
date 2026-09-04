"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

interface DocumentRow {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Договор",
  ACT: "Акт",
  INVOICE: "Счёт",
  UPD: "УПД",
  WAYBILL: "Накладная",
  RECEIPT_ACT: "Акт приёмки",
  DISCREPANCY_ACT: "Акт расхождений",
  REPORT: "Отчёт",
  OTHER: "Другое",
};

export default function PortalDocumentsPage() {
  const clientId = useAuthStore((s) => s.user?.clientId);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-documents", clientId],
    queryFn: async () => (await apiClient.get<DocumentRow[]>(`/documents/client/${clientId}`)).data,
    enabled: !!clientId,
  });

  return (
    <div>
      <PageHeader title="Документы" description="Счета, акты, накладные и договор" />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Документов пока нет" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Тип</Th>
                <Th>Дата</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium">{d.title}</Td>
                  <Td>{TYPE_LABELS[d.type] ?? d.type}</Td>
                  <Td>{formatDate(d.createdAt)}</Td>
                  <Td>
                    <a
                      href={`${process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000"}${d.fileUrl}`}
                      target="_blank"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      Скачать
                    </a>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
