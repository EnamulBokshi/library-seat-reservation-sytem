import {
  Armchair,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Receipt,
  ScanLine,
  Settings,
  UserRound,
} from "lucide-react";
import { Role } from "@/lib/types";

export interface NavTabItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Match the pathname exactly instead of by prefix (for section roots). */
  exact?: boolean;
  badge?: string;
  /** Roles allowed to see the item. Omitted means every role in the workspace. */
  roles?: Role[];
}

export interface DashboardWorkspace {
  /** Branding badge under the product name. */
  portalLabel: string;
  /** Where the sidebar logo links. */
  homeHref: string;
  /** Heading above the nav list. */
  sectionLabel: string;
  tabs: NavTabItem[];
  /** The cross-link at the foot of the sidebar. */
  switchLink: { href: string; label: string };
}

const STAFF_ROLES: Role[] = ["admin", "librarian", "super_admin"];

export const isStaffRole = (role?: Role): boolean =>
  Boolean(role && STAFF_ROLES.includes(role));

const ADMIN_WORKSPACE: DashboardWorkspace = {
  portalLabel: "Admin Portal",
  homeHref: "/admin",
  sectionLabel: "Management Modules",
  switchLink: { href: "/", label: "Switch to Student View" },
  tabs: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/admin/books", label: "Book Inventory", icon: BookOpen },
    { href: "/admin/loans", label: "Circulation Desk", icon: BookMarked },
    { href: "/admin/bookings", label: "Seat Bookings", icon: ClipboardList },
    { href: "/admin/checkin", label: "Check-In Scanner", icon: ScanLine },
    { href: "/admin/schedules", label: "Schedules & Slots", icon: Calendar },
    { href: "/admin/zones", label: "Zones & Capacity", icon: MapPin },
    // Only full admins may change runtime settings; librarians see the rest.
    { href: "/admin/settings", label: "System Settings", icon: Settings, roles: ["admin", "super_admin"] },
  ],
};

const STUDENT_WORKSPACE: DashboardWorkspace = {
  portalLabel: "My Library",
  homeHref: "/dashboard",
  sectionLabel: "My Library",
  switchLink: { href: "/", label: "Back to Library Home" },
  tabs: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/bookings", label: "My Bookings", icon: Armchair },
    { href: "/dashboard/loans", label: "My Loans", icon: BookOpen },
    { href: "/dashboard/fines", label: "Fines", icon: Receipt },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
};

export const WORKSPACES: Record<"admin" | "student", DashboardWorkspace> = {
  admin: ADMIN_WORKSPACE,
  student: STUDENT_WORKSPACE,
};

/**
 * Drop the tabs a role may not open, so the sidebar never offers a link that
 * the API would refuse anyway.
 */
export const visibleTabs = (workspace: DashboardWorkspace, role?: Role): NavTabItem[] =>
  workspace.tabs.filter((tab) => !tab.roles || (role ? tab.roles.includes(role) : false));
