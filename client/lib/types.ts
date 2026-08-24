// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = "student" | "librarian" | "admin" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string | null;
  role: Role;
  createdAt?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  studentId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * The login response can return either a `user` or `admin` field
 * depending on the account type, plus an optional in-body accessToken.
 */
export interface LoginResponseData {
  user?: User;
  admin?: User;
  accessToken?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

// ─── API Utilities ────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string | null;
  data: T | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
}

// ─── Zone ─────────────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  rules: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  seatCount?: number;
}

export interface CreateZonePayload {
  name: string;
  description?: string;
  color?: string;
  rules?: string[];
  isActive?: boolean;
}

export interface UpdateZonePayload {
  name?: string;
  description?: string;
  color?: string;
  rules?: string[];
  isActive?: boolean;
}

// ─── Seat ─────────────────────────────────────────────────────────────────────

export interface Seat {
  id: string;
  seatNumber: string;
  zoneId: string;
  isActive: boolean;
  isOccupied: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeatPayload {
  seatNumber: string;
}

export interface UpdateSeatPayload {
  seatNumber?: string;
  isActive?: boolean;
  isOccupied?: boolean;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export type SlotType = "morning" | "afternoon" | "evening";

export interface Schedule {
  id: string;
  date: string;
  slot: SlotType;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface BookingSeat {
  id: string;
  seatNumber: string;
  zone: {
    id: string;
    name: string;
  };
}

export interface Booking {
  id: string;
  userId: string;
  seatId: string;
  scheduleId: string;
  status: BookingStatus;
  qrToken: string;
  bookedAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  seat?: BookingSeat;
  schedule?: Schedule;
  user?: Pick<User, "id" | "name" | "email" | "studentId">;
  qrCodeImage?: string;
}

export interface CreateBookingPayload {
  seatId: string;
  scheduleId: string;
}

export interface CreateBookingResponseData {
  booking: Booking;
  qrCodeImage: string;
}

export interface BookingQueryParams {
  status?: BookingStatus;
  userId?: string;
  date?: string;
  zoneId?: string;
}

// ─── Check-In ─────────────────────────────────────────────────────────────────

export type CheckInAction = "check_in" | "check_out";

export interface CheckInPayload {
  qrToken: string;
}

export interface CheckInBooking {
  id: string;
  status: BookingStatus;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  seat?: {
    seatNumber: string;
    zone: {
      name: string;
    };
  };
}

export interface CheckInResponseData {
  action: CheckInAction;
  booking: CheckInBooking;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface LiveZoneStat {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  occupancyPercent: number;
  statusLabel: string;
  statusBadgeClass: string;
}

export interface StudentDashboardStats {
  myActivePasses: number;
  myCompletedSessions: number;
  myTotalBookings: number;
}

export interface DashboardStats {
  expectedToday: number;
  checkedIn: number;
  noShows: number;
  availableSeats: number;
  totalActiveSeats: number;
  liveZones: LiveZoneStat[];
  studentStats?: StudentDashboardStats | null;
}

