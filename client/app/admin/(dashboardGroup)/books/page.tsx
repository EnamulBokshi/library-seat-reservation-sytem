"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { bookService } from "@/services/book-service";
import { Book, CreateBookPayload, UpdateBookPayload } from "@/lib/types";
import {
  BookOpen,
  Plus,
  Search,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateBookPayload>({
    title: "",
    author: "",
    isbn: "",
    category: "Computer Science",
    publisher: "",
    publicationYear: new Date().getFullYear(),
    edition: "1st",
    description: "",
    coverImage: "",
    pdfUrl: "",
    totalCopies: 5,
    availableCopies: 5,
    block: "Block A",
    shelfNumber: "Shelf 01",
    rowNumber: "Row 1",
    callNumber: "",
  });

  // Delete State
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await bookService.getAll({ limit: 100, showInactive: true });
      if (res.success && res.data) {
        setBooks(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load book inventory.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBook(null);
    setFormData({
      title: "",
      author: "",
      isbn: "",
      barcode: "",
      category: "Computer Science",
      publisher: "",
      publicationYear: new Date().getFullYear(),
      edition: "1st",
      description: "",
      coverImage: "",
      pdfUrl: "",
      totalCopies: 5,
      availableCopies: 5,
      block: "Block A",
      shelfNumber: "Shelf 01",
      rowNumber: "Row 1",
      callNumber: "",
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      barcode: book.barcode || "",
      category: book.category,
      publisher: book.publisher || "",
      publicationYear: book.publicationYear || new Date().getFullYear(),
      edition: book.edition || "",
      description: book.description || "",
      coverImage: book.coverImage || "",
      pdfUrl: book.pdfUrl || "",
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      block: book.block,
      shelfNumber: book.shelfNumber,
      rowNumber: book.rowNumber || "",
      callNumber: book.callNumber || "",
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setModalError(null);
      const res = await bookService.uploadImage(file);
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, coverImage: res.data!.url }));
      }
    } catch (err: any) {
      setModalError(err?.message || "Failed to upload image to Cloudinary.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setModalError(null);
      setModalSuccess(null);

      const payload: CreateBookPayload = {
        ...formData,
        publicationYear: formData.publicationYear ? Number(formData.publicationYear) : undefined,
        totalCopies: Number(formData.totalCopies),
        availableCopies: Number(formData.availableCopies),
      };

      if (editingBook) {
        const res = await bookService.update(editingBook.id, payload);
        if (res.success) {
          setModalSuccess("Book updated successfully!");
          fetchBooks();
          setTimeout(() => setIsModalOpen(false), 1200);
        }
      } else {
        const res = await bookService.create(payload);
        if (res.success) {
          setModalSuccess("New book added to library catalog!");
          fetchBooks();
          setTimeout(() => setIsModalOpen(false), 1200);
        }
      }
    } catch (err: any) {
      setModalError(err?.message || "Failed to save book.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deletingBook) return;
    try {
      setIsDeleting(true);
      const res = await bookService.delete(deletingBook.id);
      if (res.success) {
        setDeletingBook(null);
        fetchBooks();
      }
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate book.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBooks = books.filter((b) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        (b.callNumber && b.callNumber.toLowerCase().includes(q)) ||
        b.block.toLowerCase().includes(q) ||
        b.shelfNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedCategory !== "All" && b.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const uniqueCategories = Array.from(new Set(books.map((b) => b.category)));

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Book Inventory & Spatial Catalog
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage physical titles, spatial shelf locations (Block, Shelf, Row), copies, and digital PDF downloads.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Book</span>
        </button>
      </div>

      {/* ── Search and Category Filters ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-80 flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, author, ISBN, shelf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Inventory Table ── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading catalog items...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
            <p className="font-bold">{error}</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No books found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3.5">Title & Author</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Spatial Location</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Digital PDF</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredBooks.map((book) => {
                  const inStock = book.availableCopies > 0;

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Author */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                            {book.coverImage ? (
                              <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <Link href={`/books/${book.id}`} className="font-extrabold text-slate-900 hover:text-indigo-600 line-clamp-1">
                              {book.title}
                            </Link>
                            <div className="text-[11px] text-slate-400">By {book.author}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700">
                          {book.category}
                        </span>
                      </td>

                      {/* 📍 Spatial Coordinates */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                          </span>
                        </div>
                        {book.callNumber && (
                          <div className="text-[10px] font-mono text-slate-400 pl-5">
                            {book.callNumber}
                          </div>
                        )}
                      </td>

                      {/* Stock Copies */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            inStock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span>{book.availableCopies} / {book.totalCopies} Avail</span>
                        </span>
                      </td>

                      {/* Digital PDF Link */}
                      <td className="px-5 py-4">
                        {book.pdfUrl ? (
                          <a
                            href={book.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            <span>PDF Attached</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Physical Only</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(book)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
                            title="Edit book details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingBook(book)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Deactivate / Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Book Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingBook ? "Edit Book Record" : "Add New Book to Library"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure bibliographic metadata, shelf coordinates, and PDF copies.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalSuccess && (
              <div className="my-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {modalError && (
              <div className="my-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-bold">
              {/* Title & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Introduction to Algorithms"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Author(s) *</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              {/* Category, ISBN & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Category / Discipline</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Computer Science, Mathematics"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={formData.isbn || ""}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="e.g. 978-0262046305"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Barcode / Item Tag</label>
                  <input
                    type="text"
                    value={formData.barcode || ""}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. BC-100234"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              {/* ── Spatial Coordinates Box (Block, Shelf, Row, Call Number) ── */}
              <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  <span>Physical Spatial Coordinates (Library Stacks)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-indigo-900 text-[11px] mb-1">Block *</label>
                    <select
                      value={formData.block}
                      onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                      className="w-full rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="Block A">Block A</option>
                      <option value="Block B">Block B</option>
                      <option value="Block C">Block C</option>
                      <option value="Block D">Block D</option>
                      <option value="Main Stacks">Main Stacks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-indigo-900 text-[11px] mb-1">Shelf Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.shelfNumber}
                      onChange={(e) => setFormData({ ...formData, shelfNumber: e.target.value })}
                      placeholder="e.g. Shelf 02"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-900 text-[11px] mb-1">Row / Slot</label>
                    <input
                      type="text"
                      value={formData.rowNumber || ""}
                      onChange={(e) => setFormData({ ...formData, rowNumber: e.target.value })}
                      placeholder="e.g. Row 3"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-900 text-[11px] mb-1">Call Number</label>
                    <input
                      type="text"
                      value={formData.callNumber || ""}
                      onChange={(e) => setFormData({ ...formData, callNumber: e.target.value })}
                      placeholder="e.g. QA76.76.D47"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Copies & PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalCopies}
                    onChange={(e) => setFormData({ ...formData, totalCopies: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Available Copies</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.availableCopies}
                    onChange={(e) => setFormData({ ...formData, availableCopies: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Digital PDF URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.pdfUrl || ""}
                    onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                    placeholder="https://.../book.pdf"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* ── Cloudinary Book Cover Image Upload (WebP) ── */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 text-xs font-extrabold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    <span>Book Cover Image (Cloudinary Media)</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Auto WebP Converted
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Thumbnail */}
                  <div className="h-24 w-20 rounded-xl border border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                    {formData.coverImage ? (
                      <>
                        <img
                          src={formData.coverImage}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, coverImage: "" }))}
                          className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-rose-600 transition-colors"
                          title="Remove cover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <BookOpen className="h-6 w-6 text-slate-300" />
                    )}
                  </div>

                  {/* Upload Drop Area */}
                  <div className="flex-1 w-full space-y-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-3 cursor-pointer bg-white transition-colors text-center">
                      {isUploadingImage ? (
                        <div className="flex items-center gap-2 py-1 text-indigo-600 font-bold text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Uploading & Converting to WebP...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs py-1">
                          <UploadCloud className="h-4 w-4 text-indigo-600" />
                          <span>Click or drag image to upload to Cloudinary</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      value={formData.coverImage || ""}
                      onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                      placeholder="Or paste external image URL..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 mb-1">Description / Abstract</label>
                <textarea
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of chapters, algorithms, and key topics covered..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingBook ? "Save Changes" : "Create Book"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <Trash2 className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-slate-900">Deactivate Book?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Are you sure you want to remove &quot;{deletingBook.title}&quot; from the active catalog?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingBook(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                {isDeleting ? "Deactivating..." : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
