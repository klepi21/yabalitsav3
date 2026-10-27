/**
 * Το slug της δημόσιας σελίδας κρατήσεων: /book/[slug].
 * Πεζά, χωρίς κενά. ΜΗΝ αλλάξει η μορφή: είναι τυπωμένο σε QR στα γήπεδα.
 */
export function venueSlug(name?: string | null): string {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '');
}
