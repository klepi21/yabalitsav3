'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaginationState } from '@/hooks/usePagination';

const PAGE_SIZES = [25, 50, 100];

/** Παράγει τους αριθμούς σελίδων με «…» ώστε να μην ξεχειλίζει η μπάρα. */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', pageCount];
  if (page >= pageCount - 3) return [1, 'gap', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, 'gap', page - 1, page, page + 1, 'gap', pageCount];
}

export function Pagination<T>({
  state,
  label = 'εγγραφές',
  showPageSize = true,
  className,
}: {
  state: PaginationState<T>;
  /** Ουσιαστικό στον πληθυντικό, π.χ. «κρατήσεις». */
  label?: string;
  showPageSize?: boolean;
  className?: string;
}) {
  const { page, pageCount, total, from, to, setPage, setPageSize, pageSize, canPrev, canNext } = state;

  if (total === 0) return null;

  return (
    <nav
      aria-label="Σελιδοποίηση"
      className={cn(
        'flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-border',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <p className="text-xs text-zinc-600" aria-live="polite">
          <span className="font-semibold text-zinc-900">{from}–{to}</span> από{' '}
          <span className="font-semibold text-zinc-900">{total}</span> {label}
        </p>

        {showPageSize && total > PAGE_SIZES[0] && (
          <label className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="sr-only">Εγγραφές ανά σελίδα</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / σελίδα
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={!canPrev}
            aria-label="Προηγούμενη σελίδα"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {pageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1.5 text-xs text-zinc-400" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Σελίδα ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs transition-colors',
                  p === page
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'border border-border bg-white text-zinc-700 font-medium hover:bg-zinc-50'
                )}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={!canNext}
            aria-label="Επόμενη σελίδα"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
