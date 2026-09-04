"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Активен", BLOCKED: "Заблокирован", ARCHIVED: "Архив" };
const STATUS_VARIANT: Record<string, "success" | "danger" | "neutral"> = {
  ACTIVE: "success",
  BLOCKED: "danger",
  ARCHIVED: "neutral",
};

export default function ClientsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  return (
    <div>
      <PageHeader
        title="Клиенты"
        description="Компании, которых вы обслуживаете по фулфилменту"
        actions={<CreateClientDialog />}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Пока нет клиентов" description="Добавьте первого клиента, чтобы начать работу" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Название</Th>
                <Th>Тип</Th>
                <Th>Менеджер</Th>
                <Th>Товаров</Th>
                <Th>Заказов</Th>
                <Th>Долг</Th>
                <Th>Статус</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((client) => (
                <Tr key={client.id}>
                  <Td>
                    <Link href={`/clients/${client.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                      {client.name}
                    </Link>
                  </Td>
                  <Td>{client.type}</Td>
                  <Td>{client.manager?.fullName ?? "—"}</Td>
                  <Td>{client.productsCount ?? 0}</Td>
                  <Td>{client.ordersCount ?? 0}</Td>
                  <Td className={client.debt && client.debt > 0 ? "text-[var(--color-warning)]" : undefined}>
                    {formatMoney(client.debt)}
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[client.status]}>{STATUS_LABEL[client.status]}</Badge>
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

function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"IP" | "OOO">("IP");
  const [debtLimit, setDebtLimit] = useState("10000");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/clients", { name, type, debtLimit: Number(debtLimit) });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setName("");
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <Plus className="h-4 w-4" />
          Добавить клиента
        </Button>
      </DialogTrigger>
      <DialogContent title="Новый клиент" description="Создайте карточку клиента, реквизиты можно добавить позже">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="name">Название</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ИП Иванов" />
          </div>
          <div>
            <Label htmlFor="type">Тип</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as "IP" | "OOO")}>
              <option value="IP">ИП</option>
              <option value="OOO">ООО</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="debtLimit">Лимит задолженности, ₽</Label>
            <Input id="debtLimit" type="number" value={debtLimit} onChange={(e) => setDebtLimit(e.target.value)} />
          </div>
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending} className="mt-1">
            {mutation.isPending ? "Создаём…" : "Создать клиента"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
