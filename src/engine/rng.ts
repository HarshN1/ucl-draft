/** Seeded RNG. The only place Math.random may appear in game logic. */

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of string/number parts → unsigned seed. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    for (const ch of String(p)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

/**
 * Cursor-tracked RNG. Every next()/int()/pick()/shuffle() advances `cursor`.
 * Resume restores (seed, cursor) and re-derives the generator so draws match.
 */
export class Rng {
  readonly seed: number;
  private _cursor: number;
  private gen: () => number;

  constructor(seed: number, cursor = 0) {
    this.seed = seed >>> 0;
    this._cursor = 0;
    this.gen = mulberry32(this.seed);
    while (this._cursor < cursor) {
      this.gen();
      this._cursor++;
    }
  }

  get cursor(): number {
    return this._cursor;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this._cursor++;
    return this.gen();
  }

  /** Integer in [0, max) — max must be > 0. */
  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Pick one element; empty array throws. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: empty array');
    return arr[this.int(arr.length)] as T;
  }

  /** Fisher–Yates shuffle (copy). */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  /** Snapshot for persistence. */
  snapshot(): { seed: number; cursor: number } {
    return { seed: this.seed, cursor: this._cursor };
  }

  static fromSnapshot(s: { seed: number; cursor: number }): Rng {
    return new Rng(s.seed, s.cursor);
  }
}

/** Fresh free-play seed from entropy (allowed Math.random — only in rng.ts). */
export function freshSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
