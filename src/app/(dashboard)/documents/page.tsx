"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

const DOC_TYPE_LABELS: Record<string, string> = {
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

interface Document {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const [clientId, setClientId] = useState("");
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", clientId],
    queryFn: async () => (await apiClient.get<Document[]>(`/documents/client/${clientId}`)).data,
    enabled: !!clientId,
  });

  const [type, setType] = useState("OTHER");
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !clientId) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("title", file.name);
      return apiClient.post(`/documents/client/${clientId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
      setFile(null);
    },
  });

  return (
    <div>
      <PageHeader title="Документы" description="Договоры, акты, счета и накладные по клиентам" />

      <Card className="mb-4">
        <CardContent>
          <Label htmlFor="client">Клиент</Label>
          <Select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="max-w-sm">
            <option value="">Выберите клиента</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {clientId ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  upload.mutate();
                }}
                className="flex flex-wrap items-end gap-3"
              >
                <div>
                  <Label htmlFor="doc-type">Тип документа</Label>
                  <Select id="doc-type" value={type} onChange={(e) => setType(e.target.value)}>
                    {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file">Файл</Label>
                  <input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[13px]" />
                </div>
                <Button type="submit" disabled={!file || upload.isPending}>
                  {upload.isPending ? "Загружаем…" : "Загрузить"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            {isLoading ? (
              <LoadingBlock />
            ) : !documents || documents.length === 0 ? (
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
                  {documents.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-medium">{d.title}</Td>
                      <Td>{DOC_TYPE_LABELS[d.type] ?? d.type}</Td>
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
      ) : (
        <EmptyState title="Выберите клиента" description="Чтобы увидеть и загрузить документы" />
      )}
    </div>
  );
}
