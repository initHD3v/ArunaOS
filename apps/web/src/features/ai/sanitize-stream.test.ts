import { describe, it, expect } from 'vitest';
import { StreamSanitizer, sanitizeAIText } from './sanitize-stream';

/** Feed text through a StreamSanitizer in fixed-size chunks, as SSE would. */
function streamed(chunks: string[]): string {
  const s = new StreamSanitizer();
  let out = '';
  for (const c of chunks) out += s.push(c);
  return out + s.flush();
}

/** Split into single characters to stress chunk-boundary handling. */
function charStreamed(text: string): string {
  return streamed(text.split(''));
}

describe('sanitizeAIText', () => {
  it('passes plain text through unchanged', () => {
    expect(sanitizeAIText('Halo, ini jawaban normal.')).toBe('Halo, ini jawaban normal.');
  });

  it('strips a complete <think> block', () => {
    expect(sanitizeAIText('<think>reasoning here</think>Jawaban final.')).toBe('Jawaban final.');
  });

  it('strips a complete <tool_call> block', () => {
    const raw =
      '<tool_call>\n<function=search>\n<parameter=category>apps</parameter>\n</function>\n</tool_call>';
    expect(sanitizeAIText(raw)).toBe('');
  });

  it('strips blocks embedded in surrounding text', () => {
    expect(sanitizeAIText('Sebelum<think>x</think>Sesudah')).toBe('SebelumSesudah');
  });

  it('strips multiple blocks', () => {
    expect(sanitizeAIText('<think>a</think>A<think>b</think>B')).toBe('AB');
  });

  it('removes stray closing tags without openers', () => {
    expect(sanitizeAIText('ok</think>lanjut')).toBe('oklanjut');
  });

  it('discards an unclosed block at end of input', () => {
    expect(sanitizeAIText('Jawaban<think>rahasia yang tidak pernah ditutup')).toBe('Jawaban');
  });
});

describe('StreamSanitizer (incremental)', () => {
  it('matches one-shot output when tags are split across chunks', () => {
    const raw = 'Sebelum <think>rahasia</think> Sesudah';
    expect(streamed(raw.match(/.{1,3}/g) ?? [])).toBe(sanitizeAIText(raw));
  });

  it('handles tags split character-by-character', () => {
    expect(charStreamed('A<think>x</think>B<tool_call>y</tool_call>C')).toBe('ABC');
  });

  it('holds back partial opening tags until resolved', () => {
    const s = new StreamSanitizer();
    // "<th" could still become "<think>" — must not be emitted yet.
    expect(s.push('hello <th')).toBe('hello ');
    expect(s.push('ink>secret</think>done')).toBe('done');
    expect(s.flush()).toBe('');
  });

  it('releases held-back non-tag angle brackets', () => {
    const s = new StreamSanitizer();
    expect(s.push('5 < 10 dan 3 >')).toBe('5 < 10 dan 3 >');
    expect(s.flush()).toBe('');
  });

  it('discards everything after an unclosed block opened mid-stream', () => {
    const s = new StreamSanitizer();
    let out = s.push('mulai <think>');
    out += s.push('terus berpikir tanpa akhir');
    out += s.flush();
    expect(out).toBe('mulai ');
  });

  it('is case-insensitive on tags', () => {
    expect(sanitizeAIText('<THINK>noise</THINK>clean')).toBe('clean');
  });

  it('handles the real-world broken transcript shape', () => {
    const raw =
      '<tool_call> <function=search> <parameter=category> apps </parameter>' +
      ' <parameter=query> Aruna OS logo </parameter> </function> </tool_call> ';
    expect(sanitizeAIText(raw)).toBe(' ');
  });
});
