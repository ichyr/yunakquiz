# Search uses Postgres trigrams

Quiz search matches title and description using Postgres with the `pg_trgm` extension (partial, case-insensitive matching). We don't use Postgres full-text search because Postgres has no built-in Ukrainian dictionary, and Quizzes may be written in any language. We don't use a separate search engine because the catalog is small and one fewer service matters more than ranking quality. Reconsider if the catalog grows large or relevance ranking becomes important.
