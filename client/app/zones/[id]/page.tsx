import { redirect } from "next/navigation";

interface ZonePageProps {
  params: Promise<{ id: string }>;
}

export default async function ZonePage({ params }: ZonePageProps) {
  const { id } = await params;
  redirect(`/book?zoneId=${id}`);
}
