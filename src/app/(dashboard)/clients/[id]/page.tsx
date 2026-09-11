"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ShoppingCart, PackagePlus, Wallet, AlertCircle, FileText, PackageOpen, Store, TrendingUp, BarChart3 } from "lucide-react";
import { Area, BarChart, Bar, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingBlock } from "@/components/ui/spinner";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { exportToCsv, formatDate, formatMoney } from "@/lib/utils";
import { MARKETPLACE_LABELS } from "@/lib/status";

interface ClientDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  debtLimit: string;
  requisites: Record<string, string | null> | null;
  contract: Record<string, string | null> | null;
  telegramLink: { chatId: string | null; username: string | null } | null;
  clientPrice: { flatPrice: string | null; firstLiterPrice: string | null; nextLiterPrice: string | null } | null;
  marketplaceLinks: { id: string; marketplace: string; status: string; apiKey: string | null }[];
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: client, isLoading } = useQuery({
    queryKey: ["clients", id],
    queryFn: async () => (await apiClient.get<ClientDetail>(`/clients/${id}`)).data,
  });

  if (isLoading || !client) {
    return <LoadingBlock />;
  }

  return (
    <div>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Клиенты
      </Link>
      <PageHeader
        title={client.name}
        description={`${client.type === "IP" ? "ИП" : "ООО"} · лимит долга ${formatMoney(client.debtLimit)}`}
        actions={<Badge variant={client.status === "ACTIVE" ? "success" : "danger"}>{client.status}</Badge>}
      />

      <Tabs defaultValue="requisites">
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="requisites">Реквизиты</TabsTrigger>
          <TabsTrigger value="contract">Договор</TabsTrigger>
          <TabsTrigger value="receiving">Приёмка</TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="marketplaces">Маркетплейсы</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
        </TabsList>

        <TabsContent value="requisites">
          <RequisitesTab clientId={id} requisites={client.requisites} />
        </TabsContent>
        <TabsContent value="contract">
          <ContractTab clientId={id} contract={client.contract} />
        </TabsContent>
        <TabsContent value="receiving">
          <ReceivingTab clientId={id} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab clientId={id} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab clientId={id} />
        </TabsContent>
        <TabsContent value="marketplaces">
          <MarketplacesTab clientId={id} links={client.marketplaceLinks} />
        </TabsContent>
        <TabsContent value="telegram">
          <TelegramTab clientId={id} link={client.telegramLink} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequisitesTab({ clientId, requisites }: { clientId: string; requisites: ClientDetail["requisites"] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    legalName: requisites?.legalName ?? "",
    inn: requisites?.inn ?? "",
    ogrn: requisites?.ogrn ?? "",
    legalAddress: requisites?.legalAddress ?? "",
    actualAddress: requisites?.actualAddress ?? "",
    phone: requisites?.phone ?? "",
    email: requisites?.email ?? "",
    bankName: requisites?.bankName ?? "",
    bankAccount: requisites?.bankAccount ?? "",
    bankBik: requisites?.bankBik ?? "",
    contactPerson: requisites?.contactPerson ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`/clients/${clientId}/requisites`, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });

  const fields: [keyof typeof form, string][] = [
    ["legalName", "Юр. название"],
    ["inn", "ИНН"],
    ["ogrn", "ОГРН/ОГРНИП"],
    ["legalAddress", "Юридический адрес"],
    ["actualAddress", "Фактический адрес"],
    ["phone", "Телефон"],
    ["email", "Email"],
    ["bankName", "Банк"],
    ["bankAccount", "Расчётный счёт"],
    ["bankBik", "БИК"],
    ["contactPerson", "Контактное лицо"],
  ];

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {fields.map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Сохраняем…" : "Сохранить реквизиты"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ContractTab({ clientId, contract }: { clientId: string; contract: ClientDetail["contract"] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    number: contract?.number ?? "",
    date: contract?.date ? String(contract.date).slice(0, 10) : "",
    startDate: contract?.startDate ? String(contract.startDate).slice(0, 10) : "",
    tariff: contract?.tariff ?? "",
    terms: contract?.terms ?? "",
    status: contract?.status ?? "DRAFT",
  });

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`/clients/${clientId}/contract`, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="number">Номер договора</Label>
            <Input id="number" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="status">Статус</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активен</option>
              <option value="COMPLETED">Завершён</option>
              <option value="TERMINATED">Расторгнут</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="date">Дата подписания</Label>
            <Input id="date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="startDate">Начало действия</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="tariff">Тариф</Label>
            <Input id="tariff" value={form.tariff} onChange={(e) => setForm((f) => ({ ...f, tariff: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="terms">Условия</Label>
            <Input id="terms" value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Сохраняем…" : "Сохранить договор"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReceivingTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["receipts", clientId],
    queryFn: async () => (await apiClient.get(`/receipts?clientId=${clientId}`)).data,
  });

  if (isLoading) return <LoadingBlock />;
  if (!data || data.length === 0) return <EmptyState icon={PackageOpen} title="Приёмок пока не было" description="Здесь появится история приёмок этого клиента" />;

  return (
    <Card className="overflow-hidden">
      <Table>
        <Thead>
          <tr>
            <Th>Дата</Th>
            <Th>Документ</Th>
            <Th>Мест</Th>
            <Th>Ожидалось</Th>
            <Th>Статус</Th>
          </tr>
        </Thead>
        <tbody>
          {data.map((r: any) => (
            <Tr key={r.id}>
              <Td>{formatDate(r.date)}</Td>
              <Td>{r.documentNumber ?? "—"}</Td>
              <Td>{r.expectedPlaces ?? "—"}</Td>
              <Td>{r.expectedItems ?? "—"}</Td>
              <Td>
                <Badge>{r.status}</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function DocumentsTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("ACT");
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", clientId],
    queryFn: async () => (await apiClient.get(`/documents/client/${clientId}`)).data,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return;
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
                <option value="CONTRACT">Договор</option>
                <option value="ACT">Акт</option>
                <option value="INVOICE">Счёт</option>
                <option value="UPD">УПД</option>
                <option value="WAYBILL">Накладная</option>
                <option value="RECEIPT_ACT">Акт приёмки</option>
                <option value="DISCREPANCY_ACT">Акт расхождений</option>
                <option value="REPORT">Отчёт</option>
                <option value="OTHER">Другое</option>
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

      {isLoading ? (
        <LoadingBlock />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={FileText} title="Документов пока нет" description="Загрузите первый документ по этому клиенту" />
      ) : (
        <Card className="overflow-hidden">
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
              {data.map((d: any) => (
                <Tr key={d.id}>
                  <Td>{d.title}</Td>
                  <Td>{d.type}</Td>
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
        </Card>
      )}
    </div>
  );
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

function AnalyticsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["client-analytics", clientId],
    queryFn: async () => (await apiClient.get(`/clients/${clientId}/analytics`)).data,
  });

  if (isLoading || !data) return <LoadingBlock />;

  const timeSeries: { date: string; orders: number; revenue: number }[] = data.timeSeries ?? [];
  const topProducts: { productId: string; name: string; qty: number }[] = data.topProducts ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            exportToCsv(
              `client-analytics-${clientId}`,
              timeSeries.map((p) => ({ Дата: p.date, Заказов: p.orders, Выручка: p.revenue })),
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Экспорт CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Заказов" value={data.ordersCount} icon={ShoppingCart} tone="accent" />
        <StatCard label="FBO поставок" value={data.fboCount} icon={PackagePlus} tone="accent" />
        <StatCard label="Выручка" value={formatMoney(data.revenue)} icon={Wallet} tone="success" />
        <StatCard
          label="Задолженность"
          value={formatMoney(data.debt)}
          icon={AlertCircle}
          tone={Number(data.debt) > 0 ? "warning" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {timeSeries.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Нет данных за период" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={timeSeries} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="clientRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-foreground-muted)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[var(--shadow-elevated)]">
                        <p className="font-medium">{label}</p>
                        <p style={{ color: "var(--color-accent)" }}>Выручка: {formatMoney(payload[0]?.value as number)}</p>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="revenue" name="Выручка" stroke="var(--color-accent)" strokeWidth={2} fill="url(#clientRevenueFill)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Топ товаров</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {topProducts.length === 0 ? (
            <EmptyState icon={BarChart3} title="Нет данных за период" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, topProducts.length * 34)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-2)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] shadow-[var(--shadow-elevated)]">
                        {payload[0].payload.name} — {payload[0].value} шт.
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="qty" radius={[0, 6, 6, 0]} barSize={14}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill="var(--color-accent)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplacesTab({ clientId, links }: { clientId: string; links: ClientDetail["marketplaceLinks"] }) {
  const queryClient = useQueryClient();
  const marketplace = "WILDBERRIES";
  const [apiKey, setApiKey] = useState("");

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`/marketplaces/client/${clientId}/${marketplace}`, { apiKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
      setApiKey("");
    },
  });

  const sync = useMutation({
    mutationFn: async (integrationId: string) => apiClient.post(`/marketplaces/${integrationId}/sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <Label htmlFor="mp">Маркетплейс</Label>
              <Input id="mp" value="Wildberries" disabled />
            </div>
            <div>
              <Label htmlFor="apiKey">API-ключ</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              Сохранить
            </Button>
          </form>
        </CardContent>
      </Card>

      {links.length === 0 ? (
        <EmptyState icon={Store} title="Интеграции не настроены" description="Подключите маркетплейс, чтобы синхронизировать заказы" />
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <Card key={l.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-[13.5px] font-medium">{MARKETPLACE_LABELS[l.marketplace] ?? l.marketplace}</p>
                <p className="text-[12px] text-[var(--color-foreground-muted)]">{l.apiKey ? "Ключ сохранён" : "Ключ не указан"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={l.status === "CONNECTED" ? "success" : l.status === "ERROR" ? "danger" : "neutral"}>
                  {l.status}
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => sync.mutate(l.id)} disabled={sync.isPending}>
                  Синхронизировать
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TelegramTab({ clientId, link }: { clientId: string; link: ClientDetail["telegramLink"] }) {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState(link?.chatId ?? "");

  useEffect(() => setChatId(link?.chatId ?? ""), [link?.chatId]);

  const mutation = useMutation({
    mutationFn: async () => apiClient.put(`/telegram/client/${clientId}`, { chatId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", clientId] }),
  });

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex max-w-sm flex-col gap-3"
        >
          <div>
            <Label htmlFor="chatId">Telegram chat ID</Label>
            <Input id="chatId" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789" />
          </div>
          <p className="text-[12px] text-[var(--color-foreground-muted)]">
            Клиент получит chat ID, написав вашему Telegram-боту команду /start.
          </p>
          <Button type="submit" disabled={mutation.isPending}>
            Сохранить
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
