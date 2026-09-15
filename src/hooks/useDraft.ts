'use client';

import { useReducer, useCallback, useEffect, useMemo } from 'react';
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
import {
  SUBS_COUNT,
  RESERVES_COUNT,
  BENCH_COUNT,
  BENCH_DRAW_GROUPS,
  BENCH_SUB_ROLES,
  type BenchSubRole,
} from '@/constants/squadLayout';
import { countPremiumPlayers } from '@/lib/premiumCards';
import { withDisplayName } from '@/lib/playerNames';

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
  | { type: 'FINISH_SQUAD_REVIEW' }
  | { type: 'CONFIRM_DRAFT_SCORE'; teamName: string }
  | { type: 'START_MATCH' }
  | { type: 'QUICK_SIM_TO_REVIEW' }
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

function pickBestFromCards(
  cards: Player[],
  slot: ActiveSlot,
  formation: Formation,
  starterPlayers: (Player | null)[],
  manager: Manager | null
): Player {
  if (cards.length === 1) return cards[0];
  if (slot.zone === 'starter') {
    const pos = formation.positions[slot.index];
    let best = cards[0];
    let bestChem = -1;
    const drafted = startersDrafted(starterPlayers, formation);
    for (const p of cards) {
      const provisional: DraftedPlayer = {
        player: p,
        slot: pos.slot,
        slotIndex: slot.index,
        chemistry: 0,
      };
      const preview = previewChemistryWithCandidate(drafted, provisional, formation, manager);
      if (
        preview.total > bestChem ||
        (preview.total === bestChem && p.overall > best.overall)
      ) {
        bestChem = preview.total;
        best = p;
      }
    }
    return best;
  }
  return cards.reduce((a, b) => (a.overall >= b.overall ? a : b));
}

function emptySlots(
  formation: Formation,
  starterPlayers: (Player | null)[],
  benchPlayers: (Player | null)[]
): ActiveSlot[] {
  const out: ActiveSlot[] = [];
  for (let i = 0; i < formation.positions.length; i++) {
    if (!starterPlayers[i]) out.push({ zone: 'starter', index: i });
  }
  for (let i = 0; i < benchPlayers.length; i++) {
    if (!benchPlayers[i]) out.push({ zone: 'bench', index: i });
  }
  return out;
}

/** Auto-fill every remaining draft slot (FIFA quick-sim through the board). */
function quickSimAllRemaining(state: DraftState): DraftState {
  if (!state.formation || state.gameState !== GameState.DRAFT) return state;

  const starterPlayers = [...state.starterPlayers];
  const benchPlayers = [...state.benchPlayers];
  let awaitingCaptain = state.awaitingCaptain;

  if (awaitingCaptain) {
    const cards =
      state.currentCards.length > 0
        ? state.currentCards
        : drawCaptainCandidates(
            state.draftPool,
            draftedIds(starterPlayers, benchPlayers),
            countPremiumPlayers([...starterPlayers, ...benchPlayers])
          );
    if (!cards.length) return state;
    const best = cards.reduce((a, b) => (a.overall >= b.overall ? a : b));
    const slotIndex = findBestSlotForCaptain(best.position, state.formation);
    starterPlayers[slotIndex] = best;
    awaitingCaptain = false;
  }

  let slots = emptySlots(state.formation, starterPlayers, benchPlayers);
  while (slots.length > 0) {
    const slot = slots[0];
    const partial: DraftState = {
      ...state,
      starterPlayers,
      benchPlayers,
      awaitingCaptain: false,
    };
    const cards = drawForSlot(partial, slot);
    if (!cards.length) break;
    const pick = pickBestFromCards(
      cards,
      slot,
      state.formation,
      starterPlayers,
      state.manager
    );
    if (slot.zone === 'starter') starterPlayers[slot.index] = pick;
    else benchPlayers[slot.index] = pick;
    slots = emptySlots(state.formation, starterPlayers, benchPlayers);
  }

  return {
    ...state,
    awaitingCaptain: false,
    starterPlayers,
    benchPlayers,
    activeSlot: null,
    currentCards: [],
    chemPreview: computeChem(starterPlayers, state.formation, state.manager),
    squadRating: weightedRating(starterPlayers, benchPlayers),
  };
}

function managerChemBoost(manager: Manager, starters: (Player | null)[]): number {
  const normLeague = (s: string) => (s || '').toLowerCase();
  let n = 0;
  for (const p of starters) {
    if (!p) continue;
    const sameNation =
      p.nationalityName.toLowerCase() === manager.nationalityName.toLowerCase();
    const sameLeague =
      normLeague(p.leagueName).includes(normLeague(manager.leagueName).split(' ')[0]) ||
      normLeague(manager.leagueName).includes(normLeague(p.leagueName).split(' ')[0]);
    if (sameNation || sameLeague) n++;
  }
  return n;
}

function pickBestManager(managers: Manager[], starters: (Player | null)[]): Manager {
  return managers.reduce((best, m) =>
    managerChemBoost(m, starters) > managerChemBoost(best, starters) ? m : best
  );
}

function premiumDrafted(state: DraftState): number {
  return countPremiumPlayers([...state.starterPlayers, ...state.benchPlayers]);
}

function drawForSlot(state: DraftState, slot: ActiveSlot): Player[] {
  if (!state.formation) return [];
  const ids = draftedIds(state.starterPlayers, state.benchPlayers);
  const premiumCount = premiumDrafted(state);
  if (slot.zone === 'starter') {
    return drawCardsForSlot(
      state.draftPool,
      state.formation,
      slot.index,
      startersDrafted(state.starterPlayers, state.formation),
      ids,
      premiumCount
    );
  }
  // Reserves are wildcards; subs follow FIFA order (GK, 2×DEF, 2×MID, 2×ATT).
  if (slot.index >= SUBS_COUNT) {
    return drawReserveWildcard(state.draftPool, ids, premiumCount);
  }
  const role = BENCH_SUB_ROLES[slot.index];
  if (!role) return drawReserveWildcard(state.draftPool, ids, premiumCount);
  return drawSubCandidates(state.draftPool, role as BenchSubRole, ids, premiumCount);
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
        currentCards: drawCaptainCandidates(state.draftPool, new Set(), 0),
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
        chemPreview: computeChem(starterPlayers, state.formation, state.manager),
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
      return {
        ...state,
        manager: action.manager,
        gameState: GameState.SQUAD_REVIEW,
        activeSlot: null,
        currentCards: [],
        chemPreview: computeChem(state.starterPlayers, state.formation, action.manager),
        squadRating: weightedRating(state.starterPlayers, state.benchPlayers),
      };
    }

    case 'FINISH_SQUAD_REVIEW': {
      if (!state.formation || !state.manager) return state;
      const squad = buildSquad(
        state.formation,
        state.starterPlayers,
        state.benchPlayers,
        state.manager,
        state.teamName
      );
      return { ...state, squad, gameState: GameState.DRAFT_SCORE };
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

    case 'QUICK_SIM_TO_REVIEW': {
      if (!state.formation) return state;
      if (state.gameState === GameState.SQUAD_REVIEW) {
        if (!state.manager) return state;
        const squad = buildSquad(
          state.formation,
          state.starterPlayers,
          state.benchPlayers,
          state.manager,
          state.teamName
        );
        return { ...state, squad, gameState: GameState.DRAFT_SCORE };
      }
      if (state.gameState === GameState.MANAGER_PICK) {
        const managers =
          state.managerOptions.length > 0 ? state.managerOptions : drawManagers();
        const manager = pickBestManager(managers, state.starterPlayers);
        return {
          ...state,
          manager,
          gameState: GameState.SQUAD_REVIEW,
          activeSlot: null,
          currentCards: [],
          chemPreview: computeChem(state.starterPlayers, state.formation, manager),
        };
      }
      let filled = state;
      if (state.gameState === GameState.DRAFT) {
        filled = quickSimAllRemaining(state);
      }
      const managers =
        filled.managerOptions.length > 0 ? filled.managerOptions : drawManagers();
      const manager = pickBestManager(managers, filled.starterPlayers);
      return {
        ...filled,
        manager,
        managerOptions: managers,
        gameState: GameState.SQUAD_REVIEW,
        activeSlot: null,
        currentCards: [],
        chemPreview: computeChem(filled.starterPlayers, state.formation, manager),
        squadRating: weightedRating(filled.starterPlayers, filled.benchPlayers),
      };
    }

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
        const [baseRes, specialRes] = await Promise.all([
          fetch('/data/players.json'),
          fetch('/data/special-cards.json'),
        ]);
        if (!baseRes.ok) throw new Error('players.json not found');
        const base: Player[] = await baseRes.json();
        let specials: Player[] = [];
        if (specialRes.ok) {
          specials = await specialRes.json();
        }
        const pool = [...base, ...specials, ...LEGENDS].map(withDisplayName);
        dispatch({ type: 'SET_POOL', pool });
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
  const finishSquadReview = useCallback(() => dispatch({ type: 'FINISH_SQUAD_REVIEW' }), []);
  const startMatch = useCallback(() => dispatch({ type: 'START_MATCH' }), []);
  const quickSimToReview = useCallback(() => dispatch({ type: 'QUICK_SIM_TO_REVIEW' }), []);
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

  const previewSquad = useMemo(() => {
    if (!state.formation || !state.manager || !allFilled) return null;
    return buildSquad(
      state.formation,
      state.starterPlayers,
      state.benchPlayers,
      state.manager,
      state.teamName
    );
  }, [
    state.formation,
    state.manager,
    state.starterPlayers,
    state.benchPlayers,
    state.teamName,
    allFilled,
  ]);

  return {
    ...state,
    allFilled,
    previewSquad,
    benchGroups: BENCH_DRAW_GROUPS,
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
    finishSquadReview,
    confirmDraftScore,
    startMatch,
    quickSimToReview,
    setMatchResult,
    confirmPostMatch,
    reset,
    getChemPreviewForCandidate,
  };
}
