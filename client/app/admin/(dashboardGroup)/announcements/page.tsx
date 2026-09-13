import { AdminAnnouncementsView } from "@/components/pages/admin/announcements-view";

export const metadata = {
  title: "Notices | Admin Console",
  description: "Publish, schedule and retire library notices.",
};

export default function AdminAnnouncementsPage() {
  return <AdminAnnouncementsView />;
}
