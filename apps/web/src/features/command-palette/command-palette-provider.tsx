'use client';

import { useCallback, useState } from 'react';
import { CommandPalette } from './command-palette';
import { useService } from '@/providers/service-provider';
import type { SearchService } from '@/services/search/search-service';

export function CommandPaletteProvider() {
  const [open, setOpen] = useState(false);
  const searchService = useService<SearchService>('search');

  const handleSearch = useCallback((q: string) => searchService.query(q), [searchService]);

  const handleSelect = useCallback((item: { action: () => void }) => item.action(), []);

  return (
    <>
      <button data-command-palette-trigger className="hidden" onClick={() => setOpen(true)} />
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={handleSearch}
        onSelect={handleSelect}
        recentItems={searchService.query('').slice(0, 5)}
      />
    </>
  );
}
