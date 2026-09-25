import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSnapshot, setMiniGameWinner } from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      gameNumber?: number;
      teamId?: string | null;
    };
    if (body.gameNumber !== 1 && body.gameNumber !== 2) {
      return NextResponse.json({ error: "Onbekend tussenspel." }, { status: 400 });
    }

    const supabase = createServiceClient();
    await setMiniGameWinner(supabase, body.gameNumber, body.teamId ?? null);
    return NextResponse.json(await getAdminSnapshot(supabase));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
