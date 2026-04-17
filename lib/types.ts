export type Phase = "waiting" | "upload" | "voting" | "results";

export type Team = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
};

export type GameState = {
  id: string;
  phase: Phase;
  upload_ends_at: string | null;
  voting_ends_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProverbSuggestion = {
  id: string;
  canonical_text: string;
  similarity: number;
  exact: boolean;
};

export type ActiveSubmission = {
  id: string;
  photo_url: string;
  created_at: string;
  team_id: string;
  team_name: string;
  proverb_id: string;
  proverb_text?: string;
};

export type VoteReviewItem = {
  vote_id: string;
  submission_id: string;
  photo_url: string;
  guessed_text: string;
  guessed_proverb_text: string | null;
  correct_proverb_text: string;
  is_correct: boolean;
  overridden: boolean;
};

export type VotingQueueItem = {
  submission_id: string;
  photo_url: string;
  team_id: string;
  team_name: string;
  proverb_id: string;
  vote_id: string | null;
  guessed_text: string;
  guessed_proverb_id: string | null;
  is_answered: boolean;
};

export type TeamProgress = {
  team_id: string;
  team_name: string;
  uploads: number;
  votes_cast: number;
  votes_available: number;
  correct_votes_received: number;
  correct_guesses_made: number;
  score: number;
};

export type AdminVoteRow = {
  id: string;
  team_name: string;
  guessed_text: string;
  guessed_proverb_text: string | null;
  is_correct: boolean;
  override_is_correct: boolean | null;
  created_at: string;
};

export type AdminSubmissionRow = {
  id: string;
  created_at: string;
  photo_url: string;
  team_id: string;
  team_name: string;
  proverb_text: string;
  votes: AdminVoteRow[];
};

export type AdminSnapshot = {
  gameState: GameState;
  teams: Team[];
  progress: TeamProgress[];
  submissions: AdminSubmissionRow[];
  winner: TeamProgress | null;
};
