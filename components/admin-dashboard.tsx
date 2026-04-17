"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { TimerPill } from "@/components/timer-pill";
import { createBrowserRealtimeClient } from "@/lib/supabase/browser";
import type { AdminSnapshot, GameState, Team } from "@/lib/types";

type ProverbRow = {
  id: string;
  canonical_text: string;
  normalized_text: string;
};

export function AdminDashboard() {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [proverbs, setProverbs] = useState<ProverbRow[]>([]);
  const [uploadMinutes, setUploadMinutes] = useState(20);
  const [votingMinutes, setVotingMinutes] = useState(20);
  const [shareBaseUrl, setShareBaseUrl] = useState("");
  const [proverbQuery, setProverbQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newProverb, setNewProverb] = useState("");
  const [savingState, setSavingState] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function refresh() {
    const [stateResponse, proverbResponse] = await Promise.all([
      fetch("/api/admin/state"),
      fetch("/api/admin/proverbs")
    ]);

    const statePayload = (await stateResponse.json()) as AdminSnapshot & { error?: string };
    const proverbPayload = (await proverbResponse.json()) as {
      proverbs?: ProverbRow[];
      error?: string;
    };

    if (!stateResponse.ok) {
      throw new Error(statePayload.error ?? "Admingegevens laden mislukte.");
    }

    if (!proverbResponse.ok) {
      throw new Error(proverbPayload.error ?? "Spreekwoorden laden mislukte.");
    }

    setSnapshot(statePayload);
    setProverbs(proverbPayload.proverbs ?? []);
  }

  useEffect(() => {
    setShareBaseUrl(window.location.origin);

    refresh().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Admingegevens laden mislukte.");
    });

    const polling = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);

    const supabase = createBrowserRealtimeClient();
    const channel = supabase
      .channel("admin-game-state")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: "id=eq.singleton"
        },
        () => {
          refresh().catch(() => undefined);
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(polling);
      supabase.removeChannel(channel);
    };
  }, []);

  const winnerLabel = useMemo(() => {
    if (!snapshot?.winner) {
      return "Nog geen winnaar";
    }
    return `${snapshot.winner.team_name} met ${snapshot.winner.score} punt(en)`;
  }, [snapshot]);

  const sortedProgress = useMemo(() => {
    return [...(snapshot?.progress ?? [])].sort((left, right) => {
      return right.score - left.score || left.team_name.localeCompare(right.team_name);
    });
  }, [snapshot?.progress]);

  const uploadLinks = useMemo(() => {
    const baseUrl = shareBaseUrl.trim().replace(/\/$/, "");
    if (!baseUrl || !snapshot?.teams) {
      return [];
    }

    return snapshot.teams.map((team: Team) => ({
      team,
      url: `${baseUrl}/upload/${team.slug}`,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${baseUrl}/upload/${team.slug}`
      )}`
    }));
  }, [shareBaseUrl, snapshot?.teams]);

  const filteredProverbs = useMemo(() => {
    const query = proverbQuery.trim().toLocaleLowerCase("nl-NL");
    if (!query) {
      return proverbs;
    }

    return proverbs.filter((proverb) =>
      proverb.canonical_text.toLocaleLowerCase("nl-NL").includes(query)
    );
  }, [proverbQuery, proverbs]);

  async function updateState(phase: GameState["phase"], currentRoundId?: string | null) {
    setSavingState(true);
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/admin/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "set-phase",
        phase,
        currentRoundId: currentRoundId ?? null,
        uploadMinutes,
        votingMinutes
      })
    });
    const payload = (await response.json()) as AdminSnapshot & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Game state opslaan mislukte.");
      setSavingState(false);
      return;
    }
    setSnapshot(payload);
    setSavingState(false);
  }

  const currentRoundProgress = useMemo(() => {
    if (!snapshot?.currentRound) {
      return [];
    }

    return snapshot.teams.map((team) => {
      const teamAssignments = snapshot.assignments.filter((assignment) => assignment.team_id === team.id);
      return {
        teamId: team.id,
        teamName: team.name,
        uploaded: teamAssignments.filter((assignment) => assignment.is_uploaded).length,
        total: teamAssignments.length
      };
    });
  }, [snapshot]);

  async function toggleOverride(voteId: string, isCorrect: boolean) {
    const response = await fetch("/api/admin/override", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ voteId, isCorrect })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Override opslaan mislukte.");
      return;
    }

    refresh().catch(() => undefined);
  }

  async function addProverb(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProverb.trim()) {
      return;
    }

    const response = await fetch("/api/admin/proverbs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ canonicalText: newProverb })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Spreekwoord toevoegen mislukte.");
      return;
    }

    setNewProverb("");
    refresh().catch(() => undefined);
  }

  async function resetGame() {
    const confirmed = window.confirm(
      "Weet je zeker dat je het spel wilt resetten? Uploads, stemmen en foto's worden verwijderd."
    );

    if (!confirmed) {
      return;
    }

    setResetting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "reset",
        phase: "upload",
        uploadMinutes,
        votingMinutes
      })
    });

    const payload = (await response.json()) as AdminSnapshot & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Spel resetten mislukte.");
      setResetting(false);
      return;
    }

    setSnapshot(payload);
    setSuccess("Spel gereset. Uploads, stemmen en foto's zijn verwijderd.");
    setResetting(false);
  }

  async function editProverb(id: string, currentText: string) {
    const canonicalText = window.prompt("Pas het spreekwoord aan", currentText);
    if (!canonicalText || canonicalText === currentText) {
      return;
    }

    const response = await fetch("/api/admin/proverbs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, canonicalText })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Spreekwoord bijwerken mislukte.");
      return;
    }

    refresh().catch(() => undefined);
  }

  return (
    <MobileShell
      title="Admin"
      phase={snapshot?.gameState.phase ?? "waiting"}
      subtitle="Beheer fases, timers, scores en antwoordcorrecties zonder extra presentatiescherm."
      actions={
        snapshot?.gameState.phase === "upload" ? (
          <TimerPill endsAt={snapshot.gameState.upload_ends_at} label="Upload" />
        ) : snapshot?.gameState.phase === "voting" ? (
          <TimerPill endsAt={snapshot.gameState.voting_ends_at} label="Voting" />
        ) : null
      }
    >
      <section className="rounded-4xl border border-white/70 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffedd5_45%,_#ffffff_100%)] p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Eindstand
            </p>
            <h2 className="mt-2 text-2xl font-black text-ink">Scorebord</h2>
            <p className="mt-1 text-sm text-slate-600">
              Meteen zichtbaar op mobiel wie voorstaat en wie wint.
            </p>
          </div>
          <div className="rounded-3xl bg-white/90 px-4 py-3 text-right shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Winnaar
            </p>
            <p className="mt-1 text-base font-black text-ink">{winnerLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {sortedProgress.map((team, index) => (
            <article
              key={team.team_id}
              className={`rounded-3xl border p-4 ${
                index === 0
                  ? "border-accent/30 bg-white shadow-sm"
                  : "border-white/70 bg-white/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                      index === 0
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink">{team.team_name}</h3>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {team.correct_votes_received} maker-punten, {team.correct_guesses_made} raad-punten
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-ink">{team.score}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    punten
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-600">
                <p>Uploads: {team.uploads}</p>
                <p>Stemmen: {team.votes_cast}/{team.votes_available}</p>
                <p>Maker-punten: {team.correct_votes_received}</p>
                <p>Raad-punten: {team.correct_guesses_made}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div className="grid gap-3">
          <div className="rounded-3xl bg-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Actieve fase
            </p>
            <p className="mt-2 text-2xl font-black capitalize text-ink">
              {snapshot?.gameState.phase ?? "laden"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {snapshot?.currentRound ? snapshot.currentRound.title : "Nog geen actieve ronde gekozen"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block rounded-3xl border border-slate-200 bg-white p-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Upload min
              </span>
              <input
                className="w-full rounded-2xl border-slate-200 px-3 py-3 font-semibold"
                min={1}
                type="number"
                value={uploadMinutes}
                onChange={(event) => setUploadMinutes(Number(event.target.value))}
              />
            </label>
            <label className="block rounded-3xl border border-slate-200 bg-white p-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Stem min
              </span>
              <input
                className="w-full rounded-2xl border-slate-200 px-3 py-3 font-semibold"
                min={1}
                type="number"
                value={votingMinutes}
                onChange={(event) => setVotingMinutes(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="grid gap-2">
            <button
              className={`w-full rounded-3xl px-4 py-4 text-base font-black transition ${
                snapshot?.gameState.phase === "waiting"
                  ? "bg-ink text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              disabled={savingState}
              type="button"
              onClick={() => {
                updateState("waiting", snapshot?.gameState.current_round_id ?? null).catch(() => undefined);
              }}
            >
              Zet fase op wacht op de start
            </button>

            {snapshot?.rounds.map((round) => (
              <button
                key={round.id}
                className={`w-full rounded-3xl px-4 py-4 text-base font-black transition ${
                  snapshot?.gameState.phase === "upload" && snapshot?.currentRound?.id === round.id
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                disabled={savingState}
                type="button"
                onClick={() => {
                  updateState("upload", round.id).catch(() => undefined);
                }}
              >
                Open {round.title}
              </button>
            ))}

            {(["voting", "results"] as const).map((phase) => (
              <button
                key={phase}
                className={`w-full rounded-3xl px-4 py-4 text-base font-black transition ${
                  snapshot?.gameState.phase === phase
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                disabled={savingState}
                type="button"
                onClick={() => {
                  updateState(phase, snapshot?.gameState.current_round_id ?? null).catch(() => undefined);
                }}
              >
                Zet fase op {phase}
              </button>
            ))}
          </div>

          <button
            className="w-full rounded-3xl bg-berry px-4 py-4 text-base font-black text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={savingState || resetting}
            type="button"
            onClick={() => {
              resetGame().catch(() => undefined);
            }}
          >
            {resetting ? "Reset bezig..." : "Reset spel en verwijder foto's"}
          </button>
        </div>
      </section>

      {snapshot?.currentRound ? (
        <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
          <div>
            <h2 className="text-lg font-black">Huidige ronde</h2>
            <p className="mt-1 text-sm text-slate-600">
              Live voortgang voor {snapshot.currentRound.title}. Elk team moet 2 opdrachten uploaden.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {currentRoundProgress.map((row) => (
              <article key={row.teamId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-ink">{row.teamName}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                    {row.uploaded}/{row.total}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {snapshot.assignments
                    .filter((assignment) => assignment.team_id === row.teamId)
                    .sort((left, right) => left.slot - right.slot)
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-sm"
                      >
                        <span className="font-semibold text-slate-700">
                          {assignment.slot}. {assignment.proverb_text}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                            assignment.is_uploaded
                              ? "bg-teal/10 text-teal"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {assignment.is_uploaded ? "Binnen" : "Open"}
                        </span>
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Teams</h2>
            <p className="mt-1 text-sm text-slate-600">Live voortgang per team tijdens het spel.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {sortedProgress.map((team) => (
            <article key={team.team_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-ink">{team.team_name}</h3>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
                  {team.score} pt
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-600">
                <p>Uploads: {team.uploads}</p>
                <p>Stemmen: {team.votes_cast}/{team.votes_available}</p>
                <p>Maker-punten: {team.correct_votes_received}</p>
                <p>Raad-punten: {team.correct_guesses_made}</p>
                <p>Score: {team.score}</p>
              </div>
            </article>
          )) ?? <p className="text-sm text-slate-500">Laden...</p>}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div>
          <h2 className="text-lg font-black">Teamlinks voor spelpagina</h2>
          <p className="mt-1 text-sm text-slate-600">
            Elk team krijgt een eigen QR-code. Diezelfde pagina wisselt automatisch tussen uploaden, stemmen en resultaten.
          </p>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Basis-URL voor delen
          </span>
          <input
            className="w-full rounded-3xl border-slate-200 px-4 py-3 font-semibold"
            placeholder="http://192.168.0.6:3001"
            value={shareBaseUrl}
            onChange={(event) => setShareBaseUrl(event.target.value)}
          />
        </label>
        <div className="mt-4 grid gap-4">
          {uploadLinks.map(({ team, url, qrUrl }) => (
            <article key={team.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-ink">{team.name}</h3>
                  <p className="mt-2 break-all text-sm text-slate-600">{url}</p>
                  <button
                    className="mt-3 rounded-2xl bg-ink px-3 py-2 text-sm font-black text-white"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(url).catch(() => undefined);
                      setSuccess(`Link gekopieerd voor ${team.name}.`);
                    }}
                  >
                    Kopieer link
                  </button>
                </div>
                <img
                  alt={`QR-code voor ${team.name}`}
                  className="h-28 w-28 rounded-2xl border border-slate-200 bg-white object-contain"
                  src={qrUrl}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div>
          <h2 className="text-lg font-black">Spreekwoorden</h2>
          <p className="mt-1 text-sm text-slate-600">Canonical lijst voor suggesties en fuzzy matching.</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {proverbs.length} totaal{proverbQuery.trim() ? `, ${filteredProverbs.length} zichtbaar` : ""}
          </p>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={addProverb}>
          <input
            className="flex-1 rounded-3xl border-slate-200 px-4 py-3"
            placeholder="Nieuw spreekwoord"
            value={newProverb}
            onChange={(event) => setNewProverb(event.target.value)}
          />
          <button className="rounded-3xl bg-accent px-4 py-3 font-black text-white" type="submit">
            Voeg toe
          </button>
        </form>
        <input
          className="mt-3 w-full rounded-3xl border-slate-200 px-4 py-3"
          placeholder="Zoek in spreekwoorden"
          value={proverbQuery}
          onChange={(event) => setProverbQuery(event.target.value)}
        />
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {filteredProverbs.map((proverb) => (
            <div
              key={proverb.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <span>{proverb.canonical_text}</span>
              <button
                className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
                type="button"
                onClick={() => {
                  editProverb(proverb.id, proverb.canonical_text).catch(() => undefined);
                }}
              >
                Bewerk
              </button>
            </div>
          ))}
          {filteredProverbs.length === 0 ? (
            <p className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Geen spreekwoorden gevonden voor deze zoekterm.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div>
          <h2 className="text-lg font-black">Uploads en stemmen</h2>
          <p className="mt-1 text-sm text-slate-600">Per antwoord kun je handmatig goed of fout forceren.</p>
        </div>
        <div className="mt-4 space-y-4">
          {snapshot?.submissions.map((submission) => (
            <article key={submission.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-ink">{submission.team_name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{submission.proverb_text}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {new Date(submission.created_at).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
              <img
                alt={`Upload van ${submission.team_name}`}
                className="mt-3 h-48 w-full rounded-3xl object-cover"
                src={submission.photo_url}
              />
              <div className="mt-4 space-y-2">
                {submission.votes.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">Nog geen stemmen.</p>
                ) : (
                  submission.votes.map((vote) => (
                    <div key={vote.id} className="rounded-3xl bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-ink">{vote.team_name}</p>
                          <p className="mt-1 text-sm text-slate-600">{vote.guessed_text}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${
                            vote.is_correct
                              ? "bg-teal/10 text-teal"
                              : "bg-rose-100 text-berry"
                          }`}
                        >
                          {vote.is_correct ? "Goed" : "Fout"}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="flex-1 rounded-2xl bg-teal px-3 py-2 text-sm font-black text-white"
                          type="button"
                          onClick={() => {
                            toggleOverride(vote.id, true).catch(() => undefined);
                          }}
                        >
                          Forceer goed
                        </button>
                        <button
                          className="flex-1 rounded-2xl bg-berry px-3 py-2 text-sm font-black text-white"
                          type="button"
                          onClick={() => {
                            toggleOverride(vote.id, false).catch(() => undefined);
                          }}
                        >
                          Forceer fout
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          )) ?? <p className="text-sm text-slate-500">Laden...</p>}
        </div>
      </section>

      {error ? (
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      ) : null}

      {success ? (
        <section className="rounded-4xl border border-teal/20 bg-teal/10 p-4 text-sm font-semibold text-teal">
          {success}
        </section>
      ) : null}
    </MobileShell>
  );
}

