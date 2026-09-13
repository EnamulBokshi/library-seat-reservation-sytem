import { ProfileView } from "@/components/pages/dashboard/profile-view";

export const metadata = {
  title: "Profile | Smart Library",
  description: "Account details and security settings",
};

export default function DashboardProfilePage() {
  return <ProfileView />;
}
