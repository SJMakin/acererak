import { expect, test } from '@playwright/test';
import { parseMarkdown } from '../../src/components/MarkdownEditor';

test.describe('safe Markdown preview', () => {
  test('escapes raw HTML in text and formatting', () => {
    const rendered = parseMarkdown('# <img src=x onerror=alert(1)>\n\n**<script>x</script>**');

    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<script');
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(rendered).toContain('<strong>&lt;script&gt;x&lt;/script&gt;</strong>');
  });

  test('allows only escaped HTTP and HTTPS links', () => {
    const rendered = parseMarkdown([
      '[safe](https://example.com/path?q=one&next=two)',
      '[quoted](https://example.com/" onmouseover="alert(1))',
      '[script](javascript:alert(1))',
      '[data](data:text/html,boom)',
    ].join('\n'));

    expect(rendered).toContain('href="https://example.com/path?q=one&amp;next=two"');
    expect(rendered).toContain('/%22%20onmouseover=%22alert(1');
    expect(rendered).not.toContain(' onmouseover="');
    expect(rendered).not.toContain('href="javascript:');
    expect(rendered).not.toContain('href="data:');
    expect(rendered).toContain('<br>script)');
    expect(rendered).toContain('<br>data');
  });

  test('adds isolation attributes to external links', () => {
    const rendered = parseMarkdown('[site](http://example.com)');

    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noopener noreferrer"');
  });
});
