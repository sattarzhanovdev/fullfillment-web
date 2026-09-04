import { Badge } from "./badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, SUPPLY_STATUS_LABELS, SUPPLY_STATUS_VARIANT } from "@/lib/status";

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={ORDER_STATUS_VARIANT[status] ?? "neutral"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function SupplyStatusBadge({ status }: { status: string }) {
  return <Badge variant={SUPPLY_STATUS_VARIANT[status] ?? "neutral"}>{SUPPLY_STATUS_LABELS[status] ?? status}</Badge>;
}
