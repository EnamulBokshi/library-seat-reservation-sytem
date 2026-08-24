import { SchedulesView } from "@/components/pages/admin/schedules-view";
import { AuthGuard } from "@/components/shared/auth-guard";

export const metadata = {
  title: "Schedule & Time Slot Management | Admin | Smart Library",
  description: "Configure library operating schedules, daily time slots, and closures",
};

export default function AdminSchedulesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "librarian"]}>
      <SchedulesView />
    </AuthGuard>
  );
}
