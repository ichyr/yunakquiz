/** The longest slug the generator makes. The API accepts more; this keeps links readable. */
export const GENERATED_SLUG_MAX_LENGTH = 80;

// Ukrainian national transliteration (Cabinet of Ministers resolution 55, 2010). Letters whose
// spelling depends on their place in the word are in `atWordStart` and `elsewhere`.
const plain: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  "'": '',
  ʼ: '',
  '’': '',
  '`': '',
};
const atWordStart: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };
const elsewhere: Record<string, string> = { є: 'ie', ї: 'i', й: 'i', ю: 'iu', я: 'ia' };
const apostrophes = new Set(["'", 'ʼ', '’', '`']);

const isLetter = (char: string | undefined) => char !== undefined && /\p{L}/u.test(char);

/**
 * A slug for a Quiz title: Ukrainian transliterated to Latin, other characters collapsed to
 * single hyphens. Returns an empty string when the title has nothing usable.
 */
export function slugFromTitle(title: string): string {
  const chars = [...title.toLowerCase().normalize('NFC')];
  let out = '';
  chars.forEach((char, index) => {
    const previous = chars[index - 1];
    if (char === 'г' && previous === 'з') {
      // зг is written zgh, so the г after з is "gh", not "h".
      out += 'gh';
      return;
    }
    const wordStart = !isLetter(previous) && !(previous !== undefined && apostrophes.has(previous));
    const mapped = (wordStart ? atWordStart[char] : elsewhere[char]) ?? plain[char];
    if (mapped !== undefined) out += mapped;
    else out += /[a-z0-9]/.test(char) ? char : '-';
  });
  const slug = out.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug.slice(0, GENERATED_SLUG_MAX_LENGTH).replace(/-$/, '');
}

/** Attempt 1 is the base itself; attempt 2 and up add a numeric suffix: `base-2`, `base-3`. */
export function slugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return `${base.slice(0, GENERATED_SLUG_MAX_LENGTH - suffix.length).replace(/-$/, '')}${suffix}`;
}
