import { mapWithConcurrency } from './mapWithConcurrency';

describe('mapWithConcurrency', () => {
  it('keeps input order and never exceeds the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapWithConcurrency([30, 5, 20, 1, 10], 2, async (ms) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, ms));
      inFlight -= 1;
      return ms * 2;
    });
    expect(result).toEqual([60, 10, 40, 2, 20]);
    expect(peak).toBe(2);
  });

  it('leaves a failed item undefined without dropping the rest', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 4, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });
    expect(result).toEqual([1, undefined, 3]);
  });

  it('handles an empty list', async () => {
    await expect(mapWithConcurrency([], 4, async (n) => n)).resolves.toEqual([]);
  });
});
