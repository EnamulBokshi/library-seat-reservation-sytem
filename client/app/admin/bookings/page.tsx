import { AdminBookingsView } from "@/components/pages/admin/bookings-view";
import { AuthGuard } from "@/components/shared/auth-guard";

export const metadata = {
  title: "All Bookings | Admin | Smart Library",
  description: "Admin view of all seat reservations",
};

export default function AdminBookingsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "librarian"]}>
      <AdminBookingsView />
    </AuthGuard>
  );
}
