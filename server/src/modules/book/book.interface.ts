export interface IBookFilterOptions {
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

export interface ICreateBookPayload {
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

export interface IUpdateBookPayload {
  title?: string;
  author?: string;
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
  block?: string;
  shelfNumber?: string;
  rowNumber?: string;
  callNumber?: string;
  isActive?: boolean;
}
