import { describe, expect, it } from 'vitest';
import { ORDER_CODE_ALPHABET, generateOrderCode, isValidOrderCode, normalizeOrderCode, uniqueOrderCode } from '../orderCode';

describe('order codes', () => {
  it('uses 31 characters with no look-alikes', () => {
    expect(ORDER_CODE_ALPHABET).toHaveLength(31);
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01ILO]/);
    expect(31 ** 5).toBe(28_629_151);
  });

  it('generates valid codes', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(/^PRT-[A-Z2-9]{5}$/);
      expect(isValidOrderCode(code)).toBe(true);
    }
  });

  it('tidies what customers type', () => {
    expect(normalizeOrderCode(' prt-7k3qm ')).toBe('PRT-7K3QM');
    expect(normalizeOrderCode('PRT7K3QM')).toBe('PRT-7K3QM');
    expect(normalizeOrderCode('7k3qm')).toBe('PRT-7K3QM');
    expect(isValidOrderCode('PRT-7K3QO')).toBe(false); // O is not in the alphabet
  });

  it('retries on collision and gives up eventually', () => {
    const taken = new Set<string>();
    let calls = 0;
    const code = uniqueOrderCode((c) => {
      calls++;
      if (calls < 3) {
        taken.add(c);
        return true;
      }
      return false;
    });
    expect(calls).toBe(3);
    expect(taken.has(code)).toBe(false);
    expect(() => uniqueOrderCode(() => true, 4)).toThrow();
  });
});
