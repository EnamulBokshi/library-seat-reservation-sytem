export interface ICreateAnnouncementPayload {
    title: string;
    content: string;
    audience?: string;
    priority?: string;
    isPinned?: boolean;
    /** ISO date; omit for a notice that stands until retired by hand. */
    expiresAt?: string | null;
    /** ISO date; omit to publish immediately. */
    publishedAt?: string;
}

export interface IUpdateAnnouncementPayload extends Partial<ICreateAnnouncementPayload> {
    isActive?: boolean;
}

export interface IAnnouncementFilterOptions {
    page?: number;
    limit?: number;
    audience?: string;
    priority?: string;
    /** Admin listing only: `true`, `false` or undefined for both. */
    isActive?: boolean;
    searchTerm?: string;
    sortBy?: "publishedAt" | "createdAt" | "title" | "priority";
    sortOrder?: "asc" | "desc";
}
