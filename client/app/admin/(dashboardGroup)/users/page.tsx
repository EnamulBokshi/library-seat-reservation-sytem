import { AdminUsersManagementView } from "@/components/pages/admin/users-management-view";

export const metadata = {
  title: "User Directory & Access Control | Admin Console",
  description:
    "Comprehensive management of student, faculty, and administrative library user accounts and privileges.",
};

export default function AdminUsersPage() {
  return <AdminUsersManagementView />;
}
