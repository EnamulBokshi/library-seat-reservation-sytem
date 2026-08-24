import { SettingsView } from "@/components/pages/admin/settings-view";

export const metadata = {
  title: "System Settings | Admin | Smart Library",
  description: "Configure library system parameters and operating hours",
};

export default function AdminSettingsPage() {
  return <SettingsView />;
}
