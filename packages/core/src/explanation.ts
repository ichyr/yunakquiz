/** Splits an Explanation into paragraphs at blank lines, as seed files write them. */
export function explanationParagraphs(explanation: string): string[] {
  return explanation
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}
