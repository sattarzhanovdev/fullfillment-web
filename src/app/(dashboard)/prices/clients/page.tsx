"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";

interface ClientPrice {
  flatPrice: string | null;
  firstLiterPrice: string | null;
  nextLiterPrice: string | null;
}

type Mode = "general" | "flat" | "formula";

function describe(price: ClientPrice | null | undefined): string {
  if (!price) return "Общая";
  if (price.flatPrice !== null && price.flatPrice !== undefined) {
    return Number(price.flatPrice) === 0 ? "Бесплатно" : `Фиксированная ${formatMoney(price.flatPrice)}`;
  }
  if (price.firstLiterPrice !== null && price.nextLiterPrice !== null && price.firstLiterPrice !== undefined) {
    return "Своя формула";
  }
  return "Общая";
}

export default function ClientPricesPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
  });

  const [activeClient, setActiveClient] = useState<Client | null>(null);

  return (
    <div>
      <PageHeader title="Цены клиентов" description="Персональные условия расчёта стоимости обработки" />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !clients || clients.length === 0 ? (
          <EmptyState icon={Users} title="Клиентов пока нет" description="Добавьте клиентов, чтобы настроить персональные цены" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Клиент</Th>
                <Th>Своя цена</Th>
                <Th>1-й литр</Th>
                <Th>Следующий литр</Th>
                <Th>Применяется</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {clients.map((c) => (
                <ClientPriceRow key={c.id} client={c} onEdit={() => setActiveClient(c)} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {activeClient ? (
        <ClientPriceDialog client={activeClient} onClose={() => setActiveClient(null)} />
      ) : null}
    </div>
  );
}

function ClientPriceRow({ client, onEdit }: { client: Client; onEdit: () => void }) {
  const { data } = useQuery({
    queryKey: ["prices", "client", client.id],
    queryFn: async () => (await apiClient.get<ClientPrice | null>(`/prices/client/${client.id}`)).data,
  });

  return (
    <Tr>
      <Td className="font-medium">{client.name}</Td>
      <Td>{data?.flatPrice ?? "—"}</Td>
      <Td>{data?.firstLiterPrice ?? "—"}</Td>
      <Td>{data?.nextLiterPrice ?? "—"}</Td>
      <Td>{describe(data)}</Td>
      <Td>
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Настроить
        </Button>
      </Td>
    </Tr>
  );
}

function ClientPriceDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["prices", "client", client.id],
    queryFn: async () => (await apiClient.get<ClientPrice | null>(`/prices/client/${client.id}`)).data,
  });

  const [mode, setMode] = useState<Mode>("general");
  const [flatPrice, setFlatPrice] = useState("0");
  const [firstLiterPrice, setFirstLiterPrice] = useState("");
  const [nextLiterPrice, setNextLiterPrice] = useState("");

  useEffect(() => {
    if (!data) {
      setMode("general");
      return;
    }
    if (data.flatPrice !== null && data.flatPrice !== undefined) {
      setMode("flat");
      setFlatPrice(String(data.flatPrice));
    } else if (data.firstLiterPrice !== null && data.firstLiterPrice !== undefined) {
      setMode("formula");
      setFirstLiterPrice(String(data.firstLiterPrice));
      setNextLiterPrice(String(data.nextLiterPrice));
    } else {
      setMode("general");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "general") {
        return apiClient.post(`/prices/client/${client.id}`, {
          flatPrice: null,
          firstLiterPrice: null,
          nextLiterPrice: null,
        });
      }
      if (mode === "flat") {
        return apiClient.post(`/prices/client/${client.id}`, {
          flatPrice: Number(flatPrice),
          firstLiterPrice: null,
          nextLiterPrice: null,
        });
      }
      return apiClient.post(`/prices/client/${client.id}`, {
        flatPrice: null,
        firstLiterPrice: Number(firstLiterPrice),
        nextLiterPrice: Number(nextLiterPrice),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prices", "client", client.id] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={`Цена для клиента: ${client.name}`} description="Выберите, как рассчитывать стоимость обработки">
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              mutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
              <input type="radio" name="mode" checked={mode === "general"} onChange={() => setMode("general")} />
              Использовать общую формулу
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
              <input type="radio" name="mode" checked={mode === "flat"} onChange={() => setMode("flat")} />
              Фиксированная цена (0 = бесплатно)
            </label>
            {mode === "flat" && (
              <Input
                type="number"
                step="0.01"
                value={flatPrice}
                onChange={(e) => setFlatPrice(e.target.value)}
                className="ml-6 w-40"
              />
            )}
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
              <input type="radio" name="mode" checked={mode === "formula"} onChange={() => setMode("formula")} />
              Своя формула по литрам
            </label>
            {mode === "formula" && (
              <div className="ml-6 flex gap-3">
                <div>
                  <Label htmlFor="firstLiterPrice">1-й литр, ₽</Label>
                  <Input
                    id="firstLiterPrice"
                    type="number"
                    step="0.01"
                    value={firstLiterPrice}
                    onChange={(e) => setFirstLiterPrice(e.target.value)}
                    className="w-32"
                  />
                </div>
                <div>
                  <Label htmlFor="nextLiterPrice">Следующий литр, ₽</Label>
                  <Input
                    id="nextLiterPrice"
                    type="number"
                    step="0.01"
                    value={nextLiterPrice}
                    onChange={(e) => setNextLiterPrice(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            )}

            {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}

            <Button type="submit" disabled={mutation.isPending} className="mt-1">
              {mutation.isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
