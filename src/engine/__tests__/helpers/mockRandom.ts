/** Replace Math.random with a deterministic sequence for the duration of a test. */
export function mockRandom(sequence: number[]): () => void {
  let i = 0;
  const original = Math.random;
  Math.random = () => {
    const val = sequence[i % sequence.length] ?? 0;
    i++;
    return val;
  };
  return () => {
    Math.random = original;
  };
}
