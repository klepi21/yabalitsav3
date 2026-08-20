import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toGreekUpperCase(str: string): string {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}


/**
 * «1 ημέρα» / «5 ημέρες». Γράφεται σε ένα σημείο ώστε να μη χρειάζεται
 * να θυμάται κανείς τον ενικό σε κάθε νέο μήνυμα.
 */
export function days(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'ημέρα' : 'ημέρες'}`;
}
