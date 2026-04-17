import { NextResponse } from "next/server";

import { getGameState, getTeams } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const [gameState, teams] = await Promise.all([
      getGameState(supabase),
      getTeams(supabase)
    ]);

    return NextResponse.json({ gameState, teams });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
