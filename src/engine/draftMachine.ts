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
import { simulateMatch } from '@/engine/matchSimulator';
import { Rng, freshSeed } from '@/engine/rng';
import {
  SUBS_COUNT,
  RESERVES_COUNT,
  BENCH_COUNT,
  BENCH_SUB_ROLES,
  type BenchSubRole,
} from '@/constants/squadLayout';
import { countPremiumPlayers } from '@/lib/premiumCards';
import {
  DATA_VERSION,
  RUN_SCHEMA,
  newRunId,
  type PersistedRun,
} from '@/lib/persist';

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

export interface DraftState {
  gameState: GameState;
  seed: number;
  cursor: number;
  runId: string;
  formationOptions: Formation[];
  formation: Formation | null;
  draftPool: Player[];
  isLoadingPool: boolean;
  poolError: string | null;

  awaitingCaptain: boolean;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  activeSlot: ActiveSlot | null;
  currentCards: Player[];
  chemPreview: ChemistryPreview;
  squadRating: number;

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

export type Action =
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
  | { type: 'SIMULATE_MATCH' }
  | { type: 'QUICK_SIM_TO_REVIEW' }
  | { type: 'SET_MATCH_RESULT'; result: MatchResult }
  | { type: 'CONFIRM_POST_MATCH' }
  | { type: 'RESTORE'; state: DraftState }
  | { type: 'RESET' };

export const initialState: DraftState = createInitialState();

export function createInitialState(seed = 0): DraftState {
  return {
    gameState: GameState.LANDING,
    seed,
    cursor: 0,
    runId: '',
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
}

export function draftedIds(starters: (Player | null)[], bench: (Player | null)[]): Set<number> {
  const s = new Set<number>();
  for (const p of starters) if (p) s.add(p.id);
  for (const p of bench) if (p) s.add(p.id);
  return s;
}

/** Filled starters as DraftedPlayer[] (for chemistry). */
export function startersDrafted(
  starterPlayers: (Player | null)[],
  formation: Formation
): DraftedPlayer[] {
  const out: DraftedPlayer[] = [];
  starterPlayers.forEach((p, i) => {
    if (!p) return;
    const slot = formation.positions[i];
    if (!slot) return;
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

export function computeChem(
  starterPlayers: (Player | null)[],
  formation: Formation,
  manager: Manager | null
): ChemistryPreview {
  return calculateChemistry(startersDrafted(starterPlayers, formation), formation, manager);
}

/** Weighted rating: starters heavier than bench/reserves. */
export function weightedRating(
  starterPlayers: (Player | null)[],
  benchPlayers: (Player | null)[]
): number {
  let sum = 0;
  let w = 0;
  for (const p of starterPlayers) if (p) { sum += p.overall * STARTER_WEIGHT; w += STARTER_WEIGHT; }
  benchPlayers.forEach((p, i) => {
    if (!p) return;
    const wt = i < SUBS_COUNT ? SUB_WEIGHT : RESERVE_WEIGHT;
    sum += p.overall * wt;
    w += wt;
  });
  return w ? Math.round(sum / w) : 0;
}

export function isAllFilled(starterPlayers: (Player | null)[], benchPlayers: (Player | null)[]) {
  return starterPlayers.every(Boolean) && benchPlayers.every(Boolean);
}

export function buildSquad(
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
  if (cards.length === 1) return cards[0]!;
  if (slot.zone === 'starter') {
    const pos = formation.positions[slot.index];
    if (!pos) return cards[0]!;
    let best = cards[0]!;
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
function quickSimAllRemaining(state: DraftState, rng: Rng): DraftState {
  if (!state.formation || state.gameState !== GameState.DRAFT) return state;

  const starterPlayers = [...state.starterPlayers];
  const benchPlayers = [...state.benchPlayers];
  let awaitingCaptain = state.awaitingCaptain;

  if (awaitingCaptain) {
    const cards =
      state.currentCards.length > 0
        ? state.currentCards
        : drawCaptainCandidates(
            rng,
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
    if (!slot) break;
    const partial: DraftState = {
      ...state,
      starterPlayers,
      benchPlayers,
      awaitingCaptain: false,
    };
    const cards = drawForSlot(partial, slot, rng);
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
      normLeague(p.leagueName).includes(normLeague(manager.leagueName).split(' ')[0] ?? '') ||
      normLeague(manager.leagueName).includes(normLeague(p.leagueName).split(' ')[0] ?? '');
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

function drawForSlot(state: DraftState, slot: ActiveSlot, rng: Rng): Player[] {
  if (!state.formation) return [];
  const ids = draftedIds(state.starterPlayers, state.benchPlayers);
  const premiumCount = premiumDrafted(state);
  if (slot.zone === 'starter') {
    return drawCardsForSlot(
      rng,
      state.draftPool,
      state.formation,
      slot.index,
      startersDrafted(state.starterPlayers, state.formation),
      ids,
      premiumCount
    );
  }
  if (slot.index >= SUBS_COUNT) {
    return drawReserveWildcard(rng, state.draftPool, ids, premiumCount);
  }
  const role = BENCH_SUB_ROLES[slot.index];
  if (!role) return drawReserveWildcard(rng, state.draftPool, ids, premiumCount);
  return drawSubCandidates(rng, state.draftPool, role as BenchSubRole, ids, premiumCount);
}

const PERSISTABLE_PHASES = new Set<string>([
  GameState.FORMATION_PICK,
  GameState.DRAFT,
  GameState.MANAGER_PICK,
  GameState.SQUAD_REVIEW,
  GameState.DRAFT_SCORE,
]);

/** Ids-only snapshot for mid-draft resume. Null when not worth persisting. */
export function serializeRun(state: DraftState): PersistedRun | null {
  if (!state.runId || !PERSISTABLE_PHASES.has(state.gameState)) return null;

  return {
    schema: RUN_SCHEMA,
    runId: state.runId,
    createdAt: Date.now(),
    dataVersion: DATA_VERSION,
    mode: 'free',
    seed: state.seed,
    cursor: state.cursor,
    phase: state.gameState,
    difficulty: 0,
    formationName: state.formation?.name ?? null,
    formationLabel: state.formation?.label ?? null,
    managerId: state.manager?.id ?? null,
    starters: state.starterPlayers.map((p) => (p ? p.id : null)),
    bench: state.benchPlayers.map((p) => (p ? p.id : null)),
    pendingDraw: state.currentCards.length > 0 ? state.currentCards.map((p) => p.id) : null,
    awaitingCaptain: state.awaitingCaptain,
    activeSlot: state.activeSlot,
    teamName: state.teamName,
    results: [],
    coins: 0,
  };
}

/** Rebuild live state from ids. Null if any referenced id is missing. */
export function hydrateRun(
  persisted: PersistedRun,
  pool: Player[],
  formations: Formation[],
  managers: Manager[]
): DraftState | null {
  if (!PERSISTABLE_PHASES.has(persisted.phase)) return null;

  const byId = new Map(pool.map((p) => [p.id, p]));

  const resolveIds = (ids: (number | null)[]): (Player | null)[] | null => {
    const out: (Player | null)[] = [];
    for (const id of ids) {
      if (id === null) {
        out.push(null);
        continue;
      }
      const p = byId.get(id);
      if (!p) return null;
      out.push(p);
    }
    return out;
  };

  const starters = resolveIds(persisted.starters);
  const bench = resolveIds(persisted.bench);
  if (!starters || !bench) return null;

  const pendingDraw: Player[] = [];
  if (persisted.pendingDraw) {
    for (const id of persisted.pendingDraw) {
      const p = byId.get(id);
      if (!p) return null;
      pendingDraw.push(p);
    }
  }

  let formation: Formation | null = null;
  if (persisted.formationName != null) {
    formation =
      formations.find(
        (f) => f.name === persisted.formationName && f.label === persisted.formationLabel
      ) ??
      formations.find((f) => f.name === persisted.formationName) ??
      null;
    if (!formation) return null;
  }

  let manager: Manager | null = null;
  if (persisted.managerId != null) {
    manager = managers.find((m) => m.id === persisted.managerId) ?? null;
    if (!manager) return null;
  }

  // Re-derive the formation options that were shown after SET_POOL (cursor 0 → sample).
  const optRng = new Rng(persisted.seed, 0);
  const formationOptions = sampleFormations(optRng, formations);

  const managerOptions =
    persisted.phase === GameState.MANAGER_PICK ||
    persisted.phase === GameState.SQUAD_REVIEW ||
    persisted.phase === GameState.DRAFT_SCORE
      ? managers.slice(0, 5)
      : [];

  const chemPreview =
    formation && starters.some(Boolean)
      ? computeChem(starters, formation, manager)
      : { perPlayer: [], links: [], total: 0 };
  const squadRating = weightedRating(starters, bench);

  let squad: Squad | null = null;
  if (
    formation &&
    manager &&
    isAllFilled(starters, bench) &&
    (persisted.phase === GameState.SQUAD_REVIEW || persisted.phase === GameState.DRAFT_SCORE)
  ) {
    squad = buildSquad(formation, starters, bench, manager, persisted.teamName);
  }

  const gameState = persisted.phase as GameState;

  return {
    ...createInitialState(persisted.seed),
    gameState,
    seed: persisted.seed,
    cursor: persisted.cursor,
    runId: persisted.runId,
    formationOptions,
    formation,
    draftPool: pool,
    isLoadingPool: false,
    poolError: null,
    awaitingCaptain: persisted.awaitingCaptain,
    starterPlayers: starters,
    benchPlayers: bench,
    activeSlot: persisted.activeSlot,
    currentCards: pendingDraw,
    chemPreview,
    squadRating,
    managerOptions,
    manager,
    squad,
    teamName: persisted.teamName,
  };
}

export function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case 'RESTORE':
      return action.state;

    case 'SET_POOL': {
      const rng = new Rng(state.seed, state.cursor);
      const formationOptions = sampleFormations(rng, FORMATIONS);
      return {
        ...state,
        draftPool: action.pool,
        isLoadingPool: false,
        formationOptions,
        gameState: GameState.FORMATION_PICK,
        cursor: rng.cursor,
      };
    }

    case 'POOL_ERROR':
      return { ...state, isLoadingPool: false, poolError: action.error };

    case 'START_GAME':
      return {
        ...state,
        isLoadingPool: true,
        seed: freshSeed(),
        cursor: 0,
        runId: newRunId(),
        poolError: null,
      };

    case 'SELECT_FORMATION': {
      const { formation } = action;
      const rng = new Rng(state.seed, state.cursor);
      const currentCards = drawCaptainCandidates(rng, state.draftPool, new Set(), 0);
      return {
        ...state,
        formation,
        gameState: GameState.DRAFT,
        awaitingCaptain: true,
        starterPlayers: new Array(formation.positions.length).fill(null),
        benchPlayers: new Array(BENCH_COUNT).fill(null),
        activeSlot: null,
        currentCards,
        chemPreview: { perPlayer: [], links: [], total: 0 },
        squadRating: 0,
        manager: null,
        cursor: rng.cursor,
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
      const { slot } = action;
      const occupied =
        slot.zone === 'starter'
          ? state.starterPlayers[slot.index]
          : state.benchPlayers[slot.index];
      if (occupied) return state;
      const rng = new Rng(state.seed, state.cursor);
      const currentCards = drawForSlot(state, slot, rng);
      return { ...state, activeSlot: slot, currentCards, cursor: rng.cursor };
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
      set(a, pb ?? null);
      set(b, pa ?? null);
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
      const rng = new Rng(state.seed, state.cursor);
      const managerOptions = drawManagers(rng);
      return {
        ...state,
        gameState: GameState.MANAGER_PICK,
        managerOptions,
        activeSlot: null,
        currentCards: [],
        cursor: rng.cursor,
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
      const rng = new Rng(state.seed, state.cursor);
      const bracket = generateBracket(namedSquad, rng);
      const userMatchInfo = findUserMatch(bracket, 0);
      return {
        ...state,
        squad: namedSquad,
        bracket,
        teamName: action.teamName,
        currentRound: 0,
        currentMatchIndex: userMatchInfo?.matchIndex ?? 0,
        gameState: GameState.BRACKET_VIEW,
        cursor: rng.cursor,
      };
    }

    case 'START_MATCH':
      return { ...state, gameState: GameState.MATCH_SIM, matchResult: null };

    case 'SIMULATE_MATCH': {
      if (!state.bracket || !state.squad) return state;
      if (state.matchResult) return state;
      const info = findUserMatch(state.bracket, state.currentRound);
      if (!info) return state;
      const opponent = info.match.teamA.isUser ? info.match.teamB : info.match.teamA;
      const rng = new Rng(state.seed, state.cursor);
      const result = simulateMatch(rng, state.squad, opponent, state.currentRound);
      const updatedBracket = applyUserResult(
        state.bracket,
        state.currentRound,
        state.currentMatchIndex,
        result.userScore,
        result.opponentScore,
        result.userWon
      );
      return {
        ...state,
        bracket: updatedBracket,
        matchResult: result,
        cursor: rng.cursor,
      };
    }

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
      const rng = new Rng(state.seed, state.cursor);
      if (state.gameState === GameState.MANAGER_PICK) {
        const managers =
          state.managerOptions.length > 0 ? state.managerOptions : drawManagers(rng);
        const manager = pickBestManager(managers, state.starterPlayers);
        return {
          ...state,
          manager,
          managerOptions: managers,
          gameState: GameState.SQUAD_REVIEW,
          activeSlot: null,
          currentCards: [],
          chemPreview: computeChem(state.starterPlayers, state.formation, manager),
          cursor: rng.cursor,
        };
      }
      let filled = state;
      if (state.gameState === GameState.DRAFT) {
        filled = quickSimAllRemaining(state, rng);
      }
      const managers =
        filled.managerOptions.length > 0 ? filled.managerOptions : drawManagers(rng);
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
        cursor: rng.cursor,
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
        const rng = new Rng(state.seed, state.cursor);
        const { bracket: finished, champion } = simulateToChampion(
          state.bracket,
          state.currentRound,
          rng
        );
        return {
          ...state,
          bracket: finished,
          tournamentChampion: champion,
          gameState: GameState.TROPHY_SCREEN,
          isEliminated: true,
          cursor: rng.cursor,
        };
      }
      const rng = new Rng(state.seed, state.cursor);
      const advanced = progressBracket(state.bracket, state.currentRound, rng);
      const nextRound = state.currentRound + 1;
      const nextUserMatch = findUserMatch(advanced, nextRound);
      return {
        ...state,
        bracket: advanced,
        currentRound: nextRound,
        currentMatchIndex: nextUserMatch?.matchIndex ?? 0,
        matchResult: null,
        gameState: GameState.BRACKET_VIEW,
        cursor: rng.cursor,
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

export { SUBS_COUNT, RESERVES_COUNT, BENCH_COUNT };
