import { OverviewView } from "@/components/pages/dashboard/overview-view";

export const metadata = {
  title: "Dashboard | Smart Library",
  description: "Your reservations, loans and dues at a glance",
};

export default function DashboardPage() {
  return <OverviewView />;
}
