function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttributeSafe(text: string): string {
  return text.replace(/"/g, '&quot;');
}

type InlineToken = { kind: 'html'; value: string } | { kind: 'math'; tex: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(`[^`]+`)|(\$\$[^$]+\$\$)|(\$[^$\n]+\$)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      tokens.push({ kind: 'html', value: inlineMarkdown(text.slice(cursor, start)) });
    }
    if (match[1]) {
      tokens.push({ kind: 'html', value: `<code>${escapeHtml(match[1].slice(1, -1))}</code>` });
    } else {
      const tex = match[2] ? match[2].slice(2, -2) : match[3]!.slice(1, -1);
      tokens.push({ kind: 'math', tex: escapeAttributeSafe(tex.trim()) });
    }
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    tokens.push({ kind: 'html', value: inlineMarkdown(text.slice(cursor)) });
  }
  return tokens;
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

async function renderInline(tokens: InlineToken[]): Promise<string> {
  let katexRenderToString: ((tex: string, options: Record<string, unknown>) => string) | null = null;
  try {
    ({ renderToString: katexRenderToString } = await import('katex'));
  } catch {
    katexRenderToString = null;
  }
  return tokens
    .map((token) => {
      if (token.kind === 'html') return token.value;
      if (!katexRenderToString) return `<code>${token.tex}</code>`;
      try {
        return `<span class="studio-preview__math">${katexRenderToString(token.tex, { throwOnError: false })}</span>`;
      } catch {
        return `<code>${token.tex}</code>`;
      }
    })
    .join('');
}

export async function renderPreview(markdown: string): Promise<string> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = async () => {
    if (paragraph.length === 0) return;
    const html = await renderInline(tokenizeInline(paragraph.join(' ')));
    blocks.push(`<p>${html}</p>`);
    paragraph = [];
  };
  const flushList = async () => {
    if (!list) return;
    const tag = list.ordered ? 'ol' : 'ul';
    const items: string[] = [];
    for (const item of list.items) {
      items.push(`<li>${await renderInline(tokenizeInline(item))}</li>`);
    }
    blocks.push(`<${tag}>${items.join('')}</${tag}>`);
    list = null;
  };
  const flushAll = async () => {
    await flushParagraph();
    await flushList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (line.startsWith('```')) {
      await flushAll();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.startsWith('```')) {
        code.push(lines[index]!);
        index += 1;
      }
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      await flushAll();
      const level = Math.min(heading[1]!.length + 1, 6);
      const html = await renderInline(tokenizeInline(heading[2]!));
      blocks.push(`<h${level}>${html}</h${level}>`);
      continue;
    }

    if (/^\s*\$\$\s*$/.test(line)) {
      await flushAll();
      const math: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*\$\$\s*$/.test(lines[index]!)) {
        math.push(lines[index]!);
        index += 1;
      }
      const html = await renderInline([{ kind: 'math', tex: math.join('\n') }]);
      blocks.push(html);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      await flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        await flushList();
        list = { items: [], ordered: isOrdered };
      }
      list.items.push((bullet?.[1] ?? ordered?.[1]) ?? '');
      continue;
    }

    if (line.trim() === '') {
      await flushAll();
      continue;
    }

    paragraph.push(line.trim());
  }
  await flushAll();
  return blocks.join('\n');
}
