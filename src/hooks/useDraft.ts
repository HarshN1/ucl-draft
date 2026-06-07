'use client';

import { useReducer, useCallback, useEffect } from 'react';
import {
  GameState,
  type Player,
  type Formation,
  type DraftedPlayer,
  type Squad,
  type Manager,
  type BracketRound,
  type MatchResult,
  type ChemistryPreview,
  type BracketTeam,
} from '@/types';
import { FORMATIONS } from '@/data/formations';
import { LEGENDS } from '@/data/legends';
import {
  drawCardsForSlot,
  drawCaptainCandidates,
  drawSubCandidates,
  drawReserveWildcard,
  drawManagers,
  sampleFormations,
  findBestSlotForCaptain,
} from '@/engine/playerUtils';
import {
  calculateChemistry,
  previewChemistryWithCandidate,
  isInPosition,
} from '@/engine/chemistryEngine';
import {
  generateBracket,
  applyUserResult,
  progressBracket,
  findUserMatch,
  getUserResult,
  simulateToChampion,
} from '@/engine/bracketEngine';

// ─── 23-man squad layout ───────────────────────────────────────────────────────

const SUBS_COUNT = 7;
const RESERVES_COUNT = 5;
const BENCH_COUNT = SUBS_COUNT + RESERVES_COUNT; // 12
// Position group for each bench slot (drives position-appropriate draws + labels)
const BENCH_GROUPS = [
  // 7 subs: a backup keeper + one per line (position-matched draws)
  'GK', 'CB', 'FB', 'CDM', 'CM', 'WG', 'ST',
  // 5 reserves: generic "blind" wildcard slots (any position)
  'RES', 'RES', 'RES', 'RES', 'RES',
];

// Squad-rating weights: the starting XI is what counts, substitutes nudge it a
// little, and reserves have no effect at all.
const STARTER_WEIGHT = 5;
const SUB_WEIGHT = 1;
const RESERVE_WEIGHT = 0;

export type SlotZone = 'starter' | 'bench';
export interface ActiveSlot {
  zone: SlotZone;
  index: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface DraftState {
  gameState: GameState;
  formationOptions: Formation[];
  formation: Formation | null;
  draftPool: Player[];
  isLoadingPool: boolean;
  poolError: string | null;

  // Draft board
  awaitingCaptain: boolean;
  starterPlayers: (Player | null)[]; // length = formation slots (11)
  benchPlayers: (Player | null)[];   // length 12 (0–6 subs, 7–11 reserves)
  activeSlot: ActiveSlot | null;     // slot currently being drafted
  currentCards: Player[];            // 5 options for the active slot / captain
  chemPreview: ChemistryPreview;
  squadRating: number;               // live weighted rating

  managerOptions: Manager[];
  manager: Manager | null;
  squad: Squad | null;

  bracket: BracketRound[] | null;
  currentRound: number;
  currentMatchIndex: number;
  matchResult: MatchResult | null;
  isChampion: boolean;
  isEliminated: boolean;
  tournamentChampion: BracketTeam | null;
  teamName: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_POOL'; pool: Player[] }
  | { type: 'POOL_ERROR'; error: string }
  | { type: 'START_GAME' }
  | { type: 'SELECT_FORMATION'; formation: Formation }
  | { type: 'PICK_CAPTAIN'; player: Player }
  | { type: 'SELECT_SLOT'; slot: ActiveSlot }
  | { type: 'CANCEL_SLOT' }
  | { type: 'PICK_PLAYER'; player: Player }
  | { type: 'SWAP_SLOTS'; a: ActiveSlot; b: ActiveSlot }
  | { type: 'CONFIRM_SQUAD' }
  | { type: 'PICK_MANAGER'; manager: Manager }
  | { type: 'CONFIRM_DRAFT_SCORE'; teamName: string }
  | { type: 'START_MATCH' }
  | { type: 'SET_MATCH_RESULT'; result: MatchResult }
  | { type: 'CONFIRM_POST_MATCH' }
  | { type: 'RESET' };

const initialState: DraftState = {
  gameState: GameState.LANDING,
  formationOptions: [],
  formation: null,
  draftPool: [],
  isLoadingPool: false,
  poolError: null,
  awaitingCaptain: false,
  starterPlayers: [],
  benchPlayers: [],
  activeSlot: null,
  currentCards: [],
  chemPreview: { perPlayer: [], links: [], total: 0 },
  squadRating: 0,
  managerOptions: [],
  manager: null,
  squad: null,
  bracket: null,
  currentRound: 0,
  currentMatchIndex: 0,
  matchResult: null,
  isChampion: false,
  isEliminated: false,
  tournamentChampion: null,
  teamName: 'FK Bodø/Glimt',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function draftedIds(starters: (Player | null)[], bench: (Player | null)[]): Set<number> {
  const s = new Set<number>();
  for (const p of starters) if (p) s.add(p.id);
  for (const p of bench) if (p) s.add(p.id);
  return s;
}

/** Filled starters as DraftedPlayer[] (for chemistry). */
function startersDrafted(
  starterPlayers: (Player | null)[],
  formation: Formation
): DraftedPlayer[] {
  const out: DraftedPlayer[] = [];
  starterPlayers.forEach((p, i) => {
    if (!p) return;
    const slot = formation.positions[i];
    out.push({
      player: p,
      slot: slot.slot,
      slotIndex: i,
      chemistry: 0,
      outOfPosition: !isInPosition(p.position, slot.positionGroup),
    });
  });
  return out;
}

function computeChem(
  starterPlayers: (Player | null)[],
  formation: Formation,
  manager: Manager | null
): ChemistryPreview {
  return calculateChemistry(startersDrafted(starterPlayers, formation), formation, manager);
}

/** Weighted rating: starters heavier than bench/reserves. */
function weightedRating(
  starterPlayers: (Player | null)[],
  benchPlayers: (Player | null)[]
): number {
  let sum = 0;
  let w = 0;
  for (const p of starterPlayers) if (p) { sum += p.overall * STARTER_WEIGHT; w += STARTER_WEIGHT; }
  benchPlayers.forEach((p, i) => {
    if (!p) return;
    const wt = i < SUBS_COUNT ? SUB_WEIGHT : RESERVE_WEIGHT; // reserves contribute nothing
    sum += p.overall * wt;
    w += wt;
  });
  return w ? Math.round(sum / w) : 0;
}

function isAllFilled(starterPlayers: (Player | null)[], benchPlayers: (Player | null)[]) {
  return starterPlayers.every(Boolean) && benchPlayers.every(Boolean);
}

function buildSquad(
  formation: Formation,
  starterPlayers: (Player | null)[],
  benchPlayers: (Player | null)[],
  manager: Manager | null,
  teamName: string
): Squad {
  const chem = calculateChemistry(startersDrafted(starterPlayers, formation), formation, manager);
  const starters = startersDrafted(starterPlayers, formation).map((dp) => ({
    ...dp,
    chemistry: chem.perPlayer[dp.slotIndex] ?? 0,
  }));
  const bench: DraftedPlayer[] = [];
  benchPlayers.forEach((p, i) => {
    if (!p) return;
    bench.push({
      player: p,
      slot: i < SUBS_COUNT ? 'SUB' : 'RES',
      slotIndex: i,
      chemistry: 0,
    });
  });
  const ovrAvg = weightedRating(starterPlayers, benchPlayers);
  return {
    formation,
    starters,
    subs: bench.slice(0, SUBS_COUNT),
    reserves: bench.slice(SUBS_COUNT),
    manager,
    teamName,
    ovrAvg,
    chemistry: chem.total,
    draftScore: ovrAvg + chem.total,
  };
}

function drawForSlot(state: DraftState, slot: ActiveSlot): Player[] {
  if (!state.formation) return [];
  const ids = draftedIds(state.starterPlayers, state.benchPlayers);
  if (slot.zone === 'starter') {
    return drawCardsForSlot(
      state.draftPool,
      state.formation,
      slot.index,
      startersDrafted(state.starterPlayers, state.formation),
      ids
    );
  }
  // Reserves are "blind" wildcards (any position); subs are position-matched.
  if (slot.index >= SUBS_COUNT) return drawReserveWildcard(state.draftPool, ids);
  return drawSubCandidates(state.draftPool, BENCH_GROUPS[slot.index] ?? 'CM', ids);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case 'SET_POOL':
      return {
        ...state,
        draftPool: action.pool,
        isLoadingPool: false,
        formationOptions: sampleFormations(FORMATIONS),
        gameState: GameState.FORMATION_PICK,
      };

    case 'POOL_ERROR':
      return { ...state, isLoadingPool: false, poolError: action.error };

    case 'START_GAME':
      return { ...state, isLoadingPool: true };

    case 'SELECT_FORMATION': {
      const { formation } = action;
      return {
        ...state,
        formation,
        gameState: GameState.DRAFT,
        awaitingCaptain: true,
        starterPlayers: new Array(formation.positions.length).fill(null),
        benchPlayers: new Array(BENCH_COUNT).fill(null),
        activeSlot: null,
        currentCards: drawCaptainCandidates(state.draftPool, new Set()),
        chemPreview: { perPlayer: [], links: [], total: 0 },
        squadRating: 0,
        manager: null,
      };
    }

    case 'PICK_CAPTAIN': {
      if (!state.formation) return state;
      const slotIndex = findBestSlotForCaptain(action.player.position, state.formation);
      const starterPlayers = [...state.starterPlayers];
      starterPlayers[slotIndex] = action.player;
      return {
        ...state,
        awaitingCaptain: false,
        starterPlayers,
        activeSlot: null,
        currentCards: [],
        chemPreview: computeChem(starterPlayers, state.formation, null),
        squadRating: weightedRating(starterPlayers, state.benchPlayers),
      };
    }

    case 'SELECT_SLOT': {
      // Only draft into an empty slot
      const { slot } = action;
      const occupied =
        slot.zone === 'starter'
          ? state.starterPlayers[slot.index]
          : state.benchPlayers[slot.index];
      if (occupied) return state;
      return { ...state, activeSlot: slot, currentCards: drawForSlot(state, slot) };
    }

    case 'CANCEL_SLOT':
      return { ...state, activeSlot: null, currentCards: [] };

    case 'PICK_PLAYER': {
      if (!state.formation || !state.activeSlot) return state;
      const { zone, index } = state.activeSlot;
      const starterPlayers = [...state.starterPlayers];
      const benchPlayers = [...state.benchPlayers];
      if (zone === 'starter') starterPlayers[index] = action.player;
      else benchPlayers[index] = action.player;

      const next = {
        ...state,
        starterPlayers,
        benchPlayers,
        activeSlot: null,
        currentCards: [],
        chemPreview: computeChem(starterPlayers, state.formation, null),
        squadRating: weightedRating(starterPlayers, benchPlayers),
      };

      // Auto-advance to manager draft once all 23 are picked
      if (isAllFilled(starterPlayers, benchPlayers)) {
        return {
          ...next,
          gameState: GameState.MANAGER_PICK,
          managerOptions: drawManagers(),
        };
      }
      return next;
    }

    case 'SWAP_SLOTS': {
      if (!state.formation) return state;
      const { a, b } = action;
      const starterPlayers = [...state.starterPlayers];
      const benchPlayers = [...state.benchPlayers];
      const get = (s: ActiveSlot) =>
        s.zone === 'starter' ? starterPlayers[s.index] : benchPlayers[s.index];
      const set = (s: ActiveSlot, p: Player | null) => {
        if (s.zone === 'starter') starterPlayers[s.index] = p;
        else benchPlayers[s.index] = p;
      };
      const pa = get(a);
      const pb = get(b);
      set(a, pb);
      set(b, pa);
      return {
        ...state,
        starterPlayers,
        benchPlayers,
        activeSlot: null,
        currentCards: [],
        chemPreview: computeChem(starterPlayers, state.formation, null),
        squadRating: weightedRating(starterPlayers, benchPlayers),
      };
    }

    case 'CONFIRM_SQUAD': {
      if (!isAllFilled(state.starterPlayers, state.benchPlayers)) return state;
      return {
        ...state,
        gameState: GameState.MANAGER_PICK,
        managerOptions: drawManagers(),
        activeSlot: null,
        currentCards: [],
      };
    }

    case 'PICK_MANAGER': {
      if (!state.formation) return state;
      const squad = buildSquad(
        state.formation,
        state.starterPlayers,
        state.benchPlayers,
        action.manager,
        state.teamName
      );
      return { ...state, manager: action.manager, squad, gameState: GameState.DRAFT_SCORE };
    }

    case 'CONFIRM_DRAFT_SCORE': {
      if (!state.squad) return state;
      const namedSquad: Squad = { ...state.squad, teamName: action.teamName };
      const bracket = generateBracket(namedSquad);
      const userMatchInfo = findUserMatch(bracket, 0);
      return {
        ...state,
        squad: namedSquad,
        bracket,
        teamName: action.teamName,
        currentRound: 0,
        currentMatchIndex: userMatchInfo?.matchIndex ?? 0,
        gameState: GameState.BRACKET_VIEW,
      };
    }

    case 'START_MATCH':
      return { ...state, gameState: GameState.MATCH_SIM };

    case 'SET_MATCH_RESULT': {
      if (!state.bracket || !state.squad) return state;
      const { result } = action;
      const updatedBracket = applyUserResult(
        state.bracket,
        state.currentRound,
        state.currentMatchIndex,
        result.userScore,
        result.opponentScore,
        result.userWon
      );
      return { ...state, bracket: updatedBracket, matchResult: result, gameState: GameState.POST_MATCH };
    }

    case 'CONFIRM_POST_MATCH': {
      if (!state.bracket || !state.matchResult) return state;
      const userOutcome = getUserResult(state.bracket, state.currentRound);
      if (userOutcome === 'champion') {
        return { ...state, gameState: GameState.TROPHY_SCREEN, isChampion: true };
      }
      if (userOutcome === 'eliminated') {
        const { bracket: finished, champion } = simulateToChampion(state.bracket, state.currentRound);
        return {
          ...state,
          bracket: finished,
          tournamentChampion: champion,
          gameState: GameState.TROPHY_SCREEN,
          isEliminated: true,
        };
      }
      const advanced = progressBracket(state.bracket, state.currentRound);
      const nextRound = state.currentRound + 1;
      const nextUserMatch = findUserMatch(advanced, nextRound);
      return {
        ...state,
        bracket: advanced,
        currentRound: nextRound,
        currentMatchIndex: nextUserMatch?.matchIndex ?? 0,
        matchResult: null,
        gameState: GameState.BRACKET_VIEW,
      };
    }

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDraft() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.isLoadingPool) return;
    async function loadPool() {
      try {
        const res = await fetch('/data/players.json');
        if (!res.ok) throw new Error('players.json not found');
        const base: Player[] = await res.json();
        dispatch({ type: 'SET_POOL', pool: [...base, ...LEGENDS] });
      } catch (err) {
        dispatch({
          type: 'POOL_ERROR',
          error: err instanceof Error ? err.message : 'Failed to load player data',
        });
      }
    }
    loadPool();
  }, [state.isLoadingPool]);

  const startGame = useCallback(() => dispatch({ type: 'START_GAME' }), []);
  const selectFormation = useCallback(
    (formation: Formation) => dispatch({ type: 'SELECT_FORMATION', formation }),
    []
  );
  const pickCaptain = useCallback((player: Player) => dispatch({ type: 'PICK_CAPTAIN', player }), []);
  const selectSlot = useCallback((slot: ActiveSlot) => dispatch({ type: 'SELECT_SLOT', slot }), []);
  const cancelSlot = useCallback(() => dispatch({ type: 'CANCEL_SLOT' }), []);
  const pickPlayer = useCallback((player: Player) => dispatch({ type: 'PICK_PLAYER', player }), []);
  const swapSlots = useCallback(
    (a: ActiveSlot, b: ActiveSlot) => dispatch({ type: 'SWAP_SLOTS', a, b }),
    []
  );
  const confirmSquad = useCallback(() => dispatch({ type: 'CONFIRM_SQUAD' }), []);
  const pickManager = useCallback((manager: Manager) => dispatch({ type: 'PICK_MANAGER', manager }), []);
  const startMatch = useCallback(() => dispatch({ type: 'START_MATCH' }), []);
  const confirmDraftScore = useCallback(
    (teamName: string) => dispatch({ type: 'CONFIRM_DRAFT_SCORE', teamName }),
    []
  );
  const setMatchResult = useCallback(
    (result: MatchResult) => dispatch({ type: 'SET_MATCH_RESULT', result }),
    []
  );
  const confirmPostMatch = useCallback(() => dispatch({ type: 'CONFIRM_POST_MATCH' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  /** Chem delta if a candidate is placed at the active starter slot (0 for bench). */
  const getChemPreviewForCandidate = useCallback(
    (candidate: Player): number => {
      if (!state.formation || !state.activeSlot) return state.chemPreview.total;
      if (state.activeSlot.zone !== 'starter') return state.chemPreview.total;
      const slot = state.formation.positions[state.activeSlot.index];
      const provisional: DraftedPlayer = {
        player: candidate,
        slot: slot.slot,
        slotIndex: state.activeSlot.index,
        chemistry: 0,
      };
      return previewChemistryWithCandidate(
        startersDrafted(state.starterPlayers, state.formation),
        provisional,
        state.formation,
        null
      ).total;
    },
    [state.formation, state.activeSlot, state.starterPlayers, state.chemPreview.total]
  );

  const allFilled = isAllFilled(state.starterPlayers, state.benchPlayers);

  return {
    ...state,
    allFilled,
    benchGroups: BENCH_GROUPS,
    subsCount: SUBS_COUNT,
    reservesCount: RESERVES_COUNT,
    startGame,
    selectFormation,
    pickCaptain,
    selectSlot,
    cancelSlot,
    pickPlayer,
    swapSlots,
    confirmSquad,
    pickManager,
    confirmDraftScore,
    startMatch,
    setMatchResult,
    confirmPostMatch,
    reset,
    getChemPreviewForCandidate,
  };
}
