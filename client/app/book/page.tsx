import { Suspense } from "react";
import { BookSeatView } from "@/components/pages/booking/book-seat-view";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Book a Seat | Smart Library",
  description: "Reserve a library study seat by selecting your preferred study zone, session time, and seat.",
};

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      }
    >
      <BookSeatView />
    </Suspense>
  );
}
