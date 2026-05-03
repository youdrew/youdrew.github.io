/**
 * Collect headings from the article body and build hierarchy info.
 *
 * Returns an array of {element, level, index, id, text, number} where
 * `number` is the dotted path like "1", "1.2", "1.2.1" matching the
 * heading's position in the outline tree.
 *
 * IDs already present on the heading are preserved so existing anchor
 * links keep working; missing IDs get filled in as `heading-${index}`.
 */
export function collectHeadings(content) {
  const nodes = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const counters = [0, 0, 0, 0, 0, 0]; // index 0..5 for h1..h6
  const parentStack = [];

  return Array.from(nodes).map((element, index) => {
    const level = parseInt(element.tagName[1], 10);

    counters[level - 1] += 1;
    for (let l = level; l < 6; l += 1) counters[l] = 0;

    while (parentStack.length > level - 1) parentStack.pop();
    parentStack.push(counters[level - 1]);

    if (!element.id) element.id = `heading-${index}`;

    return {
      element,
      level,
      index,
      id: element.id,
      text: element.textContent,
      number: parentStack.join('.'),
    };
  });
}
