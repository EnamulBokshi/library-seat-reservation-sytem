import { MyReportsView } from "@/components/pages/dashboard/my-reports-view";

export const metadata = {
  title: "My Reports | Smart Library",
  description: "What you reported to the library, and what came of it.",
};

export default function MyReportsPage() {
  return <MyReportsView />;
}
