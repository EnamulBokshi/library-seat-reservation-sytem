import { SchedulesView } from "@/components/pages/admin/schedules-view";

export const metadata = {
  title: "Schedules & Time Slots | Admin | Smart Library",
  description: "Configure library operating schedules, daily time slots, and closures",
};

export default function AdminSchedulesPage() {
  return <SchedulesView />;
}
