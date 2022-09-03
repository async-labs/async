// random string
// check if doc exists, generate again

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with -
    .replace(/\s+/g, '-')
    // Replace & with 'and'
    .replace(/&/g, '-and-')
    // Remove all non-word chars
    .replace(/(?!\w)[\x00-\xC0]/g, '-') // eslint-disable-line
    // Replace multiple - with single -
    .trim('-')
    .replace(/\-\-+/g, '-') // eslint-disable-line
    // Remove - from start & end
    .replace(/-$/, '')
    .replace(/^-/, '');

async function generateSlug(Model, filter = {}) {
  const origSlug =
    Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

  const existingDoc = await Model.findOne({ slug: origSlug, ...filter }).setOptions({ lean: true });

  if (!existingDoc) {
    return origSlug;
  }

  return generateSlug(Model, filter);
}

export { generateSlug, slugify };
