'use client';

import { useMemo, useState } from 'react';

export interface PaginationState<T> {
  /** Τα στοιχεία της τρέχουσας σελίδας. */
  items: T[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  /** 1-based δείκτες για την ένδειξη «X–Y από Z». */
  from: number;
  to: number;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * Σελιδοποίηση πάνω σε ήδη φορτωμένη, φιλτραρισμένη λίστα.
 *
 * Γιατί client-side: η αναζήτηση και τα φίλτρα τρέχουν στη μνήμη, και το
 * Firestore δεν υποστηρίζει αναζήτηση υποσυμβολοσειράς. Server-side
 * σελιδοποίηση εδώ θα έσπαγε την αναζήτηση. Ο περιορισμός όγκου γίνεται
 * στο API με χρονικό παράθυρο· εδώ περιορίζουμε το DOM.
 */
export function usePagination<T>(source: T[], initialPageSize = 25): PaginationState<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = source.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Όταν αλλάξει το φίλτρο, επιστροφή στην πρώτη σελίδα. Γίνεται κατά το
  // render (το πρότυπο «adjusting state on change» του React) και όχι σε
  // effect, ώστε να μη μεσολαβεί ένα καρέ με λάθος σελίδα.
  const [lastTotal, setLastTotal] = useState(total);
  if (lastTotal !== total) {
    setLastTotal(total);
    setPage(1);
  }

  const items = useMemo(() => {
    const start = (Math.min(page, pageCount) - 1) * pageSize;
    return source.slice(start, start + pageSize);
  }, [source, page, pageCount, pageSize]);

  const safePage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    items,
    page: safePage,
    pageCount,
    pageSize,
    total,
    from,
    to,
    setPage: (p) => setPage(Math.min(Math.max(1, p), pageCount)),
    setPageSize: (n) => {
      setPageSize(n);
      setPage(1);
    },
    canPrev: safePage > 1,
    canNext: safePage < pageCount,
  };
}
