import { CheckInView } from "@/components/pages/admin/checkin-view";

export const metadata = {
  title: "Check-In Scanner | Admin | Smart Library",
  description: "Live QR code scanning and manual pass validation",
};

export default function AdminCheckInPage() {
  return <CheckInView />;
}
