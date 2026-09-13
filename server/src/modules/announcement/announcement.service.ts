import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { Prisma } from "../../generated/client";
import { AnnouncementAudience, AnnouncementPriority, Role } from "../../generated/enums";
import {
    IAnnouncementFilterOptions,
    ICreateAnnouncementPayload,
    IUpdateAnnouncementPayload,
} from "./announcement.interface";

const AUTHOR_SELECT = {
    createdBy: { select: { id: true, name: true, role: true } },
} as const;

const SORT_FIELDS = ["publishedAt", "createdAt", "title", "priority"] as const;

/** Audience buckets a role belongs to: its own bucket plus the catch-all. */
const audiencesForRole = (role: Role): AnnouncementAudience[] => {
    const buckets: AnnouncementAudience[] = [AnnouncementAudience.all];

    if (role === Role.student) {
        buckets.push(AnnouncementAudience.students);
    } else if (role === Role.faculty) {
        buckets.push(AnnouncementAudience.faculty);
    } else {
        buckets.push(AnnouncementAudience.staff);
    }

    return buckets;
};

/** A notice is visible when it is active, already published and not expired. */
const liveNoticeFilter = (now: Date): Prisma.AnnouncementWhereInput => ({
    isActive: true,
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

const parseDate = (value: string | null | undefined): Date | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
};

/**
 * Staff publish a notice. It goes live immediately unless a later
 * `publishedAt` is supplied.
 */
const createAnnouncement = async (createdById: string, payload: ICreateAnnouncementPayload) => {
    const expiresAt = parseDate(payload.expiresAt);
    const publishedAt = parseDate(payload.publishedAt) ?? new Date();

    if (expiresAt && publishedAt && expiresAt <= publishedAt) {
        throw new AppError(status.BAD_REQUEST, "The expiry date must fall after the publish date");
    }

    return prisma.announcement.create({
        data: {
            title: payload.title,
            content: payload.content,
            audience: (payload.audience as AnnouncementAudience) ?? AnnouncementAudience.all,
            priority: (payload.priority as AnnouncementPriority) ?? AnnouncementPriority.info,
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
const getMyAnnouncements = async (role: Role, options: IAnnouncementFilterOptions = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));
    const now = new Date();

    const where: Prisma.AnnouncementWhereInput = {
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
        prisma.announcement.findMany({
            where,
            include: AUTHOR_SELECT,
            orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.announcement.count({ where }),
        prisma.announcement.count({
            where: { ...where, priority: AnnouncementPriority.urgent },
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
const getAllAnnouncements = async (options: IAnnouncementFilterOptions) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const sortBy = SORT_FIELDS.includes(options.sortBy as (typeof SORT_FIELDS)[number])
        ? (options.sortBy as (typeof SORT_FIELDS)[number])
        : "publishedAt";
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";

    const where: Prisma.AnnouncementWhereInput = {};
    if (options.audience) where.audience = options.audience as AnnouncementAudience;
    if (options.priority) where.priority = options.priority as AnnouncementPriority;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { title: { contains: term, mode: "insensitive" } },
            { content: { contains: term, mode: "insensitive" } },
        ];
    }

    const now = new Date();
    const [announcements, total, liveCount] = await Promise.all([
        prisma.announcement.findMany({
            where,
            include: AUTHOR_SELECT,
            orderBy: [{ isPinned: "desc" }, { [sortBy]: sortOrder }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.announcement.count({ where }),
        prisma.announcement.count({ where: liveNoticeFilter(now) }),
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

const getAnnouncementById = async (id: string) => {
    const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: AUTHOR_SELECT,
    });

    if (!announcement) {
        throw new AppError(status.NOT_FOUND, "Notice not found");
    }

    return announcement;
};

const updateAnnouncement = async (id: string, payload: IUpdateAnnouncementPayload) => {
    const existing = await getAnnouncementById(id);

    const publishedAt = parseDate(payload.publishedAt) ?? existing.publishedAt;
    const expiresAt =
        payload.expiresAt === undefined ? existing.expiresAt : parseDate(payload.expiresAt);

    if (expiresAt && expiresAt <= publishedAt) {
        throw new AppError(status.BAD_REQUEST, "The expiry date must fall after the publish date");
    }

    return prisma.announcement.update({
        where: { id },
        data: {
            title: payload.title ?? undefined,
            content: payload.content ?? undefined,
            audience: (payload.audience as AnnouncementAudience) ?? undefined,
            priority: (payload.priority as AnnouncementPriority) ?? undefined,
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
const retireAnnouncement = async (id: string) => {
    await getAnnouncementById(id);

    return prisma.announcement.update({
        where: { id },
        data: { isActive: false, isPinned: false },
        include: AUTHOR_SELECT,
    });
};

export const AnnouncementService = {
    createAnnouncement,
    getMyAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    retireAnnouncement,
};
