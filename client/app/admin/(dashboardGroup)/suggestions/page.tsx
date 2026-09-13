import { BookSuggestionsAdminView } from "@/components/pages/admin/book-suggestions-admin-view";

export const metadata = {
  title: "Faculty Book Suggestions | Admin | Smart Library",
  description: "Review faculty book recommendations, prioritize high-voted volumes, and fulfill additions to the collection.",
};

export default function AdminBookSuggestionsPage() {
  return <BookSuggestionsAdminView />;
}
