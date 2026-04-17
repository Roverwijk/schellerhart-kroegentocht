import { NextResponse } from "next/server";

import {
  getAssignmentsForRound,
  getGameState,
  getRounds,
  getTeams
} from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const [gameState, teams, rounds] = await Promise.all([
      getGameState(supabase),
      getTeams(supabase),
      getRounds(supabase)
    ]);
    const currentRound = gameState.current_round_id
      ? rounds.find((round) => round.id === gameState.current_round_id) ?? null
      : null;
    const assignments = currentRound
      ? await getAssignmentsForRound(supabase, currentRound.id)
      : [];

    return NextResponse.json({ gameState, teams, rounds, currentRound, assignments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
