import { describe, it, expect } from 'vitest';
import {
  getChecklistStats,
  normalizeLineEndings,
  parseMarkdownBlocks,
  parseMarkdownInline,
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

  it('parses inline formatting tokens and ignores unsafe URL schemes', () => {
    const tokens = parseMarkdownInline(
      'See `code`, **bold**, ~~del~~, *em*, [Docs](https://example.com), and https://atlas.dev',
    );
    expect(tokens).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'code', value: 'code' },
      { type: 'text', value: ', ' },
      { type: 'strong', value: 'bold' },
      { type: 'text', value: ', ' },
      { type: 'strike', value: 'del' },
      { type: 'text', value: ', ' },
      { type: 'em', value: 'em' },
      { type: 'text', value: ', ' },
      { type: 'link', label: 'Docs', href: 'https://example.com' },
      { type: 'text', value: ', and ' },
      { type: 'autolink', href: 'https://atlas.dev' },
    ]);

    expect(parseMarkdownInline('[xss](javascript:alert(1))')).toEqual([
      { type: 'text', value: '[xss](javascript:alert(1))' },
    ]);
  });

  it('parses Markdown blocks preserving exact line indices for checklists', () => {
    const md = [
      '# Heading 1',
      '',
      '---',
      '- [ ] First todo',
      '  - [x] Nested done',
      '> quote line 1',
      '> quote line 2',
      '- bullet',
      '1. ordered',
      '```ts',
      'const x = 1;',
      '```',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      'Paragraph',
    ].join('\n');

    const blocks = parseMarkdownBlocks(md);
    expect(blocks).toEqual([
      { type: 'heading', lineIndex: 0, level: 1, text: 'Heading 1' },
      { type: 'empty', lineIndex: 1 },
      { type: 'hr', lineIndex: 2 },
      {
        type: 'checklist',
        lineIndex: 3,
        indentLevel: 0,
        checked: false,
        label: 'First todo',
      },
      {
        type: 'checklist',
        lineIndex: 4,
        indentLevel: 1,
        checked: true,
        label: 'Nested done',
      },
      {
        type: 'blockquote',
        lineIndex: 5,
        lines: ['quote line 1', 'quote line 2'],
      },
      { type: 'ul', lineIndex: 7, indentLevel: 0, text: 'bullet' },
      {
        type: 'ol',
        lineIndex: 8,
        indentLevel: 0,
        marker: '1',
        text: 'ordered',
      },
      { type: 'code', lineIndex: 9, lang: 'ts', code: 'const x = 1;' },
      { type: 'table', lineIndex: 12, headers: ['A', 'B'], rows: [['1', '2']] },
      { type: 'paragraph', lineIndex: 15, text: 'Paragraph' },
    ]);
  });
});
