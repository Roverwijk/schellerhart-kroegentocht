import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { bestSuggestion, canonicalizeText, normalizeText } from "@/lib/text";
import type {
  ActiveSubmission,
  AdminSnapshot,
  GameState,
  Team,
  TeamProgress,
  VotingQueueItem,
  VoteReviewItem
} from "@/lib/types";

type ProverbRow = {
  id: string;
  canonical_text: string;
  normalized_text: string;
};

export async function getGameState(supabase: SupabaseClient): Promise<GameState> {
  const { data, error } = await supabase
    .from("game_state")
    .select("*")
    .eq("id", "singleton")
    .single();

  if (error || !data) {
    throw new Error("Game state kon niet worden geladen.");
  }

  return data;
}

export async function getTeams(supabase: SupabaseClient): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) {
    throw new Error("Teams konden niet worden geladen.");
  }
  return data ?? [];
}

export async function getProverbs(supabase: SupabaseClient): Promise<ProverbRow[]> {
  const { data, error } = await supabase
    .from("proverbs")
    .select("id, canonical_text, normalized_text")
    .order("canonical_text");

  if (error) {
    throw new Error("Spreekwoorden konden niet worden geladen.");
  }

  return data ?? [];
}

export async function resolveCanonicalProverb(
  supabase: SupabaseClient,
  input: string,
  selectedProverbId?: string | null
): Promise<ProverbRow> {
  const canonicalText = canonicalizeText(input);
  const normalizedInput = normalizeText(canonicalText);

  if (!normalizedInput) {
    throw new Error("Vul een spreekwoord in.");
  }

  if (selectedProverbId) {
    const { data, error } = await supabase
      .from("proverbs")
      .select("id, canonical_text, normalized_text")
      .eq("id", selectedProverbId)
      .single();

    if (error || !data) {
      throw new Error("Geselecteerd spreekwoord bestaat niet meer.");
    }

    return data;
  }

  const proverbs = await getProverbs(supabase);
  const exact = proverbs.find((proverb) => proverb.normalized_text === normalizedInput);
  if (exact) {
    return exact;
  }

  const best = bestSuggestion(canonicalText, proverbs);
  if (best && best.similarity >= 0.9) {
    const match = proverbs.find((proverb) => proverb.id === best.id);
    if (match) {
      return match;
    }
  }

  const { data, error } = await supabase
    .from("proverbs")
    .insert({
      canonical_text: canonicalText,
      normalized_text: normalizedInput
    })
    .select("id, canonical_text, normalized_text")
    .single();

  if (error || !data) {
    throw new Error("Nieuw spreekwoord opslaan mislukte.");
  }

  return data;
}

function extensionForFile(fileName: string): string {
  const last = fileName.split(".").pop();
  return last && last !== fileName ? last.toLowerCase() : "jpg";
}

export async function storeSubmissionPhoto(
  supabase: SupabaseClient,
  teamId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const extension = extensionForFile(file.name);
  const path = `${teamId}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(env.storageBucket)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false
    });

  if (error) {
    throw new Error("Foto uploaden naar storage mislukte.");
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(env.storageBucket).getPublicUrl(path);

  return { path, url: publicUrl };
}

export function phaseDeadlineExpired(gameState: GameState): boolean {
  const deadline =
    gameState.phase === "upload"
      ? gameState.upload_ends_at
      : gameState.phase === "voting"
        ? gameState.voting_ends_at
        : null;

  return deadline ? new Date(deadline).getTime() <= Date.now() : false;
}

export async function listVoteReviewForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<VoteReviewItem[]> {
  const { data, error } = await supabase
    .from("votes")
    .select(
      `
        id,
        guessed_text,
        is_correct,
        override_is_correct,
        guessed_proverb:proverbs!votes_guessed_proverb_id_fkey(canonical_text),
        submission:submissions!inner(
          id,
          photo_url,
          proverb:proverbs!submissions_proverb_id_fkey(canonical_text)
        )
      `
    )
    .eq("team_id", teamId)
    .order("created_at");

  if (error) {
    throw new Error("Eigen antwoorden konden niet worden geladen.");
  }

  return (data ?? []).map((vote: any) => ({
    vote_id: vote.id,
    submission_id: vote.submission.id,
    photo_url: vote.submission.photo_url,
    guessed_text: vote.guessed_text,
    guessed_proverb_text: vote.guessed_proverb?.canonical_text ?? null,
    correct_proverb_text: vote.submission.proverb.canonical_text,
    is_correct: vote.override_is_correct ?? vote.is_correct,
    overridden: vote.override_is_correct !== null
  }));
}

export async function getVotingQueue(
  supabase: SupabaseClient,
  teamId: string
): Promise<{
  items: VotingQueueItem[];
  current: ActiveSubmission | null;
  currentIndex: number;
  total: number;
  completed: number;
}> {
  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
        id,
        created_at,
        photo_url,
        team_id,
        team:teams!submissions_team_id_fkey(name),
        proverb_id
      `
    )
    .neq("team_id", teamId)
    .order("created_at");

  if (error) {
    throw new Error("Foto's konden niet worden geladen.");
  }

  const submissions = (data ?? []).map((item: any) => ({
    id: item.id,
    created_at: item.created_at,
    photo_url: item.photo_url,
    team_id: item.team_id,
    team_name: item.team.name,
    proverb_id: item.proverb_id
  }));

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("id, submission_id, guessed_text, guessed_proverb_id, is_correct, override_is_correct")
    .eq("team_id", teamId);

  if (votesError) {
    throw new Error("Stemstatus kon niet worden geladen.");
  }

  const votesBySubmissionId = new Map(
    (votes ?? []).map((vote) => [vote.submission_id, vote])
  );
  const items: VotingQueueItem[] = submissions.map((submission) => {
    const vote = votesBySubmissionId.get(submission.id);
    return {
      submission_id: submission.id,
      photo_url: submission.photo_url,
      team_id: submission.team_id,
      team_name: submission.team_name,
      proverb_id: submission.proverb_id,
      vote_id: vote?.id ?? null,
      guessed_text: vote?.guessed_text ?? "",
      guessed_proverb_id: vote?.guessed_proverb_id ?? null,
      is_answered: Boolean(vote)
    };
  });
  const firstUnansweredIndex = items.findIndex((item) => !item.is_answered);
  const currentIndex =
    items.length === 0 ? -1 : firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0;
  const currentSubmission = currentIndex >= 0 ? submissions[currentIndex] : null;

  return {
    items,
    current: currentSubmission ?? null,
    currentIndex,
    total: submissions.length,
    completed: items.filter((item) => item.is_answered).length
  };
}

export async function insertVote(params: {
  supabase: SupabaseClient;
  teamId: string;
  submissionId: string;
  guess: string;
  selectedProverbId?: string | null;
}) {
  const { supabase, teamId, submissionId, guess, selectedProverbId } = params;
  const normalizedGuess = normalizeText(guess);

  if (!normalizedGuess) {
    throw new Error("Typ een antwoord.");
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select(
      `
        id,
        team_id,
        proverb_id,
        proverb:proverbs!submissions_proverb_id_fkey(canonical_text, normalized_text)
      `
    )
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) {
    throw new Error("Deze foto bestaat niet meer.");
  }

  if (submission.team_id === teamId) {
    throw new Error("Je mag niet op je eigen foto stemmen.");
  }

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("team_id", teamId)
    .eq("submission_id", submissionId)
    .maybeSingle();

  const proverbs = await getProverbs(supabase);
  const suggestedMatch = selectedProverbId
    ? proverbs.find((proverb) => proverb.id === selectedProverbId) ?? null
    : (() => {
        const match = bestSuggestion(guess, proverbs);
        return match ? proverbs.find((proverb) => proverb.id === match.id) ?? null : null;
      })();

  const guessedProverbId = suggestedMatch?.id ?? null;
  const guessedNormalized = suggestedMatch
    ? normalizeText(suggestedMatch.canonical_text)
    : normalizedGuess;

  const submissionProverb = Array.isArray(submission.proverb)
    ? submission.proverb[0]
    : submission.proverb;
  const submissionNormalized = submissionProverb.normalized_text;
  const isCorrect =
    guessedNormalized === submissionNormalized ||
    guessedProverbId === submission.proverb_id;

  const votePayload = {
    team_id: teamId,
    submission_id: submissionId,
    guessed_text: canonicalizeText(guess),
    guessed_normalized: normalizedGuess,
    guessed_proverb_id: guessedProverbId,
    is_correct: isCorrect,
    override_is_correct: null
  };

  if (existingVote) {
    const { error } = await supabase
      .from("votes")
      .update(votePayload)
      .eq("id", existingVote.id);

    if (error) {
      throw new Error("Stem bijwerken mislukte.");
    }

    return;
  }

  const { error } = await supabase.from("votes").insert(votePayload);

  if (error) {
    throw new Error("Stem opslaan mislukte.");
  }
}

export async function getAdminSnapshot(supabase: SupabaseClient): Promise<AdminSnapshot> {
  const [gameState, teams] = await Promise.all([getGameState(supabase), getTeams(supabase)]);

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select(
      `
        id,
        created_at,
        photo_url,
        team_id,
        team:teams!submissions_team_id_fkey(name),
        proverb:proverbs!submissions_proverb_id_fkey(canonical_text),
        votes(
          id,
          guessed_text,
          is_correct,
          override_is_correct,
          created_at,
          team:teams!votes_team_id_fkey(name),
          guessed_proverb:proverbs!votes_guessed_proverb_id_fkey(canonical_text)
        )
      `
    )
    .order("created_at");

  if (error) {
    throw new Error("Admin-overzicht kon niet worden geladen.");
  }

  const formattedSubmissions = (submissions ?? []).map((submission: any) => ({
    id: submission.id,
    created_at: submission.created_at,
    photo_url: submission.photo_url,
    team_id: submission.team_id,
    team_name: submission.team.name,
    proverb_text: submission.proverb.canonical_text,
    votes: (submission.votes ?? []).map((vote: any) => ({
      id: vote.id,
      team_name: vote.team.name,
      guessed_text: vote.guessed_text,
      guessed_proverb_text: vote.guessed_proverb?.canonical_text ?? null,
      is_correct: vote.override_is_correct ?? vote.is_correct,
      override_is_correct: vote.override_is_correct,
      created_at: vote.created_at
    }))
  }));

  const progress: TeamProgress[] = teams.map((team) => {
    const ownSubmissions = formattedSubmissions.filter((item) => item.team_id === team.id);
    const availableVotes = formattedSubmissions.filter((item) => item.team_id !== team.id).length;
    const ownVotes = formattedSubmissions
      .flatMap((item) => item.votes)
      .filter((vote) => vote.team_name === team.name);
    const votesCast = ownVotes.length;
    const correctVotesReceived = ownSubmissions.reduce((sum, submission) => {
      return sum + submission.votes.filter((vote: { is_correct: boolean }) => vote.is_correct).length;
    }, 0);
    const correctGuessesMade = ownVotes.filter((vote) => vote.is_correct).length;
    const score = correctVotesReceived + correctGuessesMade;

    return {
      team_id: team.id,
      team_name: team.name,
      uploads: ownSubmissions.length,
      votes_cast: votesCast,
      votes_available: availableVotes,
      correct_votes_received: correctVotesReceived,
      correct_guesses_made: correctGuessesMade,
      score
    };
  });

  const winner =
    [...progress].sort((left, right) => right.score - left.score || left.team_name.localeCompare(right.team_name))[0] ??
    null;

  return {
    gameState,
    teams,
    progress,
    submissions: formattedSubmissions,
    winner
  };
}

export async function resetGameRound(
  supabase: SupabaseClient,
  options?: { uploadMinutes?: number; votingMinutes?: number }
) {
  const uploadMinutes = Math.max(1, Number(options?.uploadMinutes ?? 20));
  const votingMinutes = Math.max(1, Number(options?.votingMinutes ?? 20));

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, photo_path");

  if (submissionsError) {
    throw new Error("Bestaande uploads konden niet worden geladen voor reset.");
  }

  const paths = (submissions ?? [])
    .map((submission) => submission.photo_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(env.storageBucket)
      .remove(paths);

    if (storageError) {
      throw new Error("Foto's verwijderen uit storage mislukte.");
    }
  }

  const submissionIds = (submissions ?? []).map((submission) => submission.id);

  if (submissionIds.length > 0) {
    const { error: votesError } = await supabase
      .from("votes")
      .delete()
      .in("submission_id", submissionIds);

    if (votesError) {
      throw new Error("Stemmen verwijderen mislukte.");
    }
  }

  const { error: orphanVotesError } = await supabase
    .from("votes")
    .delete()
    .not("id", "is", null);

  if (orphanVotesError) {
    throw new Error("Resterende stemmen verwijderen mislukte.");
  }

  if (submissionIds.length > 0) {
    const { error: submissionsDeleteError } = await supabase
      .from("submissions")
      .delete()
      .in("id", submissionIds);

    if (submissionsDeleteError) {
      throw new Error("Uploads verwijderen mislukte.");
    }
  }

  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      phase: "waiting",
      upload_ends_at: new Date(Date.now() + uploadMinutes * 60_000).toISOString(),
      voting_ends_at: new Date(Date.now() + votingMinutes * 60_000).toISOString()
    })
    .eq("id", "singleton");

  if (stateError) {
    throw new Error("Game state resetten mislukte.");
  }
}
