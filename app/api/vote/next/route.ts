import { NextRequest, NextResponse } from "next/server";

import {
  getGameState,
  getVotingQueue,
  listVoteReviewForTeam,
  phaseDeadlineExpired
} from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "Team ontbreekt." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const gameState = await getGameState(supabase);
    const queue = await getVotingQueue(supabase, teamId);
    const review =
      gameState.phase === "results" || phaseDeadlineExpired(gameState)
        ? await listVoteReviewForTeam(supabase, teamId)
        : [];

    return NextResponse.json({
      gameState,
      items: queue.items,
      current: queue.current,
      currentIndex: queue.currentIndex,
      total: queue.total,
      completed: queue.completed,
      closed: gameState.phase !== "voting" || phaseDeadlineExpired(gameState),
      review
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
