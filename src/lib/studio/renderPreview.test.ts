import { describe, expect, it } from 'vitest';

import { renderPreview } from './renderPreview';

describe('renderPreview', () => {
  it('escapes raw HTML before any transformation', async () => {
    const html = await renderPreview('<img src=x onerror="alert(1)">');
    expect(html).toBe('<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
  });

  it('renders headings, emphasis, code, and lists', async () => {
    const html = await renderPreview(
      ['## 데이터에서 직선 찾기', '', '**굵게**와 *기울임*, `wx + b`', '', '- 첫째', '- 둘째'].join('\n'),
    );
    expect(html).toContain('<h3>데이터에서 직선 찾기</h3>');
    expect(html).toContain('<strong>굵게</strong>');
    expect(html).toContain('<em>기울임</em>');
    expect(html).toContain('<code>wx + b</code>');
    expect(html).toMatch(/<ul><li>첫째<\/li><li>둘째<\/li><\/ul>/);
  });

  it('keeps fenced code blocks verbatim and escaped', async () => {
    const html = await renderPreview(['```ts', 'const a = "<b>";', '```'].join('\n'));
    expect(html).toContain('<pre><code>const a = &quot;&lt;b&gt;&quot;;</code></pre>');
  });

  it('renders display math through katex without throwing on bad input', async () => {
    const html = await renderPreview(['$$', '\\hat{y} = wx + b', '$$'].join('\n'));
    expect(html).toContain('katex');
  });

  it('renders inline math', async () => {
    const html = await renderPreview('예측은 $\\hat{y}$ 입니다.');
    expect(html).toMatch(/^<p>예측은 <span[^>]*>.*hat.*<\/span> 입니다\.<\/p>$/s);
  });
});
