import { SearchIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchFormProps {
  /** The query in the address. When it changes, the text resets to it. */
  addressQuery?: string;
  onSearch: (query: string) => void;
}

/** Searches on submit (Enter or the button), not while typing. */
export function SearchForm({ addressQuery = '', onSearch }: SearchFormProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(addressQuery);
  // The query the text last matched: the address, or what was just submitted. Submitting
  // records it before the address renders, so Back to the old address still differs and
  // resets the text even if React never rendered the in-between address.
  const [syncedQuery, setSyncedQuery] = useState(addressQuery);
  if (syncedQuery !== addressQuery) {
    setSyncedQuery(addressQuery);
    setQuery(addressQuery);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncedQuery(query.trim());
    onSearch(query.trim());
  }

  return (
    <search>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          className="h-10"
        />
        <Button type="submit" size="lg">
          <SearchIcon aria-hidden />
          <span className="sr-only sm:not-sr-only">{t('search.submit')}</span>
        </Button>
      </form>
    </search>
  );
}
