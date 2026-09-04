export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "reserve";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW_REQUEST: "Новая заявка",
  AWAITING_RECEIPT: "Ожидает приёмки",
  RECEIVING: "Приёмка",
  RECEIVED: "Принято",
  AWAITING_PROCESSING: "Ожидает обработки",
  IN_PROGRESS: "В работе",
  PICKING: "Сборка",
  PICKED: "Собрано",
  PACKING: "Упаковка",
  PACKED: "Упаковано",
  READY_TO_SHIP: "Готово к отгрузке",
  SHIPPED: "Отгружено",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  ERROR: "Ошибка",
  ITEM_NOT_FOUND: "Не найден товар",
  NEEDS_PRICE: "Требует цены",
  BLOCKED_DEBT: "Заблокировано по долгу",
  NEEDS_CLARIFICATION: "Требует уточнения",
};

export const ORDER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  NEW_REQUEST: "neutral",
  AWAITING_RECEIPT: "neutral",
  RECEIVING: "accent",
  RECEIVED: "accent",
  AWAITING_PROCESSING: "accent",
  IN_PROGRESS: "accent",
  PICKING: "accent",
  PICKED: "success",
  PACKING: "accent",
  PACKED: "success",
  READY_TO_SHIP: "success",
  SHIPPED: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
  ERROR: "danger",
  ITEM_NOT_FOUND: "danger",
  NEEDS_PRICE: "warning",
  BLOCKED_DEBT: "danger",
  NEEDS_CLARIFICATION: "warning",
};

export const SUPPLY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  CREATED: "Создана",
  PICKING: "Собирается",
  PICKED: "Собрана",
  PACKING: "Упаковывается",
  READY: "Готова",
  SHIPPED: "Отгружена",
  ACCEPTED_BY_MARKETPLACE: "Принята маркетплейсом",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export const SUPPLY_STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: "neutral",
  CREATED: "accent",
  PICKING: "accent",
  PICKED: "success",
  PACKING: "accent",
  READY: "success",
  SHIPPED: "success",
  ACCEPTED_BY_MARKETPLACE: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export const DEBT_STATE_LABELS: Record<string, string> = {
  NORMAL: "В норме",
  WARNING: "Предупреждение",
  CRITICAL: "Критическое",
  BLOCKED: "Заблокирован",
};

export const DEBT_STATE_VARIANT: Record<string, BadgeVariant> = {
  NORMAL: "success",
  WARNING: "warning",
  CRITICAL: "danger",
  BLOCKED: "danger",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  DIRECTOR: "Руководитель",
  MANAGER: "Менеджер",
  STOREKEEPER: "Кладовщик",
  PACKER: "Упаковщик",
  CLIENT: "Клиент",
};

export const MARKETPLACE_LABELS: Record<string, string> = {
  WILDBERRIES: "Wildberries",
  OZON: "Ozon",
  YANDEX_MARKET: "Яндекс Маркет",
  MEGAMARKET: "Мегамаркет",
  OTHER: "Другой",
};
