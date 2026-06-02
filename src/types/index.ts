// ─── Core Player ────────────────────────────────────────────────────────────

export interface Player {
  id: number;
  name: string;
  overall: number;
  position: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  clubId: number;
  clubName: string;
  leagueName: string;
  nationalityId: number;
  nationalityName: string;
  imageUrl: string;
}

// ─── Formation ──────────────────────────────────────────────────────────────

export interface FormationPosition {
  slot: string;       // e.g. "LW", "ST", "GK"
  positionGroup: string; // used for pool filtering: "GK","CB","FB","CM","CAM","WG","ST"
  x: number;          // 0–100, 0 = left touchline
  y: number;          // 0–100, 0 = GK end, 100 = forward end
}

export interface Formation {
  name: string;       // e.g. "4-3-3"
  label: string;      // e.g. "Balanced"
  positions: FormationPosition[];
}

// ─── Squad Building ──────────────────────────────────────────────────────────

export interface DraftedPlayer {
  player: Player;
  slot: string;       // formation slot label, e.g. "LW"
  slotIndex: number;  // 0–10 for starters, 0–4 for subs
  chemistry: number;  // 1–10 individual chemistry score
}

export interface Squad {
  formation: Formation;
  starters: DraftedPlayer[];
  subs: DraftedPlayer[];
  teamName: string;
  ovrAvg: number;       // average OVR of 11 starters, 0–100
  chemistry: number;    // normalized 0–100
  draftScore: number;   // ovrAvg + chemistry, max 200
}

// ─── Chemistry ───────────────────────────────────────────────────────────────

export interface ChemistryPreview {
  perPlayer: number[];    // chemistry score for each starter slot (1–10)
  total: number;          // normalized 0–100
}

// ─── Bracket ─────────────────────────────────────────────────────────────────

export interface BracketTeam {
  id: string;
  name: string;
  ovr: number;
  isUser: boolean;
  badgeUrl?: string;
  seed: number;
}

export interface BracketMatch {
  id: string;
  teamA: BracketTeam;
  teamB: BracketTeam;
  winner: BracketTeam | null;
  scoreA: number | null;
  scoreB: number | null;
  roundIndex: number;
  matchIndex: number;
}

export interface BracketRound {
  name: string;           // "Round of 16", "Quarter-Final", "Semi-Final", "Final"
  matches: BracketMatch[];
}

// ─── Match Simulation ────────────────────────────────────────────────────────

export type MatchEventType =
  | 'GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SAVE'
  | 'CHANCE'
  | 'SUBSTITUTION'
  | 'KEY_PASS'
  | 'FOUL';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  description: string;
  isUserTeam: boolean;   // true = user's team action
  isGoal: boolean;
}

export interface PlayerRating {
  player: DraftedPlayer;
  rating: number;         // 5.0–9.0
}

export interface MatchResult {
  userScore: number;
  opponentScore: number;
  events: MatchEvent[];
  possession: number;     // user possession %, 0–100
  userShots: number;
  opponentShots: number;
  userShotsOnTarget: number;
  opponentShotsOnTarget: number;
  userXg: number;
  opponentXg: number;
  playerRatings: PlayerRating[];
  motm: DraftedPlayer;    // man of the match
  wentToET: boolean;
  wentToPenalties: boolean;
  userWon: boolean;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  teamName: string;
  formation: string;
  draftScore: number;
  result: string;         // e.g. "Champions", "Semi-Final", "Eliminated R16"
  timestamp: number;
}

// ─── Game State Machine ──────────────────────────────────────────────────────

export enum GameState {
  LANDING = 'LANDING',
  FORMATION_PICK = 'FORMATION_PICK',
  DRAFT = 'DRAFT',
  SUB_DRAFT = 'SUB_DRAFT',
  DRAFT_SCORE = 'DRAFT_SCORE',
  BRACKET_VIEW = 'BRACKET_VIEW',
  MATCH_SIM = 'MATCH_SIM',
  POST_MATCH = 'POST_MATCH',
  TROPHY_SCREEN = 'TROPHY_SCREEN',
}

export type DraftScoreTier =
  | 'World Class Draft'
  | 'Elite Draft'
  | 'Strong Draft'
  | 'Good Draft';

export function getDraftScoreTier(score: number): DraftScoreTier {
  if (score >= 190) return 'World Class Draft';
  if (score >= 180) return 'Elite Draft';
  if (score >= 170) return 'Strong Draft';
  return 'Good Draft';
}
