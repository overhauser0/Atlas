import { describe, it, expect } from 'vitest';
import {
  getChecklistStats,
  normalizeLineEndings,
  toggleChecklistLine,
} from '../src/markdown';

describe('@atlas/shared/markdown', () => {
  it('normalizes CRLF and CR line endings to LF', () => {
    expect(normalizeLineEndings('a\r\nb\rc\n')).toBe('a\nb\nc\n');
  });

  it('toggles checklist lines including indented and full-width space items', () => {
    const md = ['# Title', '- [ ] Task A', '  *　[X] Task B', 'plain'].join(
      '\r\n',
    );

    const toggled1 = toggleChecklistLine(md, 1);
    expect(toggled1.split('\n')[1]).toBe('- [x] Task A');

    const toggled2 = toggleChecklistLine(toggled1, 2);
    expect(toggled2.split('\n')[2]).toBe('  *　[ ] Task B');

    // Non-checklist and out-of-range lines remain unchanged
    expect(toggleChecklistLine(md, 0)).toBe(md);
    expect(toggleChecklistLine(md, 99)).toBe(md);
  });

  it('computes checklist totals and checked counts', () => {
    expect(getChecklistStats('')).toBeNull();
    expect(getChecklistStats('# No checklist here\n- regular bullet')).toBeNull();

    const md = ['- [x] Done 1', '- [ ] Todo 1', '  + [X] Done 2'].join('\n');
    expect(getChecklistStats(md)).toEqual({ total: 3, checked: 2 });
  });
});
