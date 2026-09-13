import { BookSuggestionsView } from "@/components/pages/dashboard/book-suggestions-view";

export const metadata = {
  title: "Faculty Book Recommendations | Smart Library",
  description: "Propose new textbooks and literature for library procurement and upvote faculty recommendations.",
};

export default function BookSuggestionsPage() {
  return <BookSuggestionsView />;
}
