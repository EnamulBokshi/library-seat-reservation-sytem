import { AdminWaiversView } from "@/components/pages/admin/waivers-view";

export const metadata = {
  title: "Waiver Requests | Admin Console",
  description: "Decide faculty petitions to clear student library fines.",
};

export default function AdminWaiversPage() {
  return <AdminWaiversView />;
}
