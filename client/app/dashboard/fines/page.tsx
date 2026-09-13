import { FinesView } from "@/components/pages/dashboard/fines-view";

export const metadata = {
  title: "Fines | Smart Library",
  description: "Seat reservation and overdue book fines",
};

export default function DashboardFinesPage() {
  return <FinesView />;
}
