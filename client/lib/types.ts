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
  isBooked?: boolean;
  isMyBooking?: boolean;
  booking?: {
    id: string;
    status: BookingStatus;
    user?: {
      id: string;
      name: string;
      email?: string | null;
      studentId?: string | null;
    };
  } | null;
  zone?: Zone;
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

export type SlotType = "morning" | "noon" | "afternoon" | "evening";

export interface SlotConfigItem {
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
  label: string;     // "Morning"
  icon?: string;     // "🌅"
  enabled: boolean;
}

export type SlotConfig = Record<SlotType, SlotConfigItem>;

export const DEFAULT_SLOT_CONFIG: SlotConfig = {
  morning: {
    startTime: "08:00",
    endTime: "12:00",
    label: "Morning",
    icon: "🌅",
    enabled: true,
  },
  noon: {
    startTime: "12:00",
    endTime: "14:00",
    label: "Noon",
    icon: "☀️",
    enabled: true,
  },
  afternoon: {
    startTime: "14:00",
    endTime: "18:00",
    label: "Afternoon",
    icon: "🌇",
    enabled: true,
  },
  evening: {
    startTime: "18:00",
    endTime: "21:00",
    label: "Evening",
    icon: "🌙",
    enabled: true,
  },
};

export interface Schedule {
  id: string;
  date: string;
  slot: SlotType;
  isOpen?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    bookings: number;
  };
}

export interface BulkToggleSchedulePayload {
  startDate?: string;
  endDate?: string;
  dates?: string[];
  slots?: SlotType[];
  isOpen: boolean;
}

export interface BulkToggleScheduleResponse {
  success: boolean;
  message: string;
  updatedSlotsCount: number;
  updatedDaysCount: number;
  isOpen: boolean;
}

export interface PublicSystemConfig {
  slotConfig: SlotConfig;
  advanceBookingDays: number;
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
  status?: BookingStatus | "";
  userId?: string;
  date?: string;
  slot?: SlotType | "";
  zoneId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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

// ─── Books & Borrowing Types ──────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  category: string;
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  description?: string | null;
  coverImage?: string | null;
  pdfUrl?: string | null;
  totalCopies: number;
  availableCopies: number;
  block: string;
  shelfNumber: string;
  rowNumber?: string | null;
  callNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  loans?: BookLoan[];
}

export type LoanStatus = "requested" | "issued" | "returned" | "overdue" | "cancelled" | "rejected";

export interface BookLoan {
  id: string;
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string | null;
  renewCount: number;
  status: LoanStatus;
  notes?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
  book?: Book;
  user?: {
    id: string;
    name: string;
    email: string;
    studentId?: string | null;
  };
}

export interface StudentLoanSummary {
  quota: {
    maxBorrowLimit: number;
    maxRenewalLimit: number;
    currentlyBorrowed: number;
    pendingRequests: number;
    availableQuota: number;
  };
  activeLoans: BookLoan[];
  pendingRequests: BookLoan[];
  returnedHistory: BookLoan[];
  allLoans: BookLoan[];
}

export interface CirculationStats {
  totalBooks: number;
  activeLoans: number;
  pendingRequests: number;
  overdueLoans: number;
  totalReturned: number;
}

export interface BookQueryParams {
  searchTerm?: string;
  category?: string;
  block?: string;
  shelfNumber?: string;
  hasPdf?: boolean;
  inStockOnly?: boolean;
  showInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateBookPayload {
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  description?: string;
  coverImage?: string;
  pdfUrl?: string;
  totalCopies?: number;
  availableCopies?: number;
  block: string;
  shelfNumber: string;
  rowNumber?: string;
  callNumber?: string;
}

export interface UpdateBookPayload extends Partial<CreateBookPayload> {
  isActive?: boolean;
}

export interface LoanQueryParams {
  status?: LoanStatus | "active" | "all";
  userId?: string;
  bookId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}


