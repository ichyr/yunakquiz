// One Intl.DisplayNames per Interface Language, created on first use.
const displayNamesByLocale = new Map<string, Intl.DisplayNames>();

/** Names a language code in the given locale, e.g. "українська" or "Ukrainian". */
export function languageName(code: string, locale: string): string {
  let displayNames = displayNamesByLocale.get(locale);
  if (!displayNames) {
    displayNames = new Intl.DisplayNames([locale], { type: 'language' });
    displayNamesByLocale.set(locale, displayNames);
  }
  return displayNames.of(code) ?? code;
}
