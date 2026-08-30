import apiClient from "./api-client";
import {
  Book,
  BookQueryParams,
  CreateBookPayload,
  UpdateBookPayload,
  ApiResponse,
} from "@/lib/types";

export const bookService = {
  /**
   * Get all books with search, filters and pagination
   */
  async getAll(params?: BookQueryParams): Promise<ApiResponse<Book[]>> {
    return apiClient.get<unknown, ApiResponse<Book[]>>("/book", { params });
  },

  /**
   * Get single book by ID
   */
  async getById(id: string): Promise<ApiResponse<Book>> {
    return apiClient.get<unknown, ApiResponse<Book>>(`/book/${id}`);
  },

  /**
   * Get distinct categories
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<unknown, ApiResponse<string[]>>("/book/categories");
  },

  /**
   * Get distinct blocks and shelves
   */
  async getSpatialIndex(): Promise<ApiResponse<{ blocks: string[]; shelves: string[] }>> {
    return apiClient.get<unknown, ApiResponse<{ blocks: string[]; shelves: string[] }>>("/book/spatial-index");
  },

  /**
   * Create a new book (Admin / Librarian)
   */
  async create(payload: CreateBookPayload): Promise<ApiResponse<Book>> {
    return apiClient.post<unknown, ApiResponse<Book>>("/book", payload);
  },

  /**
   * Update book details (Admin / Librarian)
   */
  async update(id: string, payload: UpdateBookPayload): Promise<ApiResponse<Book>> {
    return apiClient.patch<unknown, ApiResponse<Book>>(`/book/${id}`, payload);
  },

  /**
   * Upload book cover image to Cloudinary (converts to WebP)
   */
  async uploadImage(file: File): Promise<ApiResponse<{ url: string; publicId: string; format: string }>> {
    const formData = new FormData();
    formData.append("image", file);
    return apiClient.post<unknown, ApiResponse<{ url: string; publicId: string; format: string }>>(
      "/book/upload-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  /**
   * Deactivate / Delete book (Admin / Librarian)
   */
  async delete(id: string): Promise<ApiResponse<Book>> {
    return apiClient.delete<unknown, ApiResponse<Book>>(`/book/${id}`);
  },
};

export default bookService;
