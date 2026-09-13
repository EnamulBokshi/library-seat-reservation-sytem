import { MyLoansView } from "@/components/pages/dashboard/my-loans-view";

export const metadata = {
  title: "My Loans | Smart Library",
  description: "Borrowed books, due dates and renewals",
};

export default function DashboardLoansPage() {
  return <MyLoansView />;
}
