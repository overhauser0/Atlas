import { describe, it, expect } from 'vitest';
import {
  extractParentIdFromNotionUrl,
  timingSafeCompare,
} from '../utils/utils';

describe('atlas-server utils', () => {
  describe('timingSafeCompare', () => {
    it('returns true only for identical non-empty strings', () => {
      expect(timingSafeCompare('secret-key-123', 'secret-key-123')).toBe(true);
      expect(timingSafeCompare('secret-key-123', 'secret-key-124')).toBe(false);
      expect(timingSafeCompare('short', 'much-longer-secret')).toBe(false);
      expect(timingSafeCompare('', '')).toBe(false);
      expect(timingSafeCompare(undefined, 'secret')).toBe(false);
      expect(timingSafeCompare('secret', null)).toBe(false);
    });
  });

  describe('extractParentIdFromNotionUrl', () => {
    it('extracts and formats 32-hex Notion page IDs as UUIDs', () => {
      expect(
        extractParentIdFromNotionUrl(
          'https://www.notion.so/Project-Title-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?pvs=4',
        ),
      ).toBe('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d');

      expect(
        extractParentIdFromNotionUrl(
          'https://example.notion.site/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
        ),
      ).toBe('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d');
    });

    it('returns null for non-Notion or missing URLs', () => {
      expect(extractParentIdFromNotionUrl(null)).toBeNull();
      expect(
        extractParentIdFromNotionUrl(
          'https://example.com/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
        ),
      ).toBeNull();
    });
  });
});
