import { AdminFinesManagementView } from "@/components/pages/admin/fines-management-view";

export const metadata = {
  title: "Fines Ledger | Admin Console",
  description: "Comprehensive management, collection, and waiver of student library penalties and dues.",
};

export default function AdminFinesPage() {
  return <AdminFinesManagementView />;
}
