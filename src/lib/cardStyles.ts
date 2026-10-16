import type { Player, CardType } from '@/types';

export interface CardVisualStyle {
  bg: string;
  ink: string;
  sub: string;
  border: string;
  divider: string;
  label: string;
  /** Optional radial glow / sun-ray tint in upper hood */
  glow?: string;
  /** Upper hood accent gradient (FIFA 16 curved crown) */
  hoodBg?: string;
  /** Horizontal nameplate bar background */
  nameBarBg?: string;
  /** Horizontal nameplate bar text color */
  nameBarInk?: string;
  /** Diagonal sash or geometric accent overlay */
  sashBg?: string;
  /** Whether the card body is dark (uses light badge/stat contrast) */
  isDark?: boolean;
}

const TIER_GOLD_RARE: CardVisualStyle = {
  bg: 'linear-gradient(165deg,#fff6c7 0%,#f5d876 24%,#d4a937 56%,#946f14 88%,#6e5008 100%)',
  ink: '#241a00',
  sub: '#523b04',
  border: '#ffe885',
  divider: 'rgba(36,26,0,0.32)',
  label: '',
  glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,252,225,0.68) 0%, rgba(255,225,110,0.18) 48%, transparent 75%)',
  hoodBg: 'linear-gradient(180deg, rgba(255,252,220,0.65) 0%, rgba(245,212,102,0.15) 100%)',
  nameBarBg: 'linear-gradient(90deg, rgba(255,246,200,0.92) 0%, rgba(255,252,230,0.98) 50%, rgba(255,246,200,0.92) 100%)',
  nameBarInk: '#1f1500',
  sashBg: 'linear-gradient(135deg, transparent 30%, rgba(255,250,215,0.28) 48%, transparent 66%)',
  isDark: false,
};

const TIER_GOLD: CardVisualStyle = {
  bg: 'linear-gradient(165deg,#ebd488 0%,#d1b054 32%,#ad892f 65%,#7d6018 100%)',
  ink: '#261c02',
  sub: '#54400a',
  border: '#dec268',
  divider: 'rgba(42,31,2,0.30)',
  label: '',
  hoodBg: 'linear-gradient(180deg, rgba(255,242,190,0.3) 0%, transparent 100%)',
  nameBarBg: 'linear-gradient(90deg, rgba(235,212,136,0.92) 0%, rgba(245,228,164,0.96) 50%, rgba(235,212,136,0.92) 100%)',
  nameBarInk: '#241a00',
  isDark: false,
};

const TIER_SILVER: CardVisualStyle = {
  bg: 'linear-gradient(165deg,#f0f3f7 0%,#cfd6df 32%,#a3acb8 64%,#76808d 100%)',
  ink: '#1a1f26',
  sub: '#3f4752',
  border: '#e3e8ef',
  divider: 'rgba(28,32,38,0.28)',
  label: '',
  nameBarBg: 'linear-gradient(90deg, rgba(235,240,245,0.94) 0%, rgba(250,252,255,0.98) 50%, rgba(235,240,245,0.94) 100%)',
  nameBarInk: '#161b22',
  isDark: false,
};

const TIER_BRONZE: CardVisualStyle = {
  bg: 'linear-gradient(165deg,#e6b98c 0%,#cd9362 32%,#a96f3f 64%,#7c4e28 100%)',
  ink: '#2a1606',
  sub: '#5a3318',
  border: '#e8c298',
  divider: 'rgba(42,22,6,0.3)',
  label: '',
  nameBarBg: 'linear-gradient(90deg, rgba(230,185,140,0.94) 0%, rgba(242,206,170,0.98) 50%, rgba(230,185,140,0.94) 100%)',
  nameBarInk: '#261204',
  isDark: false,
};

export const SPECIAL_STYLES: Record<CardType, CardVisualStyle> = {
  totw: {
    bg: 'linear-gradient(165deg,#24221c 0%,#121215 32%,#0a0a0d 68%,#1c1708 100%)',
    ink: '#f7df8b',
    sub: '#d4af37',
    border: '#e5c148',
    divider: 'rgba(229,193,72,0.38)',
    label: 'TOTW',
    glow: 'radial-gradient(85% 55% at 50% 20%, rgba(245,205,75,0.28) 0%, transparent 68%)',
    hoodBg: 'linear-gradient(180deg, rgba(230,190,60,0.35) 0%, rgba(20,20,24,0.1) 100%)',
    nameBarBg: 'linear-gradient(90deg, #c99e2c 0%, #f5d76e 50%, #c99e2c 100%)',
    nameBarInk: '#120e02',
    sashBg: 'linear-gradient(135deg, transparent 34%, rgba(229,193,72,0.14) 50%, transparent 66%)',
    isDark: true,
  },
  toty: {
    bg: 'linear-gradient(165deg,#1d56b8 0%,#0f3378 36%,#081d4a 70%,#040f2b 100%)',
    ink: '#f9e596',
    sub: '#d8b74b',
    border: '#f5d061',
    divider: 'rgba(245,208,97,0.42)',
    label: 'TOTY',
    glow: 'radial-gradient(85% 60% at 50% 22%, rgba(96,175,255,0.42) 0%, rgba(245,208,97,0.20) 52%, transparent 75%)',
    hoodBg: 'linear-gradient(180deg, rgba(245,208,97,0.45) 0%, rgba(29,86,184,0.15) 100%)',
    nameBarBg: 'linear-gradient(90deg, #c79c2b 0%, #fae082 50%, #c79c2b 100%)',
    nameBarInk: '#071636',
    sashBg: 'linear-gradient(135deg, transparent 30%, rgba(245,208,97,0.22) 48%, rgba(80,165,255,0.18) 54%, transparent 70%)',
    isDark: true,
  },
  tots: {
    bg: 'linear-gradient(165deg,#164596 0%,#0c2a61 38%,#081c42 72%,#051129 100%)',
    ink: '#fff1b5',
    sub: '#e0bc53',
    border: '#f2ca52',
    divider: 'rgba(242,202,82,0.40)',
    label: 'TOTS',
    glow: 'radial-gradient(85% 55% at 50% 24%, rgba(242,202,82,0.32) 0%, rgba(38,118,235,0.22) 55%, transparent 75%)',
    hoodBg: 'linear-gradient(180deg, rgba(242,202,82,0.38) 0%, rgba(15,48,105,0.12) 100%)',
    nameBarBg: 'linear-gradient(90deg, #d4ac36 0%, #fff0a8 50%, #d4ac36 100%)',
    nameBarInk: '#081b3d',
    sashBg: 'linear-gradient(128deg, transparent 36%, rgba(242,202,82,0.42) 47%, rgba(255,238,165,0.55) 50%, rgba(242,202,82,0.38) 53%, transparent 64%)',
    isDark: true,
  },
  motm: {
    bg: 'linear-gradient(165deg,#ff9e2c 0%,#eb6409 38%,#b83b00 72%,#6e1f00 100%)',
    ink: '#ffffff',
    sub: '#ffe0b5',
    border: '#ffb95e',
    divider: 'rgba(255,235,205,0.38)',
    label: 'MOTM',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,220,130,0.42) 0%, transparent 70%)',
    hoodBg: 'linear-gradient(180deg, rgba(255,215,120,0.40) 0%, transparent 100%)',
    nameBarBg: 'linear-gradient(90deg, #1f1209 0%, #361e0d 50%, #1f1209 100%)',
    nameBarInk: '#ffae42',
    sashBg: 'linear-gradient(135deg, transparent 34%, rgba(255,230,170,0.22) 50%, transparent 66%)',
    isDark: true,
  },
  futties: {
    bg: 'linear-gradient(165deg,#ff8ac4 0%,#d93886 36%,#8f1954 70%,#4a0929 100%)',
    ink: '#fff5fa',
    sub: '#f7d274',
    border: '#f5d061',
    divider: 'rgba(247,210,116,0.40)',
    label: 'FUTTIES',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,190,225,0.40) 0%, transparent 70%)',
    hoodBg: 'linear-gradient(180deg, rgba(245,208,97,0.38) 0%, transparent 100%)',
    nameBarBg: 'linear-gradient(90deg, #c99e2c 0%, #fae082 50%, #c99e2c 100%)',
    nameBarInk: '#4a0929',
    sashBg: 'linear-gradient(135deg, transparent 34%, rgba(245,208,97,0.22) 50%, transparent 66%)',
    isDark: true,
  },
  hero: {
    bg: 'linear-gradient(165deg,#6c2bd9 0%,#46188f 38%,#280c59 72%,#140530 100%)',
    ink: '#f8eed0',
    sub: '#e3be54',
    border: '#e5c158',
    divider: 'rgba(229,193,88,0.38)',
    label: 'HERO',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(192,132,252,0.38) 0%, transparent 70%)',
    hoodBg: 'linear-gradient(180deg, rgba(229,193,88,0.35) 0%, transparent 100%)',
    nameBarBg: 'linear-gradient(90deg, #b88c28 0%, #f2d272 50%, #b88c28 100%)',
    nameBarInk: '#1c093d',
    sashBg: 'linear-gradient(135deg, transparent 35%, rgba(229,193,88,0.18) 50%, transparent 65%)',
    isDark: true,
  },
  icon: {
    bg: 'linear-gradient(165deg,#fffef9 0%,#f7f0dc 34%,#e3d2a6 68%,#bfa15a 100%)',
    ink: '#332404',
    sub: '#6e5211',
    border: '#d4af37',
    divider: 'rgba(110,82,17,0.32)',
    label: 'ICON',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,250,230,0.85) 0%, rgba(212,175,55,0.22) 55%, transparent 75%)',
    hoodBg: 'linear-gradient(180deg, rgba(255,255,245,0.8) 0%, rgba(227,210,166,0.25) 100%)',
    nameBarBg: 'linear-gradient(90deg, #b89128 0%, #e8c86b 50%, #b89128 100%)',
    nameBarInk: '#1f1500',
    sashBg: 'linear-gradient(135deg, transparent 32%, rgba(255,252,235,0.45) 48%, rgba(212,175,55,0.20) 52%, transparent 68%)',
    isDark: false,
  },
  cornerstones: {
    bg: 'linear-gradient(165deg,#f5e6d0 0%,#d4a574 32%,#9e6f3e 66%,#5e3a18 100%)',
    ink: '#261104',
    sub: '#573014',
    border: '#e8c492',
    divider: 'rgba(42,20,8,0.32)',
    label: 'CS',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,220,165,0.42) 0%, transparent 70%)',
    nameBarBg: 'linear-gradient(90deg, rgba(245,230,208,0.94) 0%, rgba(255,244,228,0.98) 50%, rgba(245,230,208,0.94) 100%)',
    nameBarInk: '#261104',
    isDark: false,
  },
  thunderstruck: {
    bg: 'linear-gradient(165deg,#1e3f6e 0%,#0f2847 36%,#17426e 68%,#081426 100%)',
    ink: '#d9f0ff',
    sub: '#6cb8eb',
    border: '#4ea3e0',
    divider: 'rgba(108,184,235,0.36)',
    label: 'T-ST',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(80,195,255,0.34) 0%, transparent 70%)',
    nameBarBg: 'linear-gradient(90deg, #1b4f82 0%, #327bc2 50%, #1b4f82 100%)',
    nameBarInk: '#f0f8ff',
    isDark: true,
  },
  thunderstruck_icon: {
    bg: 'linear-gradient(165deg,#fff9e6 0%,#edd06b 30%,#c49a22 64%,#6e4d0c 100%)',
    ink: '#1f1500',
    sub: '#593f06',
    border: '#ffe066',
    divider: 'rgba(31,21,0,0.32)',
    label: 'T-ICON',
    glow: 'radial-gradient(85% 55% at 50% 22%, rgba(255,235,120,0.5) 0%, transparent 70%)',
    nameBarBg: 'linear-gradient(90deg, #241904 0%, #3d2b08 50%, #241904 100%)',
    nameBarInk: '#ffe066',
    isDark: false,
  },
  promo: {
    bg: 'linear-gradient(165deg,#2a1a3a 0%,#4a2060 40%,#2a1040 100%)',
    ink: '#f0e0ff',
    sub: '#c29ee0',
    border: '#9f78c4',
    divider: 'rgba(160,128,192,0.35)',
    label: 'SPECIAL',
    nameBarBg: 'linear-gradient(90deg, #3b1c54 0%, #5c2d82 50%, #3b1c54 100%)',
    nameBarInk: '#f5e8ff',
    isDark: true,
  },
};

function tierFromOvr(ovr: number): CardVisualStyle {
  if (ovr >= 80) return TIER_GOLD_RARE;
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
  'team of the year': 'TOTY',
  'team of the season': 'TOTS',
  'man of the match': 'MOTM',
  futties: 'FUTTIES',
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
