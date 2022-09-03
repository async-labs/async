import * as he from 'he';
import hljs from 'highlight.js/lib/common';
import { marked } from 'marked';

function markdownToHtml(content: string) {
  const renderer = new marked.Renderer();

  renderer.link = (href, title, text) => {
    const t = title ? ` title="${title}"` : '';

    if (text.startsWith('<code>@#')) {
      return `${text.replace('<code>@#', '<code>@')} `;
    }

    return `
      <a target="_blank" href="${href}" style="color: #0077ff; cursor: pointer;" rel="nofollow noopener noreferrer"${t}>
        ${text}
      </a>
    `;
  };

  renderer.listitem = (text) => {
    const regex1 = RegExp('^<input disabled="" type="checkbox">');
    const regex2 = RegExp('^<input checked="" disabled="" type="checkbox">');

    if (regex1.test(text) || regex2.test(text)) {
      return `<li style="list-style: none; margin-left: -24px">${text}</li>`;
    }

    return `<li>${text}</li>`;
  };

  marked.setOptions({
    renderer,
    breaks: true,
    highlight(code, lang) {
      if (!lang) {
        return hljs.highlightAuto(code).value;
      }

      return hljs.highlight(lang, code).value;
    },
  });

  return marked(he.decode(content));
}

export { markdownToHtml };
