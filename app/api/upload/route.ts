import { NextResponse } from "next/server";

import {
  getGameState,
  phaseDeadlineExpired,
  storeSubmissionPhoto
} from "@/lib/game-service";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const teamId = String(formData.get("teamId") ?? "");
    const assignmentId = String(formData.get("assignmentId") ?? "");
    const file = formData.get("photo");

    if (!teamId) {
      return NextResponse.json({ error: "Kies eerst een team." }, { status: 400 });
    }

    if (!assignmentId) {
      return NextResponse.json({ error: "Kies eerst een opdracht." }, { status: 400 });
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

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(
        `
          id,
          team_id,
          round_id,
          proverb_id,
          proverb:proverbs!assignments_proverb_id_fkey(canonical_text),
          submission:submissions(id, photo_path)
        `
      )
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Deze opdracht bestaat niet meer." }, { status: 404 });
    }

    if (assignment.team_id !== teamId) {
      return NextResponse.json({ error: "Deze opdracht hoort niet bij dit team." }, { status: 409 });
    }

    if (!gameState.current_round_id || assignment.round_id !== gameState.current_round_id) {
      return NextResponse.json({ error: "Deze opdracht hoort niet bij de actieve ronde." }, { status: 409 });
    }

    const photo = await storeSubmissionPhoto(supabase, teamId, file);
    const existingSubmission = Array.isArray(assignment.submission)
      ? assignment.submission[0] ?? null
      : assignment.submission;

    if (existingSubmission?.photo_path) {
      await supabase.storage.from(env.storageBucket).remove([existingSubmission.photo_path]);
    }

    const proverb = Array.isArray(assignment.proverb) ? assignment.proverb[0] : assignment.proverb;
    let data: { id: string } | null = null;

    if (existingSubmission?.id) {
      const { data: updated, error } = await supabase
        .from("submissions")
        .update({
          photo_path: photo.path,
          photo_url: photo.url
        })
        .eq("id", existingSubmission.id)
        .select("id")
        .single();

      if (error || !updated) {
        throw new Error("Upload bijwerken mislukte.");
      }
      data = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          team_id: teamId,
          proverb_id: assignment.proverb_id,
          photo_path: photo.path,
          photo_url: photo.url
        })
        .select("id")
        .single();

      if (error || !inserted) {
        throw new Error("Upload opslaan mislukte.");
      }
      data = inserted;
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
