'use client';

import { useReducer, useCallback, useEffect, useMemo, useState } from 'react';
import { GameState, type Player, type Formation, type DraftedPlayer, type Manager, type MatchResult } from '@/types';
import { FORMATIONS } from '@/data/formations';
import { LEGENDS } from '@/data/legends';
import { MANAGERS } from '@/data/managers';
import { BENCH_DRAW_GROUPS, SUBS_COUNT, RESERVES_COUNT } from '@/constants/squadLayout';
import { withDisplayName } from '@/lib/playerNames';
import {
  loadPersistedRun,
  savePersistedRun,
  clearPersistedRun,
} from '@/lib/persist';
import {
  reducer,
  createInitialState,
  serializeRun,
  hydrateRun,
  isAllFilled,
  buildSquad,
  startersDrafted,
  type ActiveSlot,
  type DraftState,
} from '@/engine/draftMachine';
import { previewChemistryWithCandidate } from '@/engine/chemistryEngine';

// Re-export for screens that import slot types from the hook.
export type { ActiveSlot, SlotZone } from '@/engine/draftMachine';

export function useDraft() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [pendingResume, setPendingResume] = useState<DraftState | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  // Load pool when START_GAME sets isLoadingPool.
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
    void loadPool();
  }, [state.isLoadingPool]);

  // Offer resume from backup once on mount (needs pool to hydrate).
  useEffect(() => {
    if (resumeChecked) return;
    const persisted = loadPersistedRun();
    if (!persisted) {
      setResumeChecked(true);
      return;
    }
    async function tryHydrate() {
      try {
        const [baseRes, specialRes] = await Promise.all([
          fetch('/data/players.json'),
          fetch('/data/special-cards.json'),
        ]);
        if (!baseRes.ok) {
          clearPersistedRun();
          setResumeChecked(true);
          return;
        }
        const base: Player[] = await baseRes.json();
        const specials: Player[] = specialRes.ok ? await specialRes.json() : [];
        const pool = [...base, ...specials, ...LEGENDS].map(withDisplayName);
        const hydrated = hydrateRun(persisted!, pool, FORMATIONS, MANAGERS);
        if (hydrated) setPendingResume(hydrated);
        else clearPersistedRun();
      } catch {
        clearPersistedRun();
      } finally {
        setResumeChecked(true);
      }
    }
    void tryHydrate();
  }, [resumeChecked]);

  // Persist mid-run state.
  useEffect(() => {
    if (state.gameState === GameState.LANDING) return;
    if (
      state.gameState === GameState.TROPHY_SCREEN ||
      state.isChampion ||
      state.isEliminated
    ) {
      clearPersistedRun();
      return;
    }
    const snap = serializeRun(state);
    if (snap) savePersistedRun(snap);
  }, [state]);

  const startGame = useCallback(() => {
    clearPersistedRun();
    setPendingResume(null);
    dispatch({ type: 'START_GAME' });
  }, []);

  const resume = useCallback(() => {
    if (!pendingResume) return;
    dispatch({ type: 'RESTORE', state: pendingResume });
    setPendingResume(null);
  }, [pendingResume]);

  const discardResume = useCallback(() => {
    clearPersistedRun();
    setPendingResume(null);
  }, []);

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
  const simulateMatch = useCallback(() => dispatch({ type: 'SIMULATE_MATCH' }), []);
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
  const reset = useCallback(() => {
    clearPersistedRun();
    setPendingResume(null);
    dispatch({ type: 'RESET' });
  }, []);

  const getChemPreviewForCandidate = useCallback(
    (candidate: Player): number => {
      if (!state.formation || !state.activeSlot) return state.chemPreview.total;
      if (state.activeSlot.zone !== 'starter') return state.chemPreview.total;
      const slot = state.formation.positions[state.activeSlot.index];
      if (!slot) return state.chemPreview.total;
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
    hasResume: pendingResume !== null,
    resumeChecked,
    startGame,
    resume,
    discardResume,
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
    simulateMatch,
    quickSimToReview,
    setMatchResult,
    confirmPostMatch,
    reset,
    getChemPreviewForCandidate,
  };
}
