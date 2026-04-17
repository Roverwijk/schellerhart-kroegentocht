import { NextResponse } from "next/server";

import {
  getGameState,
  phaseDeadlineExpired,
  resolveCanonicalProverb,
  storeSubmissionPhoto
} from "@/lib/game-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const teamId = String(formData.get("teamId") ?? "");
    const proverbInput = String(formData.get("proverb") ?? "");
    const selectedProverbId = String(formData.get("selectedProverbId") ?? "") || null;
    const file = formData.get("photo");

    if (!teamId) {
      return NextResponse.json({ error: "Kies eerst een team." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Voeg een foto toe." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Alleen afbeeldingsbestanden zijn toegestaan." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Foto is te groot. Maximaal 10 MB." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const gameState = await getGameState(supabase);

    if (gameState.phase !== "upload" || phaseDeadlineExpired(gameState)) {
      return NextResponse.json({ error: "De uploadfase is gesloten." }, { status: 409 });
    }

    const proverb = await resolveCanonicalProverb(supabase, proverbInput, selectedProverbId);
    const photo = await storeSubmissionPhoto(supabase, teamId, file);

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        team_id: teamId,
        proverb_id: proverb.id,
        photo_path: photo.path,
        photo_url: photo.url
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Upload opslaan mislukte.");
    }

    return NextResponse.json({
      ok: true,
      submissionId: data.id,
      canonicalProverb: proverb.canonical_text
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
