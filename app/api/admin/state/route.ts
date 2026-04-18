import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSnapshot, resetGameRound } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

function isoAfterMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const snapshot = await getAdminSnapshot(createServiceClient());
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "set-phase" | "reset";
      phase: "waiting" | "upload" | "voting" | "results";
      currentRoundId?: string | null;
      uploadMinutes?: number;
      votingMinutes?: number;
    };

    const uploadMinutes = Math.max(1, Number(body.uploadMinutes ?? 20));
    const votingMinutes = Math.max(1, Number(body.votingMinutes ?? 20));
    const supabase = createServiceClient();

    if (body.action !== "reset" && body.phase === "upload" && !body.currentRoundId) {
      return NextResponse.json(
        { error: "Kies eerst een ronde voordat je de uploadfase opent." },
        { status: 400 }
      );
    }

    if (body.action === "reset") {
      await resetGameRound(supabase, {
        uploadMinutes,
        votingMinutes
      });

      const snapshot = await getAdminSnapshot(supabase);
      return NextResponse.json(snapshot);
    }

    const payload = {
      phase: body.phase,
      current_round_id: body.currentRoundId ?? null,
      upload_ends_at: isoAfterMinutes(uploadMinutes),
      voting_ends_at: isoAfterMinutes(votingMinutes)
    };

    const { error } = await supabase
      .from("game_state")
      .update(payload)
      .eq("id", "singleton");

    if (error) {
      throw new Error("Game state bijwerken mislukte.");
    }

    const snapshot = await getAdminSnapshot(supabase);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
