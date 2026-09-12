import { Suspense } from "react";
import { BookSeatView } from "@/components/pages/booking/book-seat-view";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Book a Seat | Smart Library",
  description: "Reserve a library study seat by selecting your preferred study zone, session time, and seat.",
};

export default function BookPage() {
  return (
    <AuthGuard allowedRoles={["student", "admin", "librarian", "super_admin"]}>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        }
      >
        <BookSeatView />
      </Suspense>
    </AuthGuard>
  );
}
