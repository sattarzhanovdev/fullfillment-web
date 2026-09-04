"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Client } from "@/lib/types";
import type { UserRole } from "@/lib/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { LoadingBlock } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  clientId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

const ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "MANAGER", "STOREKEEPER", "PACKER", "CLIENT"];

export default function UsersSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => (await apiClient.get<UserRow[]>("/users")).data,
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-users"] }),
  });

  return (
    <div>
      <PageHeader title="Пользователи" description="Сотрудники и клиентские аккаунты" actions={<UserFormDialog mode="create" />} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Пользователей пока нет" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Email</Th>
                <Th>Имя</Th>
                <Th>Роль</Th>
                <Th>Статус</Th>
                <Th>Последний вход</Th>
                <Th></Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((u) => (
                <Tr key={u.id}>
                  <Td>{u.email}</Td>
                  <Td className="font-medium">{u.fullName}</Td>
                  <Td>{ROLE_LABELS[u.role] ?? u.role}</Td>
                  <Td>
                    <Badge variant={u.isActive ? "success" : "neutral"}>{u.isActive ? "Активен" : "Отключён"}</Badge>
                  </Td>
                  <Td>{formatDateTime(u.lastLoginAt)}</Td>
                  <Td className="flex items-center gap-2">
                    <UserFormDialog mode="edit" user={u} />
                    {u.isActive && (
                      <Button size="sm" variant="secondary" onClick={() => deactivate.mutate(u.id)} disabled={deactivate.isPending}>
                        Отключить
                      </Button>
                    )}
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

function UserFormDialog({ mode, user }: { mode: "create" | "edit"; user?: UserRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await apiClient.get<Client[]>("/clients")).data,
    enabled: open,
  });

  const [form, setForm] = useState({
    email: user?.email ?? "",
    password: "",
    fullName: user?.fullName ?? "",
    role: user?.role ?? ("MANAGER" as UserRole),
    clientId: user?.clientId ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        return apiClient.post("/users", {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          clientId: form.role === "CLIENT" ? form.clientId : undefined,
        });
      }
      return apiClient.patch(`/users/${user!.id}`, {
        fullName: form.fullName,
        role: form.role,
        clientId: form.role === "CLIENT" ? form.clientId : undefined,
        ...(form.password ? { password: form.password } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      setOpen(false);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="h-4 w-4" />
            Создать пользователя
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            Изменить
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={mode === "create" ? "Новый пользователь" : "Изменить пользователя"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              disabled={mode === "edit"}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="fullName">Имя</Label>
            <Input id="fullName" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="password">{mode === "create" ? "Пароль" : "Новый пароль (необязательно)"}</Label>
            <Input
              id="password"
              type="password"
              required={mode === "create"}
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="role">Роль</Label>
            <Select id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          {form.role === "CLIENT" && (
            <div>
              <Label htmlFor="clientId">Клиент</Label>
              <Select id="clientId" required value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
                <option value="">Выберите клиента</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {error ? <p className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
