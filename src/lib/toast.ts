import { toast as sonner } from 'sonner';

/**
 * Λεπτό wrapper ώστε τα μηνύματα να είναι συνεπή σε όλη την εφαρμογή
 * και να μπορούμε να αλλάξουμε βιβλιοθήκη από ένα σημείο.
 */
export const toast = {
  success: (message: string, description?: string) => sonner.success(message, { description }),
  error: (message: string, description?: string) => sonner.error(message, { description }),
  warning: (message: string, description?: string) => sonner.warning(message, { description }),
  info: (message: string, description?: string) => sonner.info(message, { description }),
  loading: (message: string) => sonner.loading(message),
  dismiss: (id?: string | number) => sonner.dismiss(id),
  promise: sonner.promise,
};
