"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { BookingDetailsPageView } from "@/components/pages/bookings/booking-details-page-view";

export default function BookingDetailsPage() {
  const params = useParams();
  const bookingId = params?.id as string;

  return (
    <AuthGuard>
      <BookingDetailsPageView bookingId={bookingId} />
    </AuthGuard>
  );
}
