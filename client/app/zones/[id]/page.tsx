import { ZoneDetailView } from "@/components/pages/zones/zone-detail-view";

interface ZonePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Zone Details | Smart Library",
  description: "View zone details and available seats",
};

export default async function ZonePage({ params }: ZonePageProps) {
  const { id } = await params;
  return <ZoneDetailView zoneId={id} />;
}
