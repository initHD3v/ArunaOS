interface BlockTag {
  open: string;
  close: string;
}

// Internal markers some models leak into their output (especially small /
// free-tier and reasoning models). These blocks are never meaningful user
// content, so they are stripped from the visible chat bubble.
const BLOCK_TAGS: BlockTag[] = [
  { open: '<think>', close: '</think>' },
  { open: '<tool_call>', close: '</tool_call>' },
];

const STRAY_CLOSE_TAGS = ['</think>', '</tool_call>'];

// DeepSeek native control tokens — single, self-contained markers with no
// meaningful inner content worth keeping.
const DEEPSEEK_TOKENS = [
  '<｜tool▁calls▁begin｜>',
  '<｜tool▁call▁begin｜>',
  '<｜tool▁sep｜>',
  '<｜tool▁call▁end｜>',
  '<｜tool▁calls▁end｜>',
  '<｜tool▁outputs▁begin｜>',
  '<｜tool▁output▁begin｜>',
  '<｜tool▁output▁end｜>',
  '<｜tool▁outputs▁end｜>',
];

const ALL_TAG_FRAGMENTS = [...BLOCK_TAGS.flatMap((t) => [t.open, t.close]), ...DEEPSEEK_TOKENS];

/**
 * Incrementally strips model artifacts (`<think>…</think>`,
 * `<tool_call>…</tool_call>`) from a token stream.
 *
 * Tags can be split across arbitrary chunk boundaries, so `push()` holds back
 * any trailing text that could still turn out to be the beginning of a tag
 * and returns only text that is guaranteed safe to display. Call `flush()`
 * once the stream ends to release (or discard) whatever is still buffered.
 */
export class StreamSanitizer {
  private buffer = '';
  private activeClose: string | null = null;

  /** Feed the next chunk; returns the text safe to append to the message. */
  push(text: string): string {
    if (!text) return '';
    this.buffer += text;

    let out = '';

    for (;;) {
      const lower = this.buffer.toLowerCase();

      if (this.activeClose !== null) {
        // Inside a discarded block — scan only for its closing tag.
        const idx = lower.indexOf(this.activeClose);
        if (idx === -1) return out;
        this.buffer = this.buffer.slice(idx + this.activeClose.length);
        this.activeClose = null;
        continue;
      }

      let openIdx = -1;
      let opened: BlockTag | null = null;
      for (const tag of BLOCK_TAGS) {
        const i = lower.indexOf(tag.open);
        if (i !== -1 && (openIdx === -1 || i < openIdx)) {
          openIdx = i;
          opened = tag;
        }
      }

      let strayIdx = -1;
      let strayLen = 0;
      for (const token of [...STRAY_CLOSE_TAGS, ...DEEPSEEK_TOKENS]) {
        const i = lower.indexOf(token.toLowerCase());
        if (i !== -1 && (strayIdx === -1 || i < strayIdx)) {
          strayIdx = i;
          strayLen = token.length;
        }
      }

      if (opened && (strayIdx === -1 || openIdx < strayIdx)) {
        out += this.buffer.slice(0, openIdx);
        this.buffer = this.buffer.slice(openIdx + opened.open.length);
        this.activeClose = opened.close;
        continue;
      }

      if (strayIdx !== -1) {
        // Closing tag without an opener (stream resumed mid-block).
        out += this.buffer.slice(0, strayIdx);
        this.buffer = this.buffer.slice(strayIdx + strayLen);
        continue;
      }

      // No complete tag yet — hold back a suffix that may become one.
      const hold = this.partialSuffixLength();
      if (hold > 0) {
        out += this.buffer.slice(0, this.buffer.length - hold);
        this.buffer = this.buffer.slice(this.buffer.length - hold);
      } else {
        out += this.buffer;
        this.buffer = '';
      }
      return out;
    }
  }

  /**
   * Finish the stream. Returns any remaining displayable text; a block that
   * was opened but never closed is discarded along with its content.
   */
  flush(): string {
    if (this.activeClose !== null) {
      this.buffer = '';
      this.activeClose = null;
      return '';
    }
    const rest = this.buffer;
    this.buffer = '';
    // A trailing fragment like "<thi" was held back on speculation; drop it.
    const hold = this.partialSuffixLength(rest);
    return hold > 0 ? rest.slice(0, rest.length - hold) : rest;
  }

  private partialSuffixLength(input?: string): number {
    const source = input ?? this.buffer;
    if (!source) return 0;
    const lower = source.toLowerCase();
    const maxLen = Math.max(...ALL_TAG_FRAGMENTS.map((f) => f.length)) - 1;
    for (let len = Math.min(maxLen, lower.length); len > 0; len--) {
      const suffix = lower.slice(lower.length - len);
      if (ALL_TAG_FRAGMENTS.some((f) => f.startsWith(suffix))) return len;
    }
    return 0;
  }
}

/** One-shot variant for non-streamed replies. */
export function sanitizeAIText(text: string): string {
  if (!text) return '';
  const sanitizer = new StreamSanitizer();
  return sanitizer.push(text) + sanitizer.flush();
}
