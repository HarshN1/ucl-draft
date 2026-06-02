'use client';

import { useReducer, useCallback, useEffect } from 'react';
import {
  GameState,
  type Player,
  type Formation,
  type DraftedPlayer,
  type Squad,
  type BracketRound,
  type MatchResult,
  type ChemistryPreview,
} from '@/types';
import { FORMATIONS } from '@/data/formations';
import {
  drawFiveCards,
  drawCaptainCandidates,
  drawSubCandidates,
  sampleFormations,
  computeOvrAvg,
  findBestSlotForCaptain,
} from '@/engine/playerUtils';
import { calculateChemistry, previewChemistryWithCandidate } from '@/engine/chemistryEngine';
import {
  generateBracket,
  applyUserResult,
  progressBracket,
  findUserMatch,
  getUserResult,
} from '@/engine/bracketEngine';

// ─── State ────────────────────────────────────────────────────────────────────

interface DraftState {
  gameState: GameState;
  formationOptions: Formation[];
  formation: Formation | null;
  draftPool: Player[];
  isLoadingPool: boolean;
  poolError: string | null;
  currentPickIndex: number;      // which pick # we're on (0–10)
  pendingSlotIndices: number[];  // formation slot indices still to be filled
  draftedStarters: DraftedPlayer[];
  draftedSubs: DraftedPlayer[];
  currentCards: Player[];
  chemPreview: ChemistryPreview;
  squad: Squad | null;
  bracket: BracketRound[] | null;
  currentRound: number;
  currentMatchIndex: number;
  matchResult: MatchResult | null;
  isChampion: boolean;
  isEliminated: boolean;
  teamName: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_POOL'; pool: Player[] }
  | { type: 'POOL_ERROR'; error: string }
  | { type: 'START_GAME' }
  | { type: 'SELECT_FORMATION'; formation: Formation }
  | { type: 'PICK_STARTER'; player: Player }
  | { type: 'PICK_SUB'; player: Player }
  | { type: 'CONFIRM_DRAFT_SCORE'; teamName: string }
  | { type: 'START_MATCH' }
  | { type: 'SET_MATCH_RESULT'; result: MatchResult }
  | { type: 'CONFIRM_POST_MATCH' }
  | { type: 'RESET' };

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: DraftState = {
  gameState: GameState.LANDING,
  formationOptions: [],
  formation: null,
  draftPool: [],
  isLoadingPool: false,
  poolError: null,
  currentPickIndex: 0,
  pendingSlotIndices: [],
  draftedStarters: [],
  draftedSubs: [],
  currentCards: [],
  chemPreview: { perPlayer: [], total: 0 },
  squad: null,
  bracket: null,
  currentRound: 0,
  currentMatchIndex: 0,
  matchResult: null,
  isChampion: false,
  isEliminated: false,
  teamName: 'My Team',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDraftedIds(starters: DraftedPlayer[], subs: DraftedPlayer[]): Set<number> {
  return new Set([...starters, ...subs].map((d) => d.player.id));
}

function buildSquad(
  formation: Formation,
  starters: DraftedPlayer[],
  subs: DraftedPlayer[],
  teamName: string
): Squad {
  const ovrAvg = computeOvrAvg(starters.map((d) => d.player));
  const { total: chemistry } = calculateChemistry(starters, formation);
  return {
    formation,
    starters,
    subs,
    teamName,
    ovrAvg,
    chemistry,
    draftScore: ovrAvg + chemistry,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case 'SET_POOL': {
      const formationOptions = sampleFormations(FORMATIONS);
      return {
        ...state,
        draftPool: action.pool,
        isLoadingPool: false,
        formationOptions,
        gameState: GameState.FORMATION_PICK,
      };
    }

    case 'POOL_ERROR':
      return { ...state, isLoadingPool: false, poolError: action.error };

    case 'START_GAME':
      return { ...state, isLoadingPool: true };

    case 'SELECT_FORMATION': {
      const { formation } = action;
      // All 11 slot indices pending; captain pick is first (index 0 in pick order,
      // but will be assigned to a slot matching the picked player's position)
      const allSlots = formation.positions.map((_, i) => i);
      const captainCards = drawCaptainCandidates(state.draftPool, new Set());
      return {
        ...state,
        formation,
        gameState: GameState.DRAFT,
        currentPickIndex: 0,
        pendingSlotIndices: allSlots,
        draftedStarters: [],
        draftedSubs: [],
        currentCards: captainCards,
        chemPreview: { perPlayer: [], total: 0 },
      };
    }

    case 'PICK_STARTER': {
      if (!state.formation) return state;

      const isCaptainPick = state.currentPickIndex === 0;
      let slotIndex: number;
      let remaining: number[];

      if (isCaptainPick) {
        // Place captain in their best-matching formation slot
        slotIndex = findBestSlotForCaptain(action.player.position, state.formation);
        remaining = state.pendingSlotIndices.filter((i) => i !== slotIndex);
      } else {
        // Take the next pending slot in order
        slotIndex = state.pendingSlotIndices[0];
        remaining = state.pendingSlotIndices.slice(1);
      }

      const formationSlot = state.formation.positions[slotIndex];
      const drafted: DraftedPlayer = {
        player: action.player,
        slot: formationSlot.slot,
        slotIndex,
        chemistry: 1,
      };

      // Insert into starters array sorted by slotIndex so formation order is preserved
      const newStarters = [...state.draftedStarters, drafted].sort(
        (a, b) => a.slotIndex - b.slotIndex
      );

      // Recalculate chemistry
      const chemPreview = calculateChemistry(newStarters, state.formation);
      const startersWithChem: DraftedPlayer[] = newStarters.map((dp, i) => ({
        ...dp,
        chemistry: chemPreview.perPlayer[i] ?? 1,
      }));

      const nextPickIndex = state.currentPickIndex + 1;

      if (remaining.length === 0) {
        // All 11 starters drafted → move to subs
        const draftedIds = getDraftedIds(startersWithChem, []);
        const subCards = drawSubCandidates(state.draftPool, 'CM', draftedIds);
        return {
          ...state,
          draftedStarters: startersWithChem,
          pendingSlotIndices: [],
          chemPreview,
          gameState: GameState.SUB_DRAFT,
          currentPickIndex: 0,
          currentCards: subCards,
        };
      }

      // Draw next 5 cards for the next pending slot
      const nextSlotIndex = remaining[0];
      const nextSlot = state.formation.positions[nextSlotIndex];
      const draftedIds = getDraftedIds(startersWithChem, []);
      const nextCards = drawFiveCards(state.draftPool, nextSlot.positionGroup, draftedIds);

      return {
        ...state,
        draftedStarters: startersWithChem,
        pendingSlotIndices: remaining,
        currentPickIndex: nextPickIndex,
        currentCards: nextCards,
        chemPreview,
      };
    }

    case 'PICK_SUB': {
      if (!state.formation) return state;

      const drafted: DraftedPlayer = {
        player: action.player,
        slot: 'SUB',
        slotIndex: state.currentPickIndex,
        chemistry: 0,
      };
      const newSubs = [...state.draftedSubs, drafted];
      const nextIndex = state.currentPickIndex + 1;

      if (nextIndex >= 5) {
        // All subs drafted
        const squad = buildSquad(
          state.formation,
          state.draftedStarters,
          newSubs,
          state.teamName
        );
        return {
          ...state,
          draftedSubs: newSubs,
          gameState: GameState.DRAFT_SCORE,
          squad,
          currentPickIndex: nextIndex,
        };
      }

      // Draw next sub cards
      const draftedIds = getDraftedIds(state.draftedStarters, newSubs);
      const positionGroup = state.formation.positions[Math.min(nextIndex, state.formation.positions.length - 1)].positionGroup;
      const nextCards = drawSubCandidates(state.draftPool, positionGroup, draftedIds);

      return {
        ...state,
        draftedSubs: newSubs,
        currentPickIndex: nextIndex,
        currentCards: nextCards,
      };
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

      // Apply user result to bracket
      const updatedBracket = applyUserResult(
        state.bracket,
        state.currentRound,
        state.currentMatchIndex,
        result.userScore,
        result.opponentScore
      );

      return {
        ...state,
        bracket: updatedBracket,
        matchResult: result,
        gameState: GameState.POST_MATCH,
      };
    }

    case 'CONFIRM_POST_MATCH': {
      if (!state.bracket || !state.matchResult) return state;

      const userOutcome = getUserResult(state.bracket, state.currentRound);

      if (userOutcome === 'champion') {
        return { ...state, gameState: GameState.TROPHY_SCREEN, isChampion: true };
      }

      if (userOutcome === 'eliminated') {
        return { ...state, gameState: GameState.TROPHY_SCREEN, isEliminated: true };
      }

      // Progress bracket (simulate AI matches, populate next round)
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

  // Load player pool when START_GAME is dispatched
  useEffect(() => {
    if (!state.isLoadingPool) return;

    async function loadPool() {
      try {
        const res = await fetch('/data/players.json');
        if (!res.ok) throw new Error('players.json not found');
        const pool: Player[] = await res.json();
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

  const pickStarter = useCallback(
    (player: Player) => dispatch({ type: 'PICK_STARTER', player }),
    []
  );

  const pickSub = useCallback(
    (player: Player) => dispatch({ type: 'PICK_SUB', player }),
    []
  );

  const startMatch = useCallback(() => dispatch({ type: 'START_MATCH' }), []);

  const confirmDraftScore = useCallback(
    (teamName: string) => dispatch({ type: 'CONFIRM_DRAFT_SCORE', teamName }),
    []
  );

  const setMatchResult = useCallback(
    (result: MatchResult) => dispatch({ type: 'SET_MATCH_RESULT', result }),
    []
  );

  const confirmPostMatch = useCallback(
    () => dispatch({ type: 'CONFIRM_POST_MATCH' }),
    []
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  /** Preview chemistry if candidate were picked at next pending slot */
  const getChemPreviewForCandidate = useCallback(
    (candidate: Player): number => {
      if (!state.formation) return 0;
      const isCaptain = state.currentPickIndex === 0;
      const slotIndex = isCaptain
        ? findBestSlotForCaptain(candidate.position, state.formation)
        : (state.pendingSlotIndices[0] ?? 0);
      const slot = state.formation.positions[slotIndex];
      if (!slot) return 0;
      const provisional: DraftedPlayer = {
        player: candidate,
        slot: slot.slot,
        slotIndex,
        chemistry: 1,
      };
      const preview = previewChemistryWithCandidate(
        state.draftedStarters,
        provisional,
        state.formation
      );
      return preview.total;
    },
    [state.formation, state.currentPickIndex, state.pendingSlotIndices, state.draftedStarters]
  );

  return {
    ...state,
    startGame,
    selectFormation,
    pickStarter,
    pickSub,
    confirmDraftScore,
    startMatch,
    setMatchResult,
    confirmPostMatch,
    reset,
    getChemPreviewForCandidate,
  };
}
