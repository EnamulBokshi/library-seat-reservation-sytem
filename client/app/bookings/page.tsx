import { MyBookingsView } from "@/components/pages/bookings/my-bookings-view";
import { AuthGuard } from "@/components/shared/auth-guard";

export const metadata = {
  title: "My Bookings | Smart Library",
  description: "View and manage your seat reservations",
};

export default function BookingsPage() {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <MyBookingsView />
    </AuthGuard>
  );
}
