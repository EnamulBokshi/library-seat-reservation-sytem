"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { userService } from "@/services/user-service"
import {
  AdminUpdateUserPayload,
  CreateUserPayload,
  Role,
  UserProfile,
  UserSortField,
  UserStats,
} from "@/lib/types"
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  IdCard,
  KeyRound,
  Library,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react"

const ROLE_CONFIG: Record<
  Role,
  { label: string; badge: string; bgSoft: string; icon: React.ElementType }
> = {
  super_admin: {
    label: "Super Admin",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    bgSoft: "bg-purple-50",
    icon: ShieldAlert,
  },
  admin: {
    label: "Admin",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    bgSoft: "bg-indigo-50",
    icon: ShieldCheck,
  },
  librarian: {
    label: "Librarian",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    bgSoft: "bg-blue-50",
    icon: Library,
  },
  faculty: {
    label: "Faculty",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bgSoft: "bg-emerald-50",
    icon: GraduationCap,
  },
  student: {
    label: "Student",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    bgSoft: "bg-slate-50",
    icon: Users,
  },
}

const SORT_OPTIONS: { value: UserSortField; label: string }[] = [
  { value: "createdAt", label: "Date Joined" },
  { value: "name", label: "Full Name" },
  { value: "email", label: "Email Address" },
  { value: "role", label: "Account Role" },
  { value: "isActive", label: "Account Status" },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function AdminUsersManagementView() {
  const { user: currentUser } = useAuth()
  const isCurrentSuperAdmin = currentUser?.role === "super_admin"

  const [users, setUsers] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters & Query State
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all")
  const [sortBy, setSortBy] = useState<UserSortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Loading & Notice states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)

  // Form states for Create User
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentId: "",
    facultyId: "",
    department: "",
    designation: "",
    isActive: true,
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Form states for Edit User
  const [editForm, setEditForm] = useState<AdminUpdateUserPayload>({
    name: "",
    role: "student",
    isActive: true,
    studentId: "",
    facultyId: "",
    department: "",
    designation: "",
    password: "",
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch users directory
  const loadUsers = useCallback(async () => {
    try {
      setError(null)
      const res = await userService.listUsers({
        page,
        limit,
        role: roleFilter === "all" ? undefined : roleFilter,
        isActive:
          statusFilter === "all" ? undefined : statusFilter === "active",
        searchTerm: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      })

      if (res.data) {
        setUsers(res.data)
        if (res.meta) {
          setTotalCount(res.meta.total)
          setTotalPages(res.meta.totalPages || 1)
          if ((res.meta as any).stats) {
            setStats((res.meta as any).stats)
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load users:", err)
      setError(err?.response?.data?.message || err?.message || "Failed to load user records.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, limit, roleFilter, statusFilter, debouncedSearch, sortBy, sortOrder])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Open Edit modal
  const handleOpenEdit = (target: UserProfile) => {
    setEditTarget(target)
    setEditError(null)
    setEditForm({
      name: target.name,
      role: target.role,
      isActive: target.isActive !== false,
      studentId: target.studentId || "",
      facultyId: target.facultyId || "",
      department: target.department || "",
      designation: target.designation || "",
      password: "",
    })
  }

  // Quick Toggle Active / Suspend
  const handleToggleStatus = async (target: UserProfile) => {
    if (target.id === currentUser?.id) {
      setError("You cannot deactivate your own administrative account.")
      return
    }
    setActionBusyId(target.id)
    try {
      const newStatus = !target.isActive
      await userService.updateUser(target.id, { isActive: newStatus })
      setNotice(`Account for ${target.name} has been ${newStatus ? "activated" : "suspended"}.`)
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update account status.")
    } finally {
      setActionBusyId(null)
    }
  }

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError("Name, institutional email, and temporary password are required.")
      return
    }

    if (createForm.password.length < 6) {
      setCreateError("Password must be at least 6 characters.")
      return
    }

    if (createForm.role === "super_admin" && !isCurrentSuperAdmin) {
      setCreateError("Only a Super Admin can create another Super Admin account.")
      return
    }

    setCreateSubmitting(true)
    try {
      await userService.createUser({
        ...createForm,
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        studentId: createForm.role === "student" ? createForm.studentId?.trim() || null : null,
        facultyId: createForm.role === "faculty" ? createForm.facultyId?.trim() || null : null,
        department: createForm.role === "faculty" ? createForm.department?.trim() || null : null,
        designation: createForm.role === "faculty" ? createForm.designation?.trim() || null : null,
      })
      setCreateModalOpen(false)
      setNotice(`Account for ${createForm.name} created successfully as ${ROLE_CONFIG[createForm.role].label}.`)
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "student",
        studentId: "",
        facultyId: "",
        department: "",
        designation: "",
        isActive: true,
      })
      loadUsers()
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.message || "Failed to create user.")
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Handle Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setEditError(null)

    if (editForm.role === "super_admin" && editTarget.role !== "super_admin" && !isCurrentSuperAdmin) {
      setEditError("Only a Super Admin can assign the Super Admin role.")
      return
    }

    if (editTarget.id === currentUser?.id) {
      if (editForm.isActive === false) {
        setEditError("You cannot deactivate your own account.")
        return
      }
      if (editForm.role && editForm.role !== currentUser?.role) {
        setEditError("You cannot modify your own administrative role.")
        return
      }
    }

    setEditSubmitting(true)
    try {
      const payload: AdminUpdateUserPayload = {
        name: editForm.name?.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
        studentId: editForm.role === "student" ? editForm.studentId?.trim() || null : null,
        facultyId: editForm.role === "faculty" ? editForm.facultyId?.trim() || null : null,
        department: editForm.role === "faculty" ? editForm.department?.trim() || null : null,
        designation: editForm.role === "faculty" ? editForm.designation?.trim() || null : null,
      }
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim()
      }

      await userService.updateUser(editTarget.id, payload)
      setEditTarget(null)
      setNotice(`Account details for ${editForm.name} have been updated.`)
      loadUsers()
    } catch (err: any) {
      setEditError(err?.response?.data?.message || err?.message || "Failed to update user.")
    } finally {
      setEditSubmitting(false)
    }
  }

  // Handle Delete User Submit
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return

    // Critical Self-Delete Check
    if (deleteTarget.id === currentUser?.id) {
      setError("Self-deletion is strictly prohibited. You cannot delete your own account.")
      setDeleteTarget(null)
      return
    }

    // Super Admin Protection
    if (deleteTarget.role === "super_admin" && !isCurrentSuperAdmin) {
      setError("Only a Super Admin can delete a Super Admin account.")
      setDeleteTarget(null)
      return
    }

    setActionBusyId(deleteTarget.id)
    try {
      await userService.deleteUser(deleteTarget.id)
      setNotice(`Account for ${deleteTarget.name} (${deleteTarget.email}) has been permanently deleted.`)
      setDeleteTarget(null)
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete user.")
    } finally {
      setActionBusyId(null)
    }
  }

  // Clear notice after 5 seconds
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  // Clear error after 7 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 7000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Directory & Access Control
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Users className="w-3.5 h-3.5" />
              {totalCount} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage student, faculty, and library staff accounts, assign administrative privileges, and monitor account status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsRefreshing(true)
              loadUsers()
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setCreateError(null)
              setCreateModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {notice && (
        <div className="flex items-center justify-between p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers ?? totalCount}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">{stats?.activeUsers ?? 0} active</span>
            <span>&middot;</span>
            <span className="text-rose-600 font-medium">{stats?.suspendedUsers ?? 0} suspended</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Administrators</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-indigo-950">
            {(stats?.superAdmins ?? 0) + (stats?.admins ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.superAdmins ?? 0} super &middot; {stats?.admins ?? 0} standard
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Librarians</span>
            <Library className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-blue-950">{stats?.librarians ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Circulation & catalog desk</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Faculty</span>
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-emerald-950">{stats?.faculty ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Exempt from overdue fines</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Students</span>
            <IdCard className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.students ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Active seat bookers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, ID, dept..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as Role | "all")
                setPage(1)
              }}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "active" | "suspended")
                setPage(1)
              }}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Accounts Only</option>
              <option value="suspended">Suspended Accounts Only</option>
            </select>
          </div>

          {/* Sort Field & Order */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as UserSortField)}
              className="flex-1 py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shrink-0"
              title={`Toggle sort order: currently ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Identity & Dept</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No users match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search query or reset the role and status filters.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((row) => {
                  const isSelf = row.id === currentUser?.id
                  const isSuperAdminRow = row.role === "super_admin"
                  const roleMeta = ROLE_CONFIG[row.role] || ROLE_CONFIG.student
                  const RoleIcon = roleMeta.icon

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelf ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* User Avatar + Name + Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 uppercase">
                            {row.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">
                                {row.name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 truncate text-[11px]">
                              {row.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.badge}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Identity & Dept */}
                      <td className="py-3 px-4 text-slate-600">
                        {row.role === "student" && (
                          <span>
                            {row.studentId ? (
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {row.studentId}
                              </span>
                            ) : (
                              "—"
                            )}
                          </span>
                        )}
                        {row.role === "faculty" && (
                          <div className="space-y-0.5">
                            {row.facultyId && (
                              <div className="font-mono text-[11px] text-slate-800">
                                ID: {row.facultyId}
                              </div>
                            )}
                            {(row.department || row.designation) && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                {[row.designation, row.department].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </div>
                        )}
                        {["admin", "super_admin", "librarian"].includes(row.role) && (
                          <span className="text-slate-400 italic">Library Staff</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.emailVerifiedAt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Suspend */}
                          <button
                            onClick={() => handleToggleStatus(row)}
                            disabled={isSelf || actionBusyId === row.id}
                            className={`p-1.5 rounded-md transition-colors ${
                              isSelf
                                ? "text-slate-300 cursor-not-allowed"
                                : row.isActive
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={
                              isSelf
                                ? "Cannot suspend own account"
                                : row.isActive
                                ? "Suspend User"
                                : "Activate User"
                            }
                          >
                            {row.isActive ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(row)}
                            disabled={isSelf || (isSuperAdminRow && !isCurrentSuperAdmin)}
                            className={`p-1.5 rounded-md transition-colors ${
                              isSelf || (isSuperAdminRow && !isCurrentSuperAdmin)
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            }`}
                            title={
                              isSelf
                                ? "Cannot delete own account (Self-delete prevented)"
                                : isSuperAdminRow && !isCurrentSuperAdmin
                                ? "Only Super Admin can delete a Super Admin"
                                : "Delete User"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="py-1 px-2 border border-slate-300 rounded bg-white text-xs"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Showing {(page - 1) * limit + (users.length > 0 ? 1 : 0)} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount} users
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1 || isLoading}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || isLoading}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 py-1 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages || isLoading}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || isLoading}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── CREATE USER MODAL ──────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-base">Create New User Account</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Dr. Sadia Rahman"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@diu.edu.bd"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Role & Access Level *</label>
                    {!isCurrentSuperAdmin && (
                      <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Only Super Admin can create Super Admin
                      </span>
                    )}
                  </div>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="student">Student (Standard user, booking privileges)</option>
                    <option value="faculty">Faculty (Overdue fine exempt, waiver petitions)</option>
                    <option value="librarian">Librarian (Circulation desk, catalog management)</option>
                    <option value="admin">Admin (Full administrative dashboard access)</option>
                    <option value="super_admin" disabled={!isCurrentSuperAdmin}>
                      Super Admin {isCurrentSuperAdmin ? "(Full system governance)" : "(Requires Super Admin privileges)"}
                    </option>
                  </select>
                </div>

                {/* Conditional Fields based on Role */}
                {createForm.role === "student" && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Student ID</label>
                    <input
                      type="text"
                      value={createForm.studentId || ""}
                      onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                      placeholder="e.g. 222-05-1019"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}

                {createForm.role === "faculty" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Faculty ID</label>
                      <input
                        type="text"
                        value={createForm.facultyId || ""}
                        onChange={(e) => setCreateForm({ ...createForm, facultyId: e.target.value })}
                        placeholder="e.g. DIU-CSE-094"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Department</label>
                      <input
                        type="text"
                        value={createForm.department || ""}
                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Academic Designation</label>
                      <input
                        type="text"
                        value={createForm.designation || ""}
                        onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                        placeholder="e.g. Associate Professor & Head"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.isActive}
                      onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Activate account immediately (pre-verified by admin)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Edit Account Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editTarget.email}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editTarget.id === currentUser?.id && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>You are editing your own account. Role changes and self-deactivation are prevented.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Role & Privileges</label>
                  <select
                    value={editForm.role}
                    disabled={editTarget.id === currentUser?.id}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="librarian">Librarian</option>
                    <option value="admin">Admin</option>
                    <option
                      value="super_admin"
                      disabled={!isCurrentSuperAdmin && editTarget.role !== "super_admin"}
                    >
                      Super Admin {!isCurrentSuperAdmin && "(Requires Super Admin privileges)"}
                    </option>
                  </select>
                </div>

                {/* Conditional Fields based on Role */}
                {editForm.role === "student" && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Student ID</label>
                    <input
                      type="text"
                      value={editForm.studentId || ""}
                      onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                      placeholder="e.g. 222-05-1019"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}

                {editForm.role === "faculty" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Faculty ID</label>
                      <input
                        type="text"
                        value={editForm.facultyId || ""}
                        onChange={(e) => setEditForm({ ...editForm, facultyId: e.target.value })}
                        placeholder="e.g. DIU-CSE-094"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Department</label>
                      <input
                        type="text"
                        value={editForm.department || ""}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Academic Designation</label>
                      <input
                        type="text"
                        value={editForm.designation || ""}
                        onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                        placeholder="e.g. Associate Professor & Head"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1 sm:col-span-2 pt-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Reset Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={editForm.password || ""}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="New password (min. 6 chars)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      disabled={editTarget.id === currentUser?.id}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Account is Active (uncheck to suspend sign-in privileges)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Delete User Account</h3>

              {/* Check 1: Self-Delete Prevention */}
              {deleteTarget.id === currentUser?.id ? (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Self-Deletion Prohibited</strong>
                    You cannot delete your own logged-in account. The system enforces this safeguard to ensure administrative access is never permanently lost.
                  </div>
                </div>
              ) : deleteTarget.role === "super_admin" && !isCurrentSuperAdmin ? (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Super Admin Account Protected</strong>
                    Only a Super Admin can delete another Super Admin account.
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-slate-900">{deleteTarget.name}</strong> (
                  <span className="font-mono text-slate-700">{deleteTarget.email}</span>)?
                  All associated profile records, session passes, and notifications will be removed. This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={
                  deleteTarget.id === currentUser?.id ||
                  (deleteTarget.role === "super_admin" && !isCurrentSuperAdmin) ||
                  actionBusyId === deleteTarget.id
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionBusyId === deleteTarget.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
