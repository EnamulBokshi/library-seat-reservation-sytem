import { MyBookingsView } from "@/components/pages/bookings/my-bookings-view";

export const metadata = {
  title: "My Bookings | Smart Library",
  description: "View and manage your seat reservations",
};

export default function BookingsPage() {
  return <MyBookingsView />;
}
