import { AdminBookingsView } from "@/components/pages/admin/bookings-view";

export const metadata = {
  title: "All Bookings | Admin | Smart Library",
  description: "Admin view of all seat reservations",
};

export default function AdminBookingsPage() {
  return <AdminBookingsView />;
}
