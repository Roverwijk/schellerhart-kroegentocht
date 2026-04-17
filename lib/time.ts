import type { GameState } from "@/lib/types";

export function getDeadlineForPhase(gameState: GameState): string | null {
  if (gameState.phase === "upload") {
    return gameState.upload_ends_at;
  }

  if (gameState.phase === "voting") {
    return gameState.voting_ends_at;
  }

  return null;
}

export function secondsRemaining(isoDate: string | null): number {
  if (!isoDate) {
    return 0;
  }

  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function isInputClosed(gameState: GameState): boolean {
  if (gameState.phase === "results") {
    return true;
  }

  const deadline = getDeadlineForPhase(gameState);
  return secondsRemaining(deadline) <= 0;
}
