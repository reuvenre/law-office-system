import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Clock,
  CheckSquare,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Full navigation (desktop sidebar). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/clients", label: "לקוחות", icon: Users },
  { href: "/cases", label: "תיקים", icon: Briefcase },
  { href: "/hearings", label: "יומן", icon: CalendarDays },
  { href: "/deadlines", label: "מועדים", icon: Clock },
  { href: "/tasks", label: "משימות", icon: CheckSquare },
  { href: "/search", label: "חיפוש", icon: Search },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

/** Primary items shown in the mobile bottom navigation. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/clients", label: "לקוחות", icon: Users },
  { href: "/cases", label: "תיקים", icon: Briefcase },
  { href: "/search", label: "חיפוש", icon: Search },
];
