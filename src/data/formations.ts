import type { Formation, FormationPosition } from '@/types';

// Coordinates: x = 0 (left) → 100 (right), y = 0 (GK end) → 100 (forward end).
//
// Every formation carries an explicit FIFA-accurate chemistry link map (`links`),
// keyed by slot name. The chemistry engine and the pitch SVG both read these
// links directly, so the on-pitch web exactly matches FIFA 16 Ultimate Team.

type Pos = Record<string, [number, number]>;
type Links = Record<string, string[]>;
interface Def {
  name: string;
  label: string;
  pos: Pos;
  links: Links;
}

/** Derive the pool-filtering position group from a slot name. */
function groupOf(slot: string): string {
  if (slot === 'GK') return 'GK';
  if (slot === 'LB' || slot === 'RB' || slot === 'LWB' || slot === 'RWB') return 'FB';
  if (slot.endsWith('CB')) return 'CB';
  if (slot.endsWith('CDM')) return 'CDM';
  if (slot.endsWith('CAM')) return 'CAM';
  if (slot.endsWith('CM')) return 'CM';
  if (slot === 'LM' || slot === 'RM' || slot === 'LW' || slot === 'RW') return 'WG';
  if (slot === 'CF' || slot === 'LF' || slot === 'RF') return 'ST';
  if (slot === 'ST' || slot.endsWith('S')) return 'ST'; // LS, RS, ST
  return 'CM';
}

// Shared coordinate templates ─────────────────────────────────────────────────
const GK: Pos = { GK: [50, 6] };
const BACK4: Pos = { LB: [15, 22], LCB: [37, 21], RCB: [63, 21], RB: [85, 22] };
const BACK3: Pos = { LCB: [28, 21], CB: [50, 19], RCB: [72, 21] };
const BACK5: Pos = { LWB: [8, 30], LCB: [28, 20], CB: [50, 18], RCB: [72, 20], RWB: [92, 30] };

const DEFS: Def[] = [
  // ── 3-back ──────────────────────────────────────────────────────────────────
  {
    name: '3-4-1-2', label: 'Wide Diamond',
    pos: { ...GK, ...BACK3, LM: [12, 55], LCM: [36, 55], RCM: [64, 55], RM: [88, 55], CAM: [50, 68], LS: [37, 86], RS: [63, 86] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LCB: ['GK', 'CB', 'LM', 'LCM'], CB: ['GK', 'LCB', 'RCB', 'LCM', 'RCM'], RCB: ['GK', 'CB', 'RM', 'RCM'],
      LM: ['LCB', 'LCM', 'CAM', 'LS'], LCM: ['LCB', 'CB', 'LM', 'RCM', 'CAM'], RCM: ['RCB', 'CB', 'RM', 'LCM', 'CAM'], RM: ['RCB', 'RCM', 'CAM', 'RS'],
      CAM: ['LM', 'LCM', 'RCM', 'RM', 'LS', 'RS'], LS: ['LM', 'CAM', 'RS'], RS: ['RM', 'CAM', 'LS'],
    },
  },
  {
    name: '3-4-2-1', label: 'Shadow Strikers',
    pos: { ...GK, ...BACK3, LM: [12, 55], LCM: [36, 55], RCM: [64, 55], RM: [88, 55], LF: [34, 71], RF: [66, 71], ST: [50, 88] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LCB: ['GK', 'CB', 'LM', 'LCM'], CB: ['GK', 'LCB', 'RCB', 'LCM', 'RCM'], RCB: ['GK', 'CB', 'RM', 'RCM'],
      LM: ['LCB', 'LCM', 'LF'], LCM: ['LCB', 'CB', 'LM', 'RCM', 'LF', 'RF'], RCM: ['RCB', 'CB', 'RM', 'LCM', 'LF', 'RF'], RM: ['RCB', 'RCM', 'RF'],
      LF: ['LM', 'LCM', 'RCM', 'ST'], RF: ['RM', 'RCM', 'LCM', 'ST'], ST: ['LF', 'RF'],
    },
  },
  {
    name: '3-4-3', label: 'Attacking',
    pos: { ...GK, ...BACK3, LM: [12, 54], LCM: [38, 54], RCM: [62, 54], RM: [88, 54], LW: [16, 84], ST: [50, 88], RW: [84, 84] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LCB: ['GK', 'CB', 'LM', 'LCM'], CB: ['GK', 'LCB', 'RCB', 'LCM', 'RCM'], RCB: ['GK', 'CB', 'RM', 'RCM'],
      LM: ['LCB', 'LCM', 'LW'], LCM: ['LCB', 'CB', 'LM', 'RCM'], RCM: ['RCB', 'CB', 'RM', 'LCM'], RM: ['RCB', 'RCM', 'RW'],
      LW: ['LM', 'ST'], ST: ['LCM', 'RCM', 'LW', 'RW'], RW: ['RM', 'ST'],
    },
  },
  {
    name: '3-5-2', label: 'Wing Play',
    pos: { ...GK, ...BACK3, LCDM: [35, 42], RCDM: [65, 42], LM: [10, 56], RM: [90, 56], CAM: [50, 66], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LCB: ['GK', 'CB', 'LCDM', 'LM'], CB: ['GK', 'LCB', 'RCB', 'LCDM', 'RCDM'], RCB: ['GK', 'CB', 'RCDM', 'RM'],
      LCDM: ['LCB', 'CB', 'RCDM', 'LM', 'CAM'], RCDM: ['RCB', 'CB', 'LCDM', 'RM', 'CAM'], LM: ['LCB', 'LCDM', 'LS'], RM: ['RCB', 'RCDM', 'RS'],
      CAM: ['LCDM', 'RCDM', 'LS', 'RS'], LS: ['LM', 'CAM', 'RS'], RS: ['RM', 'CAM', 'LS'],
    },
  },

  // ── 4-back ──────────────────────────────────────────────────────────────────
  {
    name: '4-1-2-1-2', label: 'Wide Diamond',
    pos: { ...GK, ...BACK4, CDM: [50, 40], LM: [14, 56], RM: [86, 56], CAM: [50, 68], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'CDM'], RCB: ['GK', 'LCB', 'RB', 'CDM'], RB: ['RCB', 'RM'],
      CDM: ['LCB', 'RCB', 'LM', 'RM', 'CAM'], LM: ['LB', 'CDM', 'CAM', 'LS'], RM: ['RB', 'CDM', 'CAM', 'RS'],
      CAM: ['CDM', 'LM', 'RM', 'LS', 'RS'], LS: ['LM', 'CAM', 'RS'], RS: ['RM', 'CAM', 'LS'],
    },
  },
  {
    name: '4-1-2-1-2', label: 'Narrow Diamond',
    pos: { ...GK, ...BACK4, CDM: [50, 40], LCM: [34, 56], RCM: [66, 56], CAM: [50, 68], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'CDM'], RCB: ['GK', 'LCB', 'RB', 'CDM'], RB: ['RCB', 'RCM'],
      CDM: ['LCB', 'RCB', 'LCM', 'RCM', 'CAM'], LCM: ['LB', 'CDM', 'CAM', 'LS'], RCM: ['RB', 'CDM', 'CAM', 'RS'],
      CAM: ['CDM', 'LCM', 'RCM', 'LS', 'RS'], LS: ['LCM', 'CAM', 'RS'], RS: ['RCM', 'CAM', 'LS'],
    },
  },
  {
    name: '4-1-4-1', label: 'Anchored',
    pos: { ...GK, ...BACK4, CDM: [50, 40], LM: [12, 57], LCM: [37, 55], RCM: [63, 55], RM: [88, 57], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'CDM'], RCB: ['GK', 'LCB', 'RB', 'CDM'], RB: ['RCB', 'RM'],
      CDM: ['LCB', 'RCB', 'LCM', 'RCM'], LM: ['LB', 'LCM'], LCM: ['CDM', 'LM', 'RCM', 'ST'], RCM: ['CDM', 'RM', 'LCM', 'ST'], RM: ['RB', 'RCM'],
      ST: ['LCM', 'RCM'],
    },
  },
  {
    name: '4-2-2-2', label: 'Twin AMs',
    pos: { ...GK, ...BACK4, LCDM: [35, 44], RCDM: [65, 44], LCAM: [30, 66], RCAM: [70, 66], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCDM'], LCB: ['GK', 'LB', 'RCB', 'LCDM'], RCB: ['GK', 'LCB', 'RB', 'RCDM'], RB: ['RCB', 'RCDM'],
      LCDM: ['LB', 'LCB', 'RCDM', 'LCAM'], RCDM: ['RB', 'RCB', 'LCDM', 'RCAM'], LCAM: ['LCDM', 'RCAM', 'LS'], RCAM: ['RCDM', 'LCAM', 'RS'],
      LS: ['LCAM', 'RS'], RS: ['RCAM', 'LS'],
    },
  },
  {
    name: '4-2-3-1', label: 'Narrow',
    pos: { ...GK, ...BACK4, LCDM: [35, 42], RCDM: [65, 42], LCAM: [28, 64], CCAM: [50, 66], RCAM: [72, 64], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCDM'], LCB: ['GK', 'LB', 'RCB', 'LCDM'], RCB: ['GK', 'LCB', 'RB', 'RCDM'], RB: ['RCB', 'RCDM'],
      LCDM: ['LB', 'LCB', 'RCDM', 'LCAM', 'CCAM'], RCDM: ['RB', 'RCB', 'LCDM', 'RCAM', 'CCAM'],
      LCAM: ['LCDM', 'CCAM'], CCAM: ['LCDM', 'RCDM', 'LCAM', 'RCAM', 'ST'], RCAM: ['RCDM', 'CCAM'], ST: ['CCAM'],
    },
  },
  {
    name: '4-2-3-1', label: 'Wide',
    pos: { ...GK, ...BACK4, LCDM: [36, 42], RCDM: [64, 42], LM: [14, 64], RM: [86, 64], CAM: [50, 66], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'LCDM'], RCB: ['GK', 'LCB', 'RB', 'RCDM'], RB: ['RCB', 'RM'],
      LCDM: ['LCB', 'LM', 'RCDM', 'CAM'], RCDM: ['RCB', 'RM', 'LCDM', 'CAM'], LM: ['LB', 'LCDM'], RM: ['RB', 'RCDM'],
      CAM: ['LCDM', 'RCDM', 'ST'], ST: ['CAM'],
    },
  },
  {
    name: '4-3-1-2', label: 'Narrow',
    pos: { ...GK, ...BACK4, LCM: [28, 50], CM: [50, 48], RCM: [72, 50], CAM: [50, 68], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'CM'], RCB: ['GK', 'LCB', 'RB', 'CM'], RB: ['RCB', 'RCM'],
      LCM: ['LB', 'CM', 'CAM', 'LS'], CM: ['LCB', 'RCB', 'LCM', 'RCM'], RCM: ['RB', 'CM', 'CAM', 'RS'],
      CAM: ['LCM', 'RCM', 'LS', 'RS'], LS: ['LCM', 'CAM', 'RS'], RS: ['RCM', 'CAM', 'LS'],
    },
  },
  {
    name: '4-3-2-1', label: 'Christmas Tree',
    pos: { ...GK, ...BACK4, LCM: [28, 50], CM: [50, 48], RCM: [72, 50], LF: [34, 70], RF: [66, 70], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'LCM'], RCB: ['GK', 'LCB', 'RB', 'RCM'], RB: ['RCB', 'RCM'],
      LCM: ['LB', 'LCB', 'CM', 'LF'], CM: ['LCM', 'RCM', 'ST'], RCM: ['RB', 'RCB', 'CM', 'RF'],
      LF: ['LCM', 'ST'], RF: ['RCM', 'ST'], ST: ['CM', 'LF', 'RF'],
    },
  },
  {
    name: '4-3-3', label: 'Balanced',
    pos: { ...GK, ...BACK4, LCM: [26, 54], CM: [50, 54], RCM: [74, 54], LW: [14, 84], ST: [50, 88], RW: [86, 84] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'LCM'], RCB: ['GK', 'LCB', 'RB', 'RCM'], RB: ['RCB', 'RCM'],
      LCM: ['LB', 'LCB', 'CM', 'LW'], CM: ['LCM', 'RCM', 'ST'], RCM: ['RB', 'RCB', 'CM', 'RW'],
      LW: ['LCM', 'ST'], ST: ['CM', 'LW', 'RW'], RW: ['RCM', 'ST'],
    },
  },
  {
    name: '4-3-3', label: 'Holding',
    pos: { ...GK, ...BACK4, CDM: [50, 42], LCM: [30, 56], RCM: [70, 56], LW: [14, 84], ST: [50, 88], RW: [86, 84] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'CDM'], RCB: ['GK', 'LCB', 'RB', 'CDM'], RB: ['RCB', 'RCM'],
      CDM: ['LCB', 'RCB', 'LCM', 'RCM'], LCM: ['LB', 'CDM', 'LW', 'ST'], RCM: ['RB', 'CDM', 'RW', 'ST'],
      LW: ['LCM'], ST: ['LCM', 'RCM', 'LW', 'RW'], RW: ['RCM'],
    },
  },
  {
    name: '4-3-3', label: 'Defend',
    pos: { ...GK, ...BACK4, LCDM: [35, 44], RCDM: [65, 44], CM: [50, 58], LW: [14, 84], ST: [50, 88], RW: [86, 84] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCDM'], LCB: ['GK', 'LB', 'RCB', 'LCDM'], RCB: ['GK', 'LCB', 'RB', 'RCDM'], RB: ['RCB', 'RCDM'],
      LCDM: ['LB', 'LCB', 'RCDM', 'CM', 'LW'], RCDM: ['RB', 'RCB', 'LCDM', 'CM', 'RW'], CM: ['LCDM', 'RCDM', 'ST'],
      LW: ['LCDM', 'ST'], ST: ['CM', 'LW', 'RW'], RW: ['RCDM', 'ST'],
    },
  },
  {
    name: '4-3-3', label: 'Attack',
    pos: { ...GK, ...BACK4, LCM: [28, 52], RCM: [72, 52], CAM: [50, 64], LW: [14, 84], ST: [50, 88], RW: [86, 84] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'LCM'], RCB: ['GK', 'LCB', 'RB', 'RCM'], RB: ['RCB', 'RCM'],
      LCM: ['LB', 'LCB', 'CAM', 'LW'], RCM: ['RB', 'RCB', 'CAM', 'RW'], CAM: ['LCM', 'RCM', 'ST'],
      LW: ['LCM', 'ST'], ST: ['CAM', 'LW', 'RW'], RW: ['RCM', 'ST'],
    },
  },
  {
    name: '4-3-3', label: 'False 9',
    pos: { ...GK, ...BACK4, CDM: [50, 42], LCM: [30, 56], RCM: [70, 56], LW: [14, 82], CF: [50, 86], RW: [86, 82] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LCM'], LCB: ['GK', 'LB', 'RCB', 'CDM'], RCB: ['GK', 'LCB', 'RB', 'CDM'], RB: ['RCB', 'RCM'],
      CDM: ['LCB', 'RCB', 'LCM', 'RCM'], LCM: ['LB', 'CDM', 'CF', 'LW'], RCM: ['RB', 'CDM', 'CF', 'RW'],
      LW: ['LCM', 'CF'], CF: ['LCM', 'RCM', 'LW', 'RW'], RW: ['RCM', 'CF'],
    },
  },
  {
    name: '4-4-1-1', label: 'Withdrawn ST',
    pos: { ...GK, ...BACK4, LM: [12, 54], LCM: [37, 54], RCM: [63, 54], RM: [88, 54], CF: [50, 70], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'LCM'], RCB: ['GK', 'LCB', 'RB', 'RCM'], RB: ['RCB', 'RM'],
      LM: ['LB', 'LCM'], LCM: ['LCB', 'LM', 'RCM', 'CF'], RCM: ['RCB', 'RM', 'LCM', 'CF'], RM: ['RB', 'RCM'],
      CF: ['LCM', 'RCM', 'ST'], ST: ['CF'],
    },
  },
  {
    name: '4-4-2', label: 'Flat',
    pos: { ...GK, ...BACK4, LM: [12, 54], LCM: [37, 54], RCM: [63, 54], RM: [88, 54], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'LCM'], RCB: ['GK', 'LCB', 'RB', 'RCM'], RB: ['RCB', 'RM'],
      LM: ['LB', 'LCM', 'LS'], LCM: ['LCB', 'LM', 'RCM', 'LS'], RCM: ['RCB', 'RM', 'LCM', 'RS'], RM: ['RB', 'RCM', 'RS'],
      LS: ['LM', 'LCM', 'RS'], RS: ['RM', 'RCM', 'LS'],
    },
  },
  {
    name: '4-4-2', label: 'Holding',
    pos: { ...GK, ...BACK4, LM: [12, 52], LCDM: [37, 46], RCDM: [63, 46], RM: [88, 52], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'LCDM'], RCB: ['GK', 'LCB', 'RB', 'RCDM'], RB: ['RCB', 'RM'],
      LM: ['LB', 'LCDM'], LCDM: ['LCB', 'LM', 'RCDM', 'LS'], RCDM: ['RCB', 'RM', 'LCDM', 'RS'], RM: ['RB', 'RCDM'],
      LS: ['LCDM', 'RS'], RS: ['RCDM', 'LS'],
    },
  },
  {
    name: '4-5-1', label: 'Attack',
    pos: { ...GK, ...BACK4, LM: [10, 56], LCAM: [33, 64], CM: [50, 54], RCAM: [67, 64], RM: [90, 56], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'CM'], RCB: ['GK', 'LCB', 'RB', 'CM'], RB: ['RCB', 'RM'],
      LM: ['LB', 'LCAM'], LCAM: ['LM', 'CM', 'ST'], CM: ['LCB', 'RCB', 'LCAM', 'RCAM'], RCAM: ['RM', 'CM', 'ST'], RM: ['RB', 'RCAM'],
      ST: ['LCAM', 'RCAM'],
    },
  },
  {
    name: '4-5-1', label: 'Flat',
    pos: { ...GK, ...BACK4, LM: [10, 55], LCM: [30, 55], CCM: [50, 53], RCM: [70, 55], RM: [90, 55], ST: [50, 88] },
    links: {
      GK: ['LCB', 'RCB'], LB: ['LCB', 'LM'], LCB: ['GK', 'LB', 'RCB', 'CCM'], RCB: ['GK', 'LCB', 'RB', 'CCM'], RB: ['RCB', 'RM'],
      LM: ['LB', 'LCM'], LCM: ['LM', 'CCM', 'ST'], CCM: ['LCB', 'RCB', 'LCM', 'RCM'], RCM: ['RM', 'CCM', 'ST'], RM: ['RB', 'RCM'],
      ST: ['LCM', 'RCM'],
    },
  },

  // ── 5-back ──────────────────────────────────────────────────────────────────
  {
    name: '5-2-1-2', label: 'Overload',
    pos: { ...GK, ...BACK5, LCM: [34, 54], RCM: [66, 54], CAM: [50, 66], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LWB: ['LCB', 'LCM'], LCB: ['GK', 'LWB', 'CB', 'LCM'], CB: ['GK', 'LCB', 'RCB'], RCB: ['GK', 'RWB', 'CB', 'RCM'], RWB: ['RCB', 'RCM'],
      LCM: ['LWB', 'LCB', 'RCM', 'CAM'], RCM: ['RWB', 'RCB', 'LCM', 'CAM'], CAM: ['LCM', 'RCM', 'LS', 'RS'],
      LS: ['CAM', 'RS'], RS: ['CAM', 'LS'],
    },
  },
  {
    name: '5-2-2-1', label: 'Counter',
    pos: { ...GK, ...BACK5, LCM: [34, 54], RCM: [66, 54], LW: [16, 72], RW: [84, 72], ST: [50, 88] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LWB: ['LCB', 'LCM'], LCB: ['GK', 'LWB', 'CB', 'LCM'], CB: ['GK', 'LCB', 'RCB'], RCB: ['GK', 'RWB', 'CB', 'RCM'], RWB: ['RCB', 'RCM'],
      LCM: ['LWB', 'LCB', 'RCM', 'LW'], RCM: ['RWB', 'RCB', 'LCM', 'RW'], LW: ['LCM', 'ST'], RW: ['RCM', 'ST'], ST: ['LW', 'RW'],
    },
  },
  {
    name: '5-3-2', label: 'Defensive',
    pos: { ...GK, ...BACK5, LCM: [30, 54], CM: [50, 54], RCM: [70, 54], LS: [38, 86], RS: [62, 86] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LWB: ['LCB', 'LCM'], LCB: ['GK', 'LWB', 'CB', 'LCM'], CB: ['GK', 'LCB', 'RCB', 'CM'], RCB: ['GK', 'RWB', 'CB', 'RCM'], RWB: ['RCB', 'RCM'],
      LCM: ['LWB', 'LCB', 'CM', 'LS'], CM: ['CB', 'LCM', 'RCM'], RCM: ['RWB', 'RCB', 'CM', 'RS'],
      LS: ['LCM', 'RS'], RS: ['RCM', 'LS'],
    },
  },
  {
    name: '5-4-1', label: 'Bunker',
    pos: { ...GK, ...BACK5, LM: [12, 56], LCM: [37, 54], RCM: [63, 54], RM: [88, 56], ST: [50, 88] },
    links: {
      GK: ['LCB', 'CB', 'RCB'], LWB: ['LCB', 'LM'], LCB: ['GK', 'LWB', 'CB', 'LCM'], CB: ['GK', 'LCB', 'RCB'], RCB: ['GK', 'RWB', 'CB', 'RCM'], RWB: ['RCB', 'RM'],
      LM: ['LWB', 'LCM'], LCM: ['LCB', 'LM', 'RCM', 'ST'], RCM: ['RCB', 'RM', 'LCM', 'ST'], RM: ['RWB', 'RCM'], ST: ['LCM', 'RCM'],
    },
  },
];

function build(d: Def): Formation {
  const positions: FormationPosition[] = Object.entries(d.pos).map(([slot, [x, y]]) => ({
    slot,
    positionGroup: groupOf(slot),
    x,
    y,
  }));
  return { name: d.name, label: d.label, positions, links: d.links };
}

export const FORMATIONS: Formation[] = DEFS.map(build);
