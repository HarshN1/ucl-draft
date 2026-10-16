import { describe, expect, it } from 'vitest';
import { Rng, hashSeed, mulberry32 } from '../rng';

describe('mulberry32', () => {
  it('same seed → same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('hashSeed', () => {
  it('is stable for the same parts', () => {
    expect(hashSeed('daily', '2026-09-15', 'fc26')).toBe(
      hashSeed('daily', '2026-09-15', 'fc26')
    );
  });

  it('changes when any part changes', () => {
    expect(hashSeed('a', 1)).not.toBe(hashSeed('a', 2));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('Rng', () => {
  it('same seed → same sequence', () => {
    const a = new Rng(99);
    const b = new Rng(99);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('cursor advances on every draw', () => {
    const r = new Rng(7);
    expect(r.cursor).toBe(0);
    r.next();
    r.int(10);
    r.pick([1, 2, 3]);
    expect(r.cursor).toBe(3);
  });

  it('cursor restore reproduces the remaining sequence', () => {
    const full = new Rng(12345);
    full.next();
    full.next();
    const mid = full.cursor;
    const remaining = [full.next(), full.next(), full.next()];

    const restored = new Rng(12345, mid);
    expect(restored.cursor).toBe(mid);
    expect([restored.next(), restored.next(), restored.next()]).toEqual(remaining);
  });

  it('snapshot round-trips', () => {
    const r = new Rng(777);
    r.next();
    r.shuffle([1, 2, 3, 4]);
    const snap = r.snapshot();
    const clone = Rng.fromSnapshot(snap);
    expect(clone.next()).toBe(r.next());
  });
});
