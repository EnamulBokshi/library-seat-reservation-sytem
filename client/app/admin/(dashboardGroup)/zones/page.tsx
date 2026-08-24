import { ZonesManagementView } from "@/components/pages/admin/zones-management-view";

export const metadata = {
  title: "Zones & Seating Inventory | Admin | Smart Library",
  description: "Manage library study zones, seating capacity, and occupancy limits",
};

export default function AdminZonesPage() {
  return <ZonesManagementView />;
}
