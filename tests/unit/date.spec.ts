import { describe, it, expect } from 'vitest';
import { chicagoDateString } from '../../src/utils/date';

describe('chicagoDateString', () => {
  it('formats YYYY-MM-DD', () => {
    const d = new Date('2024-03-10T06:00:00.000Z'); // before US DST change
    const s = chicagoDateString(d);
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
