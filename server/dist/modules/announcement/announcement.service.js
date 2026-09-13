"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
const AUTHOR_SELECT = {
    createdBy: { select: { id: true, name: true, role: true } },
};
const SORT_FIELDS = ["publishedAt", "createdAt", "title", "priority"];
/** Audience buckets a role belongs to: its own bucket plus the catch-all. */
const audiencesForRole = (role) => {
    const buckets = [enums_1.AnnouncementAudience.all];
    if (role === enums_1.Role.student) {
        buckets.push(enums_1.AnnouncementAudience.students);
    }
    else if (role === enums_1.Role.faculty) {
        buckets.push(enums_1.AnnouncementAudience.faculty);
    }
    else {
        buckets.push(enums_1.AnnouncementAudience.staff);
    }
    return buckets;
};
/** A notice is visible when it is active, already published and not expired. */
const liveNoticeFilter = (now) => ({
    isActive: true,
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});
const parseDate = (value) => {
    if (value === undefined)
        return undefined;
    if (value === null)
        return null;
    return new Date(value);
};
/**
 * Staff publish a notice. It goes live immediately unless a later
 * `publishedAt` is supplied.
 */
const createAnnouncement = async (createdById, payload) => {
    const expiresAt = parseDate(payload.expiresAt);
    const publishedAt = parseDate(payload.publishedAt) ?? new Date();
    if (expiresAt && publishedAt && expiresAt <= publishedAt) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "The expiry date must fall after the publish date");
    }
    return prisma_1.default.announcement.create({
        data: {
            title: payload.title,
            content: payload.content,
            audience: payload.audience ?? enums_1.AnnouncementAudience.all,
            priority: payload.priority ?? enums_1.AnnouncementPriority.info,
            isPinned: payload.isPinned ?? false,
            publishedAt,
            expiresAt: expiresAt ?? null,
            createdById,
        },
        include: AUTHOR_SELECT,
    });
};
/**
 * The reader's feed: live notices aimed at this role, pinned ones first.
 */
const getMyAnnouncements = async (role, options = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));
    const now = new Date();
    const where = {
        ...liveNoticeFilter(now),
        audience: { in: audiencesForRole(role) },
    };
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        // The live filter already uses OR for expiry, so nest the text search.
        where.AND = [
            {
                OR: [
                    { title: { contains: term, mode: "insensitive" } },
                    { content: { contains: term, mode: "insensitive" } },
                ],
            },
        ];
    }
    const [announcements, total, unreadUrgent] = await Promise.all([
        prisma_1.default.announcement.findMany({
            where,
            include: AUTHOR_SELECT,
            orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.announcement.count({ where }),
        prisma_1.default.announcement.count({
            where: { ...where, priority: enums_1.AnnouncementPriority.urgent },
        }),
    ]);
    return {
        announcements,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            counts: { urgent: unreadUrgent },
        },
    };
};
/**
 * Staff listing: every notice, including retired, scheduled and expired ones,
 * filtered and paged.
 */
const getAllAnnouncements = async (options) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const sortBy = SORT_FIELDS.includes(options.sortBy)
        ? options.sortBy
        : "publishedAt";
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
    const where = {};
    if (options.audience)
        where.audience = options.audience;
    if (options.priority)
        where.priority = options.priority;
    if (options.isActive !== undefined)
        where.isActive = options.isActive;
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { title: { contains: term, mode: "insensitive" } },
            { content: { contains: term, mode: "insensitive" } },
        ];
    }
    const now = new Date();
    const [announcements, total, liveCount] = await Promise.all([
        prisma_1.default.announcement.findMany({
            where,
            include: AUTHOR_SELECT,
            orderBy: [{ isPinned: "desc" }, { [sortBy]: sortOrder }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.announcement.count({ where }),
        prisma_1.default.announcement.count({ where: liveNoticeFilter(now) }),
    ]);
    return {
        announcements,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            counts: { live: liveCount },
        },
    };
};
const getAnnouncementById = async (id) => {
    const announcement = await prisma_1.default.announcement.findUnique({
        where: { id },
        include: AUTHOR_SELECT,
    });
    if (!announcement) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Notice not found");
    }
    return announcement;
};
const updateAnnouncement = async (id, payload) => {
    const existing = await getAnnouncementById(id);
    const publishedAt = parseDate(payload.publishedAt) ?? existing.publishedAt;
    const expiresAt = payload.expiresAt === undefined ? existing.expiresAt : parseDate(payload.expiresAt);
    if (expiresAt && expiresAt <= publishedAt) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "The expiry date must fall after the publish date");
    }
    return prisma_1.default.announcement.update({
        where: { id },
        data: {
            title: payload.title ?? undefined,
            content: payload.content ?? undefined,
            audience: payload.audience ?? undefined,
            priority: payload.priority ?? undefined,
            isPinned: payload.isPinned ?? undefined,
            isActive: payload.isActive ?? undefined,
            publishedAt,
            expiresAt,
        },
        include: AUTHOR_SELECT,
    });
};
/**
 * Retire a notice. Readers lose it, staff keep the record — a notice that was
 * shown to the library is history, not something to erase.
 */
const retireAnnouncement = async (id) => {
    await getAnnouncementById(id);
    return prisma_1.default.announcement.update({
        where: { id },
        data: { isActive: false, isPinned: false },
        include: AUTHOR_SELECT,
    });
};
exports.AnnouncementService = {
    createAnnouncement,
    getMyAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    retireAnnouncement,
};
