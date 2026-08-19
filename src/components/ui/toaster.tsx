'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * Ένα σημείο για όλη την ανατροφοδότηση της εφαρμογής.
 * Πριν: δεν υπήρχε καθόλου toast — κάθε επιτυχία/σφάλμα κατέληγε
 * είτε σε native window.alert() είτε σε τίποτα.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      duration={4500}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group flex items-start gap-3 w-full rounded-xl border border-border bg-white p-4 shadow-[0_12px_28px_-8px_rgb(24_24_27/0.12),0_4px_10px_-4px_rgb(24_24_27/0.05)]',
          title: 'text-sm font-semibold text-zinc-900',
          description: 'text-xs text-zinc-600 mt-0.5 leading-relaxed',
          actionButton: 'text-xs font-semibold',
          cancelButton: 'text-xs font-medium',
          closeButton: 'border-border bg-white text-zinc-500 hover:text-zinc-900',
          success: '[&_[data-icon]]:text-emerald-600',
          error: '[&_[data-icon]]:text-red-600',
          warning: '[&_[data-icon]]:text-amber-600',
          info: '[&_[data-icon]]:text-blue-700',
        },
      }}
    />
  );
}
