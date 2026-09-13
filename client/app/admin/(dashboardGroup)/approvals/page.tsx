import { AdminApprovalsView } from "@/components/pages/admin/approvals-view";

export const metadata = {
  title: "Account Approvals | Admin Console",
  description: "Review, approve or decline faculty account requests.",
};

export default function AdminApprovalsPage() {
  return <AdminApprovalsView />;
}
