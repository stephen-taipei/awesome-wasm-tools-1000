import { parse } from 'parse5';
import { elements, attr, escapeHtml } from './catalog.mjs';
import { homepageDescription, siteCopy } from '../src/i18n/site-copy.js';

/**
 * Keep the original category-home HTML as the visual template.
 * Patch only factual copy during dev/build, including the no-JavaScript output.
 * Replacing source ranges preserves all original elements, classes and ordering.
 */
export function repairHomepageCopy(html, toolCount) {
  if (!Number.isSafeInteger(toolCount) || toolCount < 0) throw new TypeError('Invalid tool count');
  const nodes = elements(parse(html, { sourceCodeLocationInfo: true }));
  const edits = [];
  const replaceContent = (node, content) => {
    const location = node.sourceCodeLocation;
    if (location?.startTag && location?.endTag) edits.push([location.startTag.endOffset, location.endTag.startOffset, content]);
  };
  for (const node of nodes) {
    const copy = siteCopy['zh-TW'][attr(node, 'data-i18n')];
    if (copy) replaceContent(node, escapeHtml(copy));
    if (node.tagName === 'meta' && [attr(node, 'name'), attr(node, 'property')].some(key => ['description', 'og:description', 'twitter:description'].includes(key))) {
      const range = node.sourceCodeLocation?.attrs?.content;
      if (range) edits.push([range.startOffset, range.endOffset, `content="${escapeHtml(homepageDescription)}"`]);
    }
    if (node.tagName === 'script' && attr(node, 'type') === 'application/ld+json') {
      const location = node.sourceCodeLocation;
      const data = JSON.parse(html.slice(location.startTag.endOffset, location.endTag.startOffset));
      for (const item of data['@graph'] || []) {
        if (['WebSite', 'CollectionPage'].includes(item['@type'])) item.description = homepageDescription;
        if (item['@type'] === 'FAQPage') {
          for (const [index, question] of (item.mainEntity || []).entries()) {
            const answer = siteCopy['zh-TW'][`faq_a${index + 1}`];
            if (answer && question.acceptedAnswer) question.acceptedAnswer.text = answer;
          }
        }
      }
      replaceContent(node, '\n' + JSON.stringify(data, null, 2).replace(/</g, '\\u003c') + '\n');
    }
    if (node.tagName === 'footer' && attr(node, 'class') === 'footer') {
      const summary = (node.childNodes || []).find(child => child.tagName === 'p' && child.childNodes?.some(n => n.tagName === 'strong'));
      if (summary) replaceContent(summary, `工具頁面 <strong>${toolCount}</strong> 個，功能狀態請見各工具頁`);
    }
  }
  for (const [start, end, content] of edits.sort((a, b) => b[0] - a[0])) html = html.slice(0, start) + content + html.slice(end);
  return html;
}
