import { redirect } from "next/navigation";

/** Reservations now live inside the student dashboard. */
export default function BookingsPage() {
  redirect("/dashboard/bookings");
}
