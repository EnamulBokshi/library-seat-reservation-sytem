import { SettingsView } from "@/components/pages/admin/settings-view";
import { AuthGuard } from "@/components/shared/auth-guard";

export const metadata = {
  title: "System Settings | Admin | Smart Library",
  description: "Configure library system settings",
};

export default function SettingsPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <SettingsView />
    </AuthGuard>
  );
}
