// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = "student" | "faculty" | "librarian" | "admin" | "super_admin";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string | null;
  facultyId?: string | null;
  department?: string | null;
  designation?: string | null;
  role: Role;
  isActive?: boolean;
  approvalStatus?: ApprovalStatus;
  emailVerifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
}

/** Self-registration only ever creates one of these two roles. */
export type SelfRegisterRole = "student" | "faculty";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  studentId?: string;
  role?: SelfRegisterRole;
  facultyId?: string;
  department?: string;
  designation?: string;
}

export interface RegisterResult {
  user: User;
  requiresEmailVerification: boolean;
  requiresAdminApproval: boolean;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface VerifyEmailResult {
  user: User;
  requiresAdminApproval: boolean;
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
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<VerifyEmailResult>;
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
    /** Optional facet tallies a list endpoint may attach, e.g. rows per status. */
    counts?: Record<string, number>;
  } | null;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export type AnnouncementAudience = "all" | "students" | "faculty" | "staff";
export type AnnouncementPriority = "info" | "important" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  isPinned: boolean;
  isActive: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; role: Role };
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  audience?: AnnouncementAudience;
  priority?: AnnouncementPriority;
  isPinned?: boolean;
  publishedAt?: string;
  expiresAt?: string | null;
}

export type UpdateAnnouncementPayload = Partial<CreateAnnouncementPayload> & {
  isActive?: boolean;
};

export interface AnnouncementQueryParams {
  page?: number;
  limit?: number;
  audience?: AnnouncementAudience;
  priority?: AnnouncementPriority;
  isActive?: boolean;
  searchTerm?: string;
  sortBy?: "publishedAt" | "createdAt" | "title" | "priority";
  sortOrder?: "asc" | "desc";
}

// ─── Member Reports ──────────────────────────────────────────────────────────

export type ReportCategory = "bug" | "service" | "facilities" | "environment" | "book" | "other";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type ReportPriority = "low" | "normal" | "high";

export interface Report {
  id: string;
  reporterId: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  subject: string;
  description: string;
  location?: string | null;
  staffNote?: string | null;
  handledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    studentId?: string | null;
    facultyId?: string | null;
  };
  handledBy?: { id: string; name: string; role: Role } | null;
}

export interface CreateReportPayload {
  category: ReportCategory;
  subject: string;
  description: string;
  priority?: ReportPriority;
  location?: string;
}

export interface UpdateReportStatusPayload {
  status: ReportStatus;
  staffNote?: string;
  priority?: ReportPriority;
}

export interface ReportQueryParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  category?: ReportCategory;
  priority?: ReportPriority;
  searchTerm?: string;
  sortBy?: "createdAt" | "updatedAt" | "priority" | "status";
  sortOrder?: "asc" | "desc";
}

/** Counters shown as badges on the workspace navigation. */
export interface NavBadgeCounts {
  pendingApprovals: number;
  pendingWaivers: number;
  activeBookings: number;
  pendingBorrowRequests: number;
  unpaidFines: number;
  myPendingWaivers: number;
  myUnpaidFines: number;
  openReports: number;
  myOpenReports: number;
  liveAnnouncements: number;
  /** Live notices published since the reader last opened the notice page. */
  newAnnouncements: number;
}

export type NavBadgeKey = keyof NavBadgeCounts;

/** Sort keys the account-approval queue accepts. */
export type ApprovalSortField =
  | "createdAt"
  | "emailVerifiedAt"
  | "name"
  | "email"
  | "department";

export interface ApprovalQueryParams {
  page?: number;
  limit?: number;
  approvalStatus?: ApprovalStatus;
  role?: SelfRegisterRole;
  searchTerm?: string;
  sortBy?: ApprovalSortField;
  sortOrder?: "asc" | "desc";
  emailVerifiedOnly?: boolean;
}

// ─── Zone ─────────────────────────────────────────────────────────────────────

export type ZoneType =
  | "silent_desk"
  | "group_study"
  | "computer_lab"
  | "open_reading"
  | "conference_room";

export type TableType =
  | "individual_cubicle"
  | "circle_table"
  | "meeting_table"
  | "booth_pod"
  | "workstation_bench";

export interface Zone {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  zoneType?: ZoneType;
  allowMultiSeat?: boolean;
  maxSeatsPerBooking?: number;
  defaultTableType?: TableType;
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
  zoneType?: ZoneType;
  allowMultiSeat?: boolean;
  maxSeatsPerBooking?: number;
  defaultTableType?: TableType;
  rules?: string[];
  isActive?: boolean;
}

export interface UpdateZonePayload {
  name?: string;
  description?: string;
  color?: string;
  zoneType?: ZoneType;
  allowMultiSeat?: boolean;
  maxSeatsPerBooking?: number;
  defaultTableType?: TableType;
  rules?: string[];
  isActive?: boolean;
}

// ─── Seat & Table Cluster ─────────────────────────────────────────────────────

export interface Seat {
  id: string;
  seatNumber: string;
  zoneId: string;
  tableNumber?: string | null;
  tableType?: TableType;
  tableCapacity?: number | null;
  seatPosition?: number | null;
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

export interface TableCluster {
  tableNumber: string;
  tableType: TableType;
  tableCapacity?: number;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats?: number;
  maintenanceSeats?: number;
  seats: Seat[];
}

export interface CreateSeatPayload {
  seatNumber: string;
  tableNumber?: string;
  tableType?: TableType;
  tableCapacity?: number;
  seatPosition?: number;
}

export interface CreateTableClusterPayload {
  zoneId: string;
  tableNumber: string;
  tableType: TableType;
  chairCount: number;
  prefix?: string;
}

export interface BulkCreateTablesPayload {
  zoneId: string;
  tableType: TableType;
  tableCount: number;
  chairsPerTable: number;
  tablePrefix?: string;
  startTableNumber?: number;
}

export interface UpdateSeatPayload {
  seatNumber?: string;
  tableNumber?: string | null;
  tableType?: TableType;
  tableCapacity?: number | null;
  seatPosition?: number | null;
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

export interface BookingPolicyConfig {
  freeCancelMinutes: number;
  lateCancelFine: number;
  lateCancelLeadMinutes: number;
  noShowFine: number;
  maxUnpaidFineLimit: number;
  checkinGraceMinutes: number;
}

export interface PublicSystemConfig {
  slotConfig: SlotConfig;
  advanceBookingDays: number;
  bookingPolicy?: BookingPolicyConfig;
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
  tableNumber?: string | null;
  tableType?: TableType;
  zone: {
    id: string;
    name: string;
  };
}

export interface BookingSeatRelation {
  id: string;
  seatId: string;
  bookingId: string;
  seat: Seat;
}

export interface Booking {
  id: string;
  userId: string;
  seatId?: string | null;
  scheduleId: string;
  status: BookingStatus;
  qrToken: string;
  bookedAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  slotWarningEmailSent?: boolean;
  fineAmount: number;
  fineStatus: FineStatus;
  paymentMethod?: PaymentMethod | null;
  chalanNumber?: string | null;
  finePaidAt?: string | null;
  fineReceivedById?: string | null;
  seat?: BookingSeat;
  bookingSeats?: BookingSeatRelation[];
  schedule?: Schedule;
  user?: Pick<User, "id" | "name" | "email" | "studentId">;
  qrCodeImage?: string;
}

export interface CreateBookingPayload {
  seatId?: string;
  seatIds?: string[];
  scheduleId: string;
  guestCount?: number;
}

export interface CreateBookingResponseData {
  booking: Booking;
  qrCodeImage: string;
}

export interface UnpaidSeatBookingSummary {
  bookingId: string;
  fineAmount: number;
  reason: string | null;
  cancelledAt: string | null;
}

export interface UnpaidLoanSummary {
  loanId: string;
  bookTitle: string;
  fineAmount: number;
}

export interface BookingEligibility {
  seatFineTotal: number;
  loanFineTotal: number;
  totalUnpaid: number;
  maxUnpaidFineLimit: number;
  isBookingBlocked: boolean;
  remainingBalance: number;
  unpaidSeatBookings: UnpaidSeatBookingSummary[];
  unpaidLoans: UnpaidLoanSummary[];
  policy: BookingPolicyConfig;
}

export interface PaySeatFinePayload {
  paymentMethod: PaymentMethod;
  chalanNumber?: string;
  notes?: string;
}

export interface WaiveSeatFinePayload {
  reason?: string;
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

export type FineStatus = "none" | "unpaid" | "paid" | "waived";
export type PaymentMethod = "cash" | "chalan" | "online";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  barcode?: string | null;
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
  fineAmount: number;
  fineStatus: FineStatus;
  paymentMethod?: PaymentMethod | null;
  chalanNumber?: string | null;
  finePaidAt?: string | null;
  fineReceivedById?: string | null;
  warningEmailSent?: boolean;
  overdueEmailSent?: boolean;
  createdAt: string;
  updatedAt: string;
  book?: Book;
  user?: {
    id: string;
    name: string;
    email: string;
    studentId?: string | null;
    facultyId?: string | null;
    role?: Role;
    department?: string | null;
  };
}

export interface StudentLoanSummary {
  quota: {
    maxBorrowLimit: number;
    maxRenewalLimit: number;
    currentlyBorrowed: number;
    pendingRequests: number;
    availableQuota: number;
    isFaculty?: boolean;
    isUnlimited?: boolean;
  };
  fines: {
    totalDueBDT: number;
    totalPaidBDT: number;
    hasUnpaidDues: boolean;
    unpaidFines: BookLoan[];
    paidFines: BookLoan[];
  };
  activeLoans: BookLoan[];
  pendingRequests: BookLoan[];
  returnedHistory: BookLoan[];
  allLoans: BookLoan[];
}

export interface StudentLookupResult {
  student: {
    id: string;
    name: string;
    email: string;
    studentId?: string | null;
    role: string;
  };
  activeLoans: BookLoan[];
  pendingRequests: BookLoan[];
  unpaidFines: BookLoan[];
  stats: {
    maxBorrowLimit: number;
    currentlyBorrowed: number;
    availableQuota: number;
    totalUnpaidFineBDT: number;
    isEligible: boolean;
    ineligibilityReason: string | null;
  };
}

export interface CirculationStats {
  totalLoans: number;
  activeLoans: number;
  pendingRequests: number;
  overdueLoans: number;
  totalReturned: number;
  totalFinesCollected: number;
  totalOutstandingFines: number;
  unpaidFinesCount: number;
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
  barcode?: string;
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
  fineStatus?: FineStatus;
  userId?: string;
  bookId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}



// ─── Student Profile & Fines (dashboard) ──────────────────────────────────────

export interface UserProfile extends User {
  isActive?: boolean;
}

/** One fine row, from either the seat-booking ledger or the book-loan ledger. */
export interface FineEntry {
  id: string;
  source: "booking" | "loan";
  amount: number;
  status: FineStatus;
  reason: string | null;
  /** Seat fines: seat + zone + slot. Loan fines: book title and author. */
  subject: string;
  incurredAt: string | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  chalanNumber: string | null;
}

export interface MyFinesSummary {
  seatUnpaidTotal: number;
  loanUnpaidTotal: number;
  totalUnpaid: number;
  maxUnpaidFineLimit: number;
  isBookingBlocked: boolean;
  remainingBalance: number;
}

export interface MyFinesResult {
  seatFines: FineEntry[];
  loanFines: FineEntry[];
  summary: MyFinesSummary;
}

export interface UpdateProfilePayload {
  name: string;
}

export interface RequestEmailChangePayload {
  newEmail: string;
  currentPassword: string;
}

export interface RequestPasswordChangePayload {
  currentPassword: string;
}

export interface VerifyPasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  code: string;
}

/** Where the code went and how long it stays valid. */
export interface OtpChallenge {
  expiresAt: string;
  expiresInMinutes: number;
  sentTo: string;
}

// ─── Admin Fines Management ──────────────────────────────────────────────────
export type FineSource = "all" | "seat" | "loan";

export interface AdminFineRecord {
  id: string;
  source: "seat" | "loan";
  amount: number;
  status: FineStatus;
  reason: string | null;
  subject: string;
  incurredAt: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  chalanNumber: string | null;
  receivedBy: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string | null;
  };
  details: {
    bookingId?: string;
    loanId?: string;
    seatNumber?: string;
    zoneName?: string;
    scheduleDate?: string;
    slot?: string;
    bookingStatus?: string;
    bookTitle?: string;
    bookAuthor?: string;
    barcode?: string | null;
    isbn?: string | null;
    dueDate?: string;
    returnDate?: string | null;
  };
}

export interface FineStats {
  totalOutstanding: number;
  outstandingCount: number;
  totalCollected: number;
  collectedCount: number;
  totalWaived: number;
  waivedCount: number;
  seatUnpaid: number;
  seatUnpaidCount: number;
  loanUnpaid: number;
  loanUnpaidCount: number;
  cashCollected: number;
  chalanCollected: number;
  onlineCollected: number;
  impactedStudentsCount: number;
  blockedStudentsCount: number;
  maxUnpaidFineLimit: number;
}

export interface FineQueryParams {
  source?: FineSource;
  status?: FineStatus | "all";
  paymentMethod?: PaymentMethod | "all";
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "incurredAt" | "amount" | "paidAt" | "status" | "studentName";
  sortOrder?: "asc" | "desc";
}

export interface PayFinePayload {
  paymentMethod: PaymentMethod;
  chalanNumber?: string;
  notes?: string;
}

export interface WaiveFinePayload {
  reason?: string;
}

// ─── Fine Waiver Requests ────────────────────────────────────────────────────

export type WaiverRequestStatus = "pending" | "approved" | "rejected";

export interface WaiverPartyRef {
  id: string;
  name: string;
  email: string;
  studentId?: string | null;
  department?: string | null;
}

export interface FineWaiverRequest {
  id: string;
  requestedById: string;
  targetUserId: string;
  bookingId?: string | null;
  loanId?: string | null;
  amount: number;
  reason: string;
  status: WaiverRequestStatus;
  decidedById?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  requestedBy: WaiverPartyRef;
  targetUser: WaiverPartyRef;
}

export interface CreateWaiverRequestPayload {
  targetUserId: string;
  bookingId?: string;
  loanId?: string;
  reason: string;
}

export interface DecideWaiverRequestPayload {
  status: "approved" | "rejected";
  decisionNote?: string;
}

/** One outstanding fine a faculty member may petition to clear. */
export interface PetitionableFine {
  id: string;
  source: "booking" | "loan";
  amount: number;
  subject: string;
  reason: string | null;
  incurredAt: string | null;
  hasPendingRequest: boolean;
}

export interface StudentFineLookup {
  student: WaiverPartyRef & { role: Role };
  fines: PetitionableFine[];
  totalUnpaid: number;
}

// ─── Admin User Management ───────────────────────────────────────────────────

export type UserSortField = "createdAt" | "name" | "email" | "role" | "isActive";

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdmins: number;
  admins: number;
  librarians: number;
  faculty: number;
  students: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  approvalStatus?: string;
  searchTerm?: string;
  sortBy?: UserSortField;
  sortOrder?: "asc" | "desc";
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  studentId?: string | null;
  facultyId?: string | null;
  department?: string | null;
  designation?: string | null;
  isActive?: boolean;
}

export interface AdminUpdateUserPayload {
  name?: string;
  role?: Role;
  isActive?: boolean;
  studentId?: string | null;
  facultyId?: string | null;
  department?: string | null;
  designation?: string | null;
  password?: string;
}

// ─── Faculty Book Suggestions & Upvotes ───────────────────────────────────────

export type SuggestionStatus = "pending" | "approved" | "fulfilled" | "rejected";

export interface BookSuggestion {
  id: string;
  userId: string;
  title: string;
  author: string;
  publisher?: string | null;
  edition?: string | null;
  isbn?: string | null;
  department?: string | null;
  courseCode?: string | null;
  reason?: string | null;
  status: SuggestionStatus;
  adminNotes?: string | null;
  bookId?: string | null;
  fulfilledAt?: string | null;
  fulfilledById?: string | null;
  upvoteCount: number;
  hasUpvoted?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    designation?: string | null;
    facultyId?: string | null;
  };
  book?: {
    id: string;
    title: string;
    block: string;
    shelfNumber: string;
    callNumber?: string | null;
    availableCopies: number;
    totalCopies: number;
  } | null;
}

export interface CreateBookSuggestionPayload {
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  isbn?: string;
  department?: string;
  courseCode?: string;
  reason?: string;
}

export interface FulfillSuggestionPayload {
  bookId?: string;
  createCatalogBook?: boolean;
  category?: string;
  block?: string;
  shelfNumber?: string;
  rowNumber?: string;
  callNumber?: string;
  totalCopies?: number;
  barcode?: string;
  description?: string;
  adminNotes?: string;
}

export interface SuggestionQueryParams {
  searchTerm?: string;
  status?: SuggestionStatus | "all";
  department?: string;
  onlyMySuggestions?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "upvoteCount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

