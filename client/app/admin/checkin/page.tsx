import { CheckInView } from "@/components/pages/admin/checkin-view";
import { AuthGuard } from "@/components/shared/auth-guard";

export const metadata = {
  title: "Check-In | Admin | Smart Library",
  description: "QR code check-in and check-out scanning",
};

export default function CheckInPage() {
  return (
    <AuthGuard allowedRoles={["admin", "librarian"]}>
      <CheckInView />
    </AuthGuard>
  );
}
