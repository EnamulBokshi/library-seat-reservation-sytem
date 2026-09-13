import { redirect } from "next/navigation";

/** Loans now live inside the student dashboard. */
export default function LoansPage() {
  redirect("/dashboard/loans");
}
