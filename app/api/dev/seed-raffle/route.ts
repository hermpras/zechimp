import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Dev seed route is disabled in production." },
      { status: 403 },
    );
  }

  const adminClient = createSupabaseAdminClient();

  // Check if active open/closed raffle exists
  const { data: existingRaffle } = await adminClient
    .from("raffles")
    .select("*")
    .in("status", ["OPEN", "CLOSED"])
    .limit(1)
    .maybeSingle();

  if (existingRaffle) {
    return NextResponse.json({
      message: "An active/open raffle already exists.",
      raffle: existingRaffle,
    });
  }

  // Create new OPEN test raffle
  const { data: newRaffle, error } = await adminClient
    .from("raffles")
    .insert({
      title: "ZECHIMP Genesis Whitelist Raffle",
      description:
        "Commit your tickets for a chance to win a spot on the ZECHIMP Genesis Whitelist. 5 WL spots available!",
      access_code: "GENESIS-2026",
      wl_spots: 5,
      status: "OPEN",
    })
    .select()
    .single();

  if (error || !newRaffle) {
    return NextResponse.json(
      { error: "Failed to create test raffle", details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Test raffle created successfully",
    raffle: newRaffle,
  });
}
