import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Kanban,
  CalendarDays,
  PackageSearch,
  ClipboardList,
  ScanBarcode,
  PackagePlus,
  Truck,
  Boxes,
  PackageCheck,
  Warehouse,
  Layers,
  Grid3x3,
  ArrowLeftRight,
  ClipboardCheck,
  PackageOpen,
  Users,
  Tag,
  CircleDollarSign,
  Calculator,
  AlertTriangle,
  ShieldAlert,
  SlidersHorizontal,
  Wallet,
  FileText,
  Bell,
  Settings,
  UserCog,
  Package,
  Plug,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-store";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  roles?: UserRole[];
}

export interface NavSection {
  label: string;
  href?: string;
  icon?: LucideIcon;
  roles?: UserRole[];
  items?: NavItem[];
}

const STAFF_ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "MANAGER", "STOREKEEPER", "PACKER"];
const OFFICE_ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "MANAGER"];
const MANAGEMENT_ROLES: UserRole[] = ["ADMIN", "DIRECTOR"];

export const NAV_SECTIONS: NavSection[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: STAFF_ROLES },
  { label: "Аналитика", href: "/analytics", icon: BarChart3, roles: MANAGEMENT_ROLES },
  { label: "Воронка / Kanban", href: "/kanban", icon: Kanban, roles: STAFF_ROLES },
  { label: "Календарь отгрузок", href: "/calendar", icon: CalendarDays, roles: STAFF_ROLES },
  {
    label: "FBS",
    icon: PackageSearch,
    roles: STAFF_ROLES,
    items: [
      { label: "Заказы", href: "/fbs/orders", icon: ClipboardList },
      { label: "Сборка", href: "/fbs/picking", icon: ScanBarcode, roles: ["ADMIN", "STOREKEEPER"] },
      { label: "Упаковка", href: "/fbs/packing", icon: PackagePlus, roles: ["ADMIN", "PACKER"] },
      { label: "Отгрузки", href: "/fbs/shipping", icon: Truck },
    ],
  },
  {
    label: "FBO",
    icon: Boxes,
    roles: STAFF_ROLES,
    items: [
      { label: "Поставки", href: "/fbo/supplies", icon: PackageCheck },
      { label: "Сборка", href: "/fbo/picking", icon: ScanBarcode, roles: ["ADMIN", "STOREKEEPER"] },
    ],
  },
  {
    label: "Склад",
    icon: Warehouse,
    roles: STAFF_ROLES,
    items: [
      { label: "Остатки", href: "/warehouse/stock", icon: Layers },
      { label: "Ячейки", href: "/warehouse/cells", icon: Grid3x3 },
      { label: "Перемещения", href: "/warehouse/movements", icon: ArrowLeftRight },
      { label: "Инвентаризация", href: "/warehouse/inventory", icon: ClipboardCheck },
    ],
  },
  { label: "Приёмка", href: "/receiving", icon: PackageOpen, roles: STAFF_ROLES },
  { label: "Клиенты", href: "/clients", icon: Users, roles: OFFICE_ROLES },
  { label: "Товары", href: "/products", icon: Tag, roles: STAFF_ROLES },
  {
    label: "Цены",
    icon: CircleDollarSign,
    roles: OFFICE_ROLES,
    items: [
      { label: "Общая цена", href: "/prices/general", icon: Calculator },
      { label: "Цены клиентов", href: "/prices/clients", icon: Users },
      { label: "Требует цены", href: "/prices/needs-price", icon: AlertTriangle },
      { label: "Лимит долга", href: "/prices/debt-limit", icon: ShieldAlert },
      { label: "Буфер витрины", href: "/prices/buffer", icon: SlidersHorizontal },
    ],
  },
  { label: "Долги", href: "/finance/debts", icon: Wallet, roles: OFFICE_ROLES },
  { label: "Документы", href: "/documents", icon: FileText, roles: OFFICE_ROLES },
  { label: "Уведомления", href: "/notifications", icon: Bell, roles: STAFF_ROLES },
  {
    label: "Настройки",
    icon: Settings,
    roles: MANAGEMENT_ROLES,
    items: [
      { label: "Пользователи", href: "/settings/users", icon: UserCog },
      { label: "Склады", href: "/settings/warehouses", icon: Warehouse },
      { label: "Упаковки", href: "/settings/packaging", icon: Package },
      { label: "Маркетплейсы и интеграции", href: "/settings/integrations", icon: Plug },
      { label: "Системные настройки", href: "/settings/system", icon: SlidersHorizontal },
    ],
  },
];

export function isNavVisible(roles: UserRole[] | undefined, role: UserRole) {
  return !roles || roles.includes(role);
}
