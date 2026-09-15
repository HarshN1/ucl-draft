import { describe, expect, it } from 'vitest';
import { GameState } from '@/types';
import { FORMATIONS } from '@/data/formations';
import { TEST_POOL, makePlayer } from './fixtures/players';
import {
  reducer,
  createInitialState,
  serializeRun,
  hydrateRun,
} from '@/engine/draftMachine';
import { MANAGERS } from '@/data/managers';

describe('draftMachine determinism', () => {
  it('same seed → identical formation options and captain draw', () => {
    const seed = 424242;

    const runA = () => {
      let s = createInitialState(seed);
      s = reducer(s, { type: 'START_GAME' });
      // Force the same seed after START_GAME's freshSeed
      s = { ...s, seed, cursor: 0, runId: 'a' };
      s = reducer(s, { type: 'SET_POOL', pool: TEST_POOL });
      const formations = s.formationOptions.map((f) => `${f.name}|${f.label}`);
      const formation = s.formationOptions[0]!;
      s = reducer(s, { type: 'SELECT_FORMATION', formation });
      const captains = s.currentCards.map((p) => p.id);
      return { formations, captains, cursor: s.cursor };
    };

    const a = runA();
    const b = runA();
    expect(a.formations).toEqual(b.formations);
    expect(a.captains).toEqual(b.captains);
    expect(a.cursor).toBe(b.cursor);
  });

  it('plays a full draft headlessly via quick sim (no React)', () => {
    const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];
    const bigPool = Array.from({ length: 80 }, (_, i) =>
      makePlayer({
        id: 10_000 + i,
        position: positions[i % positions.length]!,
        overall: 78 + (i % 15),
        clubName: `Club ${i % 12}`,
        leagueName: `League ${i % 6}`,
        nationalityName: `Nation ${i % 8}`,
      })
    );

    let s = createInitialState(99);
    s = { ...s, seed: 99, cursor: 0, runId: 'headless' };
    s = reducer(s, { type: 'SET_POOL', pool: bigPool });
    expect(s.gameState).toBe(GameState.FORMATION_PICK);
    expect(s.formationOptions.length).toBe(5);

    s = reducer(s, { type: 'SELECT_FORMATION', formation: s.formationOptions[0]! });
    expect(s.gameState).toBe(GameState.DRAFT);

    s = reducer(s, { type: 'QUICK_SIM_TO_REVIEW' });
    expect(s.gameState).toBe(GameState.SQUAD_REVIEW);
    expect(s.manager).not.toBeNull();
    expect(s.starterPlayers.every(Boolean)).toBe(true);
    expect(s.benchPlayers.every(Boolean)).toBe(true);
  });

  it('serialize → hydrate round-trips mid-draft picks', () => {
    let s = createInitialState(7);
    s = { ...s, seed: 7, cursor: 0, runId: 'roundtrip' };
    s = reducer(s, { type: 'SET_POOL', pool: TEST_POOL });
    s = reducer(s, { type: 'SELECT_FORMATION', formation: s.formationOptions[1]! });
    const captain = s.currentCards[0]!;
    s = reducer(s, { type: 'PICK_CAPTAIN', player: captain });

    const snap = serializeRun(s);
    expect(snap).not.toBeNull();
    const restored = hydrateRun(snap!, TEST_POOL, FORMATIONS, MANAGERS);
    expect(restored).not.toBeNull();
    expect(restored!.seed).toBe(7);
    expect(restored!.cursor).toBe(s.cursor);
    expect(restored!.awaitingCaptain).toBe(false);
    expect(restored!.starterPlayers.filter(Boolean).map((p) => p!.id)).toEqual(
      s.starterPlayers.filter(Boolean).map((p) => p!.id)
    );
  });
});
