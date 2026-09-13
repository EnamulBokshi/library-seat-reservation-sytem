import { BorrowRequestsView } from "@/components/pages/admin/borrow-requests-view";

export const metadata = {
  title: "Borrow Requests | Admin | Smart Library",
  description: "Review and approve student and faculty book borrow requests",
};

export default function AdminBorrowRequestsPage() {
  return <BorrowRequestsView />;
}
