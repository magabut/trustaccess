import { describe, expect, it } from 'vitest';
import { getDashboardStats } from '../src/app/dashboard/page';
import type { DBSession } from '../src/lib/db';

describe('getDashboardStats', () => {
  it('returns numeric totals for users and checkins', async () => {
    const rows = [
      { count: '3' },
      { count: '7' },
      { count: '5' },
    ];
    let idx = 0;

    const db = {
      get: async () => rows[idx++],
    } as Pick<DBSession, 'get'>;

    await expect(getDashboardStats(db)).resolves.toEqual({
      totalUsers: 3,
      totalCheckins: 7,
      totalGrantedCheckins: 5,
    });
  });

  it('falls back to zero when a count is missing', async () => {
    const rows = [undefined, { count: undefined }, { count: null }];
    let idx = 0;

    const db = {
      get: async () => rows[idx++],
    } as Pick<DBSession, 'get'>;

    await expect(getDashboardStats(db)).resolves.toEqual({
      totalUsers: 0,
      totalCheckins: 0,
      totalGrantedCheckins: 0,
    });
  });
});
