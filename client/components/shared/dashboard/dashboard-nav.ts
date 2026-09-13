import {
  Armchair,
  BookCheck,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Receipt,
  ScanLine,
  Settings,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react"
import { NavBadgeKey, Role } from "@/lib/types"

export interface NavTabItem {
  href: string
  label: string
  icon: React.ElementType
  /** Match the pathname exactly instead of by prefix (for section roots). */
  exact?: boolean
  badge?: string
  /** Counter to show as a live badge, resolved by `useNavBadges`. */
  badgeKey?: NavBadgeKey
  /** Colour the badge as a call to action rather than a neutral tally. */
  badgeTone?: "neutral" | "alert"
  /** Roles allowed to see the item. Omitted means every role in the workspace. */
  roles?: Role[]
}

export interface DashboardWorkspace {
  /** Branding badge under the product name. */
  portalLabel: string
  /** Where the sidebar logo links. */
  homeHref: string
  /** Heading above the nav list. */
  sectionLabel: string
  tabs: NavTabItem[]
  /** The cross-link at the foot of the sidebar. */
  switchLink: { href: string; label: string }
}

const STAFF_ROLES: Role[] = ["admin", "librarian", "super_admin"]

export const isStaffRole = (role?: Role): boolean =>
  Boolean(role && STAFF_ROLES.includes(role))

const ADMIN_WORKSPACE: DashboardWorkspace = {
  portalLabel: "Admin Portal",
  homeHref: "/admin",
  sectionLabel: "Management Modules",
  switchLink: { href: "/", label: "Switch to Student View" },
  tabs: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/admin/books", label: "Book Inventory", icon: BookOpen },
    {
      href: "/admin/borrow-requests",
      label: "Borrow Requests",
      icon: BookCheck,
      badgeKey: "pendingBorrowRequests",
      badgeTone: "alert",
    },
    { href: "/admin/loans", label: "Circulation Desk", icon: BookMarked },
    {
      href: "/admin/bookings",
      label: "Seat Bookings",
      icon: ClipboardList,
      badgeKey: "activeBookings",
    },
    {
      href: "/admin/fines",
      label: "Fines Ledger",
      icon: Receipt,
      badgeKey: "unpaidFines",
      badgeTone: "alert",
    },
    {
      href: "/admin/waivers",
      label: "Waiver Requests",
      icon: ShieldCheck,
      badgeKey: "pendingWaivers",
      badgeTone: "alert",
    },
    // Only full admins decide who joins the faculty roster.
    {
      href: "/admin/approvals",
      label: "Account Approvals",
      icon: UserRoundCheck,
      roles: ["admin", "super_admin"],
      badgeKey: "pendingApprovals",
      badgeTone: "alert",
    },
    {
      href: "/admin/users",
      label: "User Management",
      icon: Users,
      roles: ["admin", "super_admin"],
    },
    { href: "/admin/checkin", label: "Check-In Scanner", icon: ScanLine },
    { href: "/admin/schedules", label: "Schedules & Slots", icon: Calendar },
    { href: "/admin/zones", label: "Zones & Capacity", icon: MapPin },
    // Only full admins may change runtime settings; librarians see the rest.
    {
      href: "/admin/settings",
      label: "System Settings",
      icon: Settings,
      roles: ["admin", "super_admin"],
    },
  ],
}

const STUDENT_WORKSPACE: DashboardWorkspace = {
  portalLabel: "My Library",
  homeHref: "/dashboard",
  sectionLabel: "My Library",
  switchLink: { href: "/", label: "Back to Library Home" },
  tabs: [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/bookings", label: "My Bookings", icon: Armchair },
    { href: "/dashboard/loans", label: "My Loans", icon: BookOpen },
    {
      href: "/dashboard/fines",
      label: "Fines",
      icon: Receipt,
      roles: ["student"],
      badgeKey: "myUnpaidFines",
      badgeTone: "alert",
    },
    // Faculty privilege: petition an admin to clear a student's fine.
    {
      href: "/dashboard/waivers",
      label: "Fine Waivers",
      icon: ShieldCheck,
      roles: ["faculty"],
      badgeKey: "myPendingWaivers",
    },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
}

export const WORKSPACES: Record<"admin" | "student", DashboardWorkspace> = {
  admin: ADMIN_WORKSPACE,
  student: STUDENT_WORKSPACE,
}

/**
 * Drop the tabs a role may not open, so the sidebar never offers a link that
 * the API would refuse anyway.
 */
export const visibleTabs = (
  workspace: DashboardWorkspace,
  role?: Role
): NavTabItem[] =>
  workspace.tabs.filter(
    (tab) => !tab.roles || (role ? tab.roles.includes(role) : false)
  )

/** Badge text: nothing below 1, capped so a long number cannot break the row. */
export const formatBadgeCount = (count: number): string | null => {
  if (!Number.isFinite(count) || count < 1) {
    return null
  }
  return count > 99 ? "99+" : String(count)
}
