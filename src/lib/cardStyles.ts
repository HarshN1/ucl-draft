import type { Player, CardType } from '@/types';

export interface CardVisualStyle {
  bg: string;
  ink: string;
  sub: string;
  border: string;
  divider: string;
  label: string;
  /** Optional radial glow tint */
  glow?: string;
}

const TIER_GOLD_RARE: CardVisualStyle = {
  bg: 'linear-gradient(160deg,#fff4c2 0%,#f4d779 26%,#caa23c 55%,#8a6d1e 100%)',
  ink: '#241a00',
  sub: '#5c4708',
  border: '#ffe899',
  divider: 'rgba(36,26,0,0.35)',
  label: '',
};

const TIER_GOLD: CardVisualStyle = {
  bg: 'linear-gradient(160deg,#f6e29a 0%,#e3c463 30%,#bd9a3c 60%,#8f7126 100%)',
  ink: '#2a1f02',
  sub: '#5e4a0d',
  border: '#f0d680',
  divider: 'rgba(42,31,2,0.32)',
  label: '',
};

const TIER_SILVER: CardVisualStyle = {
  bg: 'linear-gradient(160deg,#eef1f5 0%,#cdd3db 32%,#a7afba 62%,#7f8893 100%)',
  ink: '#1c2026',
  sub: '#444c57',
  border: '#e3e8ef',
  divider: 'rgba(28,32,38,0.28)',
  label: '',
};

const TIER_BRONZE: CardVisualStyle = {
  bg: 'linear-gradient(160deg,#e6b98c 0%,#cd9362 30%,#a96f3f 62%,#7c4e28 100%)',
  ink: '#2a1606',
  sub: '#5a3318',
  border: '#e8c298',
  divider: 'rgba(42,22,6,0.3)',
  label: '',
};

export const SPECIAL_STYLES: Record<CardType, CardVisualStyle> = {
  totw: {
    bg: 'linear-gradient(160deg,#1a1a22 0%,#0d0d12 35%,#14141c 65%,#08080c 100%)',
    ink: '#e8f4f8',
    sub: '#7eb8c8',
    border: '#2a3a44',
    divider: 'rgba(126,184,200,0.35)',
    label: 'TOTW',
    glow: 'radial-gradient(90% 80% at 30% 70%, rgba(0,212,255,0.12) 0%, transparent 60%)',
  },
  hero: {
    bg: 'linear-gradient(160deg,#e8d4ff 0%,#b88af0 28%,#7c3aed 58%,#4c1d95 100%)',
    ink: '#1a0533',
    sub: '#4a2080',
    border: '#d4b4ff',
    divider: 'rgba(74,32,128,0.35)',
    label: 'HERO',
    glow: 'radial-gradient(90% 80% at 25% 65%, rgba(200,150,255,0.2) 0%, transparent 55%)',
  },
  icon: {
    bg: 'linear-gradient(135deg,#fbfbf9 0%,#e5dfcb 55%,#d4c9a8 100%)',
    ink: '#2a1f02',
    sub: '#6b5a2a',
    border: '#caa23c',
    divider: 'rgba(42,31,2,0.28)',
    label: 'ICON',
    glow: 'radial-gradient(90% 80% at 28% 68%, rgba(255,230,150,0.18) 0%, transparent 55%)',
  },
  cornerstones: {
    bg: 'linear-gradient(160deg,#f5e6d0 0%,#d4a574 30%,#a67c52 60%,#6b4423 100%)',
    ink: '#2a1408',
    sub: '#5c3820',
    border: '#e8c89a',
    divider: 'rgba(42,20,8,0.32)',
    label: 'CS',
    glow: 'radial-gradient(90% 80% at 30% 70%, rgba(255,200,120,0.15) 0%, transparent 55%)',
  },
  thunderstruck: {
    bg: 'linear-gradient(160deg,#1e3a5f 0%,#0f2847 35%,#1a4a7a 65%,#0a1628 100%)',
    ink: '#b8e4ff',
    sub: '#4a9fd4',
    border: '#3d8fd4',
    divider: 'rgba(74,159,212,0.35)',
    label: 'T-ST',
    glow: 'radial-gradient(90% 80% at 35% 65%, rgba(0,180,255,0.22) 0%, transparent 55%)',
  },
  thunderstruck_icon: {
    bg: 'linear-gradient(160deg,#fff8e0 0%,#f0d060 25%,#c9a020 55%,#6b4a10 100%)',
    ink: '#1a1200',
    sub: '#5c4208',
    border: '#ffe066',
    divider: 'rgba(26,18,0,0.3)',
    label: 'T-ICON',
    glow: 'radial-gradient(90% 80% at 30% 68%, rgba(255,220,80,0.25) 0%, transparent 55%)',
  },
  promo: {
    bg: 'linear-gradient(160deg,#2a1a3a 0%,#4a2060 40%,#2a1040 100%)',
    ink: '#f0e0ff',
    sub: '#a080c0',
    border: '#8060a0',
    divider: 'rgba(160,128,192,0.35)',
    label: 'SPECIAL',
  },
};

function tierFromOvr(ovr: number): CardVisualStyle {
  if (ovr >= 84) return TIER_GOLD_RARE;
  if (ovr >= 75) return TIER_GOLD;
  if (ovr >= 65) return TIER_SILVER;
  return TIER_BRONZE;
}

/** Resolve the visual style for a player card (special types override metal tier). */
export function getCardStyle(player: Player): CardVisualStyle {
  if (player.isLegend && !player.cardType) {
    return SPECIAL_STYLES.icon;
  }
  if (player.cardType && SPECIAL_STYLES[player.cardType]) {
    return SPECIAL_STYLES[player.cardType];
  }
  return tierFromOvr(player.overall);
}

const PROMO_SHORT: Record<string, string> = {
  'team of the week': 'TOTW',
  heroes: 'HERO',
  icon: 'ICON',
  cornerstones: 'CS',
  thunderstruck: 'T-ST',
  'thunderstruck icon': 'T-ICON',
};

/** Short uppercase label for the card footer (max ~8 chars). */
export function getCardLabel(player: Player): string {
  if (player.isLegend && !player.cardType) return 'ICON';
  if (player.cardType && SPECIAL_STYLES[player.cardType]?.label) {
    return SPECIAL_STYLES[player.cardType].label;
  }
  if (player.promoLabel) {
    const key = player.promoLabel.toLowerCase();
    return PROMO_SHORT[key] ?? player.promoLabel.slice(0, 8).toUpperCase();
  }
  return '';
}

export function isSpecialCard(player: Player): boolean {
  return !!(player.cardType || player.isLegend);
}
