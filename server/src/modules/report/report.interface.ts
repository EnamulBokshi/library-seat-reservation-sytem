export interface ICreateReportPayload {
    category: string;
    subject: string;
    description: string;
    priority?: string;
    location?: string;
}

export interface IUpdateReportStatusPayload {
    status: string;
    /** Reply shown to the reporter. */
    staffNote?: string;
    priority?: string;
}

export interface IReportFilterOptions {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
    searchTerm?: string;
    sortBy?: "createdAt" | "updatedAt" | "priority" | "status";
    sortOrder?: "asc" | "desc";
}
