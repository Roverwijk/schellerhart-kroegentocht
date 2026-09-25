import { NextResponse } from "next/server";

import { getGameState, recordTeamArrival } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const teamId = new URL(request.url).searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "Team ontbreekt." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const gameState = await getGameState(supabase);
    if (!gameState.journey_stage) {
      return NextResponse.json({ arrived: false });
    }

    const { data, error } = await supabase
      .from("team_arrivals")
      .select("id")
      .eq("journey_stage", gameState.journey_stage)
      .eq("team_id", teamId)
      .maybeSingle();
    if (error) {
      throw new Error("Aankomststatus laden mislukte.");
    }

    return NextResponse.json({ arrived: Boolean(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { teamId?: string };
    if (!body.teamId) {
      return NextResponse.json({ error: "Team ontbreekt." }, { status: 400 });
    }

    await recordTeamArrival(createServiceClient(), body.teamId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
