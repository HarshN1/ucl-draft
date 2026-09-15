import type { Squad, SquadSnapshot, Player, DraftedPlayer, Formation } from '@/types';
import { FORMATIONS } from '@/data/formations';
import { BENCH_COUNT } from '@/constants/squadLayout';

const DEFAULT_TEAM = 'FK Bodø/Glimt';

function compactPlayer(p: Player): Player {
  return {
    id: p.id,
    name: p.name,
    overall: p.overall,
    position: p.position,
    pac: p.pac,
    sho: p.sho,
    pas: p.pas,
    dri: p.dri,
    def: p.def,
    phy: p.phy,
    clubId: p.clubId,
    clubName: p.clubName,
    leagueName: p.leagueName,
    nationalityId: p.nationalityId,
    nationalityName: p.nationalityName,
    imageUrl: p.imageUrl,
    badgeUrl: p.badgeUrl,
    flagUrl: p.flagUrl,
    isLegend: p.isLegend,
    cardType: p.cardType,
    cardVersion: p.cardVersion,
    promoLabel: p.promoLabel,
    rareType: p.rareType,
    resourceId: p.resourceId,
    basePlayerId: p.basePlayerId,
  };
}

function compactSlot(dp: DraftedPlayer): SquadSnapshot['starters'][0] {
  return {
    slot: dp.slot,
    slotIndex: dp.slotIndex,
    player: compactPlayer(dp.player),
  };
}

/** Build a serializable snapshot from a live squad. */
export function squadToSnapshot(squad: Squad): SquadSnapshot {
  return {
    formationName: squad.formation.name,
    teamName: squad.teamName || DEFAULT_TEAM,
    ovrAvg: squad.ovrAvg,
    chemistry: squad.chemistry,
    draftScore: squad.draftScore,
    manager: squad.manager
      ? { id: squad.manager.id, name: squad.manager.name, nationalityName: squad.manager.nationalityName }
      : null,
    starters: squad.starters.map(compactSlot),
    subs: squad.subs.map(compactSlot),
    reserves: squad.reserves.map(compactSlot),
  };
}

function findFormation(name: string): Formation | null {
  return FORMATIONS.find((f) => f.name === name) ?? FORMATIONS[0] ?? null;
}

/** Reconstruct a viewable Squad from a snapshot (for shared / leaderboard views). */
export function snapshotToSquad(snapshot: SquadSnapshot): Squad | null {
  const formation = findFormation(snapshot.formationName);
  if (!formation) return null;

  const toDrafted = (rows: SquadSnapshot['starters']): DraftedPlayer[] =>
    rows.map((r) => ({
      player: r.player,
      slot: r.slot,
      slotIndex: r.slotIndex,
      chemistry: 0,
    }));

  return {
    formation,
    starters: toDrafted(snapshot.starters),
    subs: toDrafted(snapshot.subs),
    reserves: toDrafted(snapshot.reserves),
    manager: snapshot.manager
      ? {
          id: snapshot.manager.id,
          name: snapshot.manager.name,
          nationalityName: snapshot.manager.nationalityName,
          nationalityId: 0,
          leagueName: '',
        }
      : null,
    teamName: snapshot.teamName,
    ovrAvg: snapshot.ovrAvg,
    chemistry: snapshot.chemistry,
    draftScore: snapshot.draftScore,
  };
}

function toBase64Url(json: string): string {
  if (typeof btoa === 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  if (typeof atob === 'undefined') {
    return Buffer.from(padded + pad, 'base64').toString('utf8');
  }
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSquadParam(snapshot: SquadSnapshot): string {
  return toBase64Url(JSON.stringify(snapshot));
}

export function decodeSquadParam(param: string): SquadSnapshot | null {
  try {
    const json = fromBase64Url(param);
    const data = JSON.parse(json) as SquadSnapshot;
    if (!data?.starters?.length || !data.formationName) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildShareUrl(snapshot: SquadSnapshot, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const param = encodeSquadParam(snapshot);
  return `${base}/?s=${param}`;
}

export function normalizeTeamName(input: string): string {
  const trimmed = input.trim();
  return trimmed || DEFAULT_TEAM;
}

/** Map a saved squad back to the board arrays SquadBoard expects. */
export function squadToBoardArrays(squad: Squad): {
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
} {
  const starterPlayers: (Player | null)[] = new Array(squad.formation.positions.length).fill(null);
  for (const dp of squad.starters) {
    if (dp.slotIndex >= 0 && dp.slotIndex < starterPlayers.length) {
      starterPlayers[dp.slotIndex] = dp.player;
    }
  }
  const benchPlayers: (Player | null)[] = new Array(BENCH_COUNT).fill(null);
  for (const dp of [...squad.subs, ...squad.reserves]) {
    if (dp.slotIndex >= 0 && dp.slotIndex < BENCH_COUNT) {
      benchPlayers[dp.slotIndex] = dp.player;
    }
  }
  return { starterPlayers, benchPlayers };
}
