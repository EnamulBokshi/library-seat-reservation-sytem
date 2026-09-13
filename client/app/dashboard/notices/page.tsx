import { redirect } from "next/navigation";

/** The notice board lives on the public library site now. */
export default function DashboardNoticesPage() {
  redirect("/notice");
}
