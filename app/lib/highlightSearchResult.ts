function getRegEx(query: string) {
  const words = query.split(/\s/).filter((s) => !!s);
  if (words.length === 0) {
    return null;
  }

  return new RegExp(words.map((s) => `\\b(${s})\\b`).join('|'), 'gi');
}

function getMatches({ content, regEx }: { content: string; regEx: RegExp }) {
  const matchArray = [];
  let match;
  do {
    match = regEx.exec(content);
    if (match) {
      matchArray.push(match);
    }
  } while (match);

  return matchArray;
}

function highlightSearchResult({
  query,
  content,
  regEx,
  isDiscussion,
}: {
  query: string;
  content: string;
  regEx?: RegExp;
  isDiscussion: boolean;
}): string {
  if (!regEx) {
    regEx = getRegEx(query);
  }

  if (!regEx) {
    return '';
  }

  content = content
    .replace(/<(?:.|\n)*?>/gm, ' ')
    .replace(/\s/g, ' ')
    .replace(/[ ]+/g, ' ');

  const matchArray = getMatches({ content, regEx });

  let matchStr = '';
  matchArray.forEach((m) => {
    matchStr += isDiscussion ? '' : '<li>';

    const prevSpaceIndex = content.lastIndexOf(' ', m.index - 25);
    if (prevSpaceIndex !== -1) {
      matchStr += ' ';
    }

    const nextSpaceIndex = content.indexOf(' ', m.index + m[0].length + 25);
    let nextWords;
    if (nextSpaceIndex === -1) {
      nextWords = content.substring(m.index + m[0].length);
    } else {
      nextWords = content.substring(m.index + m[0].length, nextSpaceIndex + 1);
    }

    matchStr += `${content.substring(prevSpaceIndex + 1, m.index)}<b style="font-size: 18px">${
      m[0]
    }</b>${nextWords}`;

    if (nextSpaceIndex !== -1) {
      matchStr += ' ...';
    }

    matchStr += isDiscussion ? '' : '</li>';
  });

  return matchStr;
}

function getFirst100(content: string) {
  content = content
    .replace(/<(?:.|\n)*?>/gm, '')
    .replace(/\s/g, ' ')
    .replace(/[ ]+/g, ' ');

  const spaceIndex = content.indexOf(' ', 100);
  let excerpt;
  if (spaceIndex === -1) {
    excerpt = content;
  } else {
    excerpt = `${content.substring(0, spaceIndex)} ...`;
  }

  return `<p>${excerpt}</p>`;
}

export { highlightSearchResult, getFirst100, getRegEx };
