import { NextResponse } from "next/server";

import { getGameState, insertVote, phaseDeadlineExpired } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      teamId?: string;
      submissionId?: string;
      guess?: string;
      selectedProverbId?: string | null;
    };

    if (!body.teamId || !body.submissionId) {
      return NextResponse.json({ error: "Onvolledige stem." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const gameState = await getGameState(supabase);
    if (gameState.phase !== "voting" || phaseDeadlineExpired(gameState)) {
      return NextResponse.json({ error: "De stemfase is gesloten." }, { status: 409 });
    }

    await insertVote({
      supabase,
      teamId: body.teamId,
      submissionId: body.submissionId,
      guess: body.guess ?? "",
      selectedProverbId: body.selectedProverbId ?? null
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
