import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/lib/config';

describe('smoke', () => {
  it('exposes app name', () => {
    expect(APP_NAME).toBe('TrustAccess');
  });
});
