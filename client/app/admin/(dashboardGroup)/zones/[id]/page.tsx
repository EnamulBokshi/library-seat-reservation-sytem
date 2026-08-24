import { ZoneDetailAdminView } from "@/components/pages/admin/zone-detail-admin-view";

interface AdminZoneDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Zone Details & Seat Management | Admin | Smart Library",
  description: "Manage seats, bulk generator, and inspect session bookings in this zone",
};

export default async function AdminZoneDetailPage({ params }: AdminZoneDetailPageProps) {
  const { id } = await params;
  return <ZoneDetailAdminView zoneId={id} />;
}
