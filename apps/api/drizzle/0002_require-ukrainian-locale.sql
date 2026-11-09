-- Lists are sorted by the database's default collation (see the quiz-api spec), so the database
-- must be created with the ICU provider and the uk-UA locale. A locale cannot be changed after
-- creation; fail here, before any data exists, instead of silently sorting by code point.
DO $$
DECLARE
  provider "char";
  locale text;
BEGIN
  SELECT datlocprovider, datlocale INTO provider, locale
  FROM pg_database WHERE datname = current_database();

  IF provider IS DISTINCT FROM 'i' OR locale IS DISTINCT FROM 'uk-UA' THEN
    RAISE EXCEPTION
      'Database % must be created WITH LOCALE_PROVIDER icu ICU_LOCALE ''uk-UA'' (found provider %, locale %). With Docker, initdb needs --locale-provider=icu --icu-locale=uk-UA; recreate the volume.',
      current_database(), provider, locale;
  END IF;
END
$$;
