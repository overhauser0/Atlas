import { describe, expect, it } from 'vitest';
import {
  buildAgentNoteContent,
  buildDefaultAgentNoteTitle,
} from '../agentNote';

describe('buildDefaultAgentNoteTitle', () => {
  it('uses the first non-empty line trimmed of whitespace', () => {
    expect(buildDefaultAgentNoteTitle('\n  Reactの設計方針を整理して  \n2行目')).toBe(
      'Reactの設計方針を整理して',
    );
  });

  it('strips leading markdown heading, quote, and list markers', () => {
    expect(buildDefaultAgentNoteTitle('## 週末の買い物リスト')).toBe(
      '週末の買い物リスト',
    );
    expect(buildDefaultAgentNoteTitle('- タスクを分解してほしい')).toBe(
      'タスクを分解してほしい',
    );
    expect(buildDefaultAgentNoteTitle('1. 優先順位を決める')).toBe(
      '優先順位を決める',
    );
    expect(buildDefaultAgentNoteTitle('> 引用テキストの要約')).toBe(
      '引用テキストの要約',
    );
  });

  it('truncates long prompts to 40 characters with an ellipsis', () => {
    const longPrompt =
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろ';
    const title = buildDefaultAgentNoteTitle(longPrompt);
    expect(title).toBe(
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらり…',
    );
    expect(Array.from(title).length).toBe(41);
  });

  it('falls back to agent name when prompt is empty or only markers', () => {
    expect(buildDefaultAgentNoteTitle('   \n  ', 'Writer')).toBe('Writer Note');
    expect(buildDefaultAgentNoteTitle('   ')).toBe('Atlas Note');
  });
});

describe('buildAgentNoteContent', () => {
  it('formats metadata, prompt, and response in Markdown for Standard model', () => {
    const content = buildAgentNoteContent({
      prompt: 'TypeScriptの型推論について教えて',
      response: '型推論は変数の初期化値から自動的に型を決定します。',
      agentName: 'Atlas',
      isCharged: false,
    });

    expect(content).toBe(
      [
        '> **Agent:** Atlas (Standard)',
        '',
        '## Prompt',
        '',
        'TypeScriptの型推論について教えて',
        '',
        '## Response',
        '',
        '型推論は変数の初期化値から自動的に型を決定します。',
      ].join('\n'),
    );
  });

  it('formats metadata with Charged label and falls back to Atlas when agentName is blank', () => {
    const content = buildAgentNoteContent({
      prompt: '  テスト  ',
      response: '  結果  \n',
      agentName: '  ',
      isCharged: true,
    });

    expect(content).toContain('> **Agent:** Atlas (Charged)');
    expect(content).toContain('## Prompt\n\nテスト');
    expect(content).toContain('## Response\n\n結果');
  });
});
