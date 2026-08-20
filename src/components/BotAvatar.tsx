/**
 * Το εικονίδιο του βοηθού — όγκος με CSS, όχι WebGL.
 *
 * Απορρίφθηκε το πραγματικό 3D (three.js / Spline): θα πρόσθετε 400KB–1MB
 * και θα κρατούσε ένα WebGL context ζωντανό σε κάθε σελίδα του
 * dashboard, ενώ σε πλάτος 56px η γεωμετρία δεν γίνεται καν αντιληπτή.
 * Η αίσθηση βάθους εδώ χτίζεται με προοπτική, βαθμώσεις και σκίαση.
 *
 * Το `--bot-face` ορίζεται από το κουμπί που το φιλοξενεί, ώστε τα μάτια
 * να διαβάζονται ως κοψίματα στο φόντο και όχι ως κηλίδες.
 */
export default function BotAvatar({
  className = 'h-8 w-8',
  animated = true,
  id = 'bot',
}: {
  className?: string;
  animated?: boolean;
  /** Ξεχωριστό πρόθεμα όταν υπάρχουν πολλά bot στην ίδια σελίδα. */
  id?: string;
}) {
  const shell = `${id}-shell`;
  const gloss = `${id}-gloss`;

  return (
    <div className={`${className} ${animated ? 'bot-stage' : ''}`}>
      <svg viewBox="0 0 34 34" className={animated ? 'bot-body h-full w-full' : 'h-full w-full'} fill="none" aria-hidden="true">
        <defs>
          {/* Κύριος όγκος: φως από πάνω αριστερά, σκιά κάτω δεξιά. */}
          <linearGradient id={shell} x1="8" y1="6" x2="27" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity="1" />
            <stop offset="0.55" stopColor="currentColor" stopOpacity="0.93" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.72" />
          </linearGradient>
          {/* Κάτοπτρο στην κορυφή — δίνει την καμπύλη. */}
          <linearGradient id={gloss} x1="17" y1="7" x2="17" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* σκιά στο έδαφος */}
        <ellipse cx="17" cy="30.4" rx="8.4" ry="1.5" fill="currentColor" opacity="0.16" />

        {/* κεραία */}
        <path d="M17 7.6V4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
        <circle cx="17" cy="3.2" r="1.9" fill="currentColor" className={animated ? 'bot-antenna' : ''} />

        {/* αυτιά — πιο σκούρα, «πίσω» από το κεφάλι */}
        <rect x="2.4" y="14" width="2.8" height="6.4" rx="1.4" fill="currentColor" opacity="0.55" />
        <rect x="28.8" y="14" width="2.8" height="6.4" rx="1.4" fill="currentColor" opacity="0.55" />

        {/* κεφάλι */}
        <rect x="5" y="7.6" width="24" height="18.4" rx="6.4" fill={`url(#${shell})`} />
        {/* λάμψη κορυφής */}
        <rect x="7" y="8.6" width="20" height="8" rx="4" fill={`url(#${gloss})`} />

        {/* πρόσωπο */}
        <rect
          x="10.8" y="13.4" width="3.5" height="5.2" rx="1.75"
          fill="var(--bot-face, #2f6b09)"
          className={animated ? 'bot-eye' : ''}
        />
        <rect
          x="19.7" y="13.4" width="3.5" height="5.2" rx="1.75"
          fill="var(--bot-face, #2f6b09)"
          className={animated ? 'bot-eye bot-eye--right' : ''}
        />
        <path
          d="M13.2 21.4c2 1.8 5.6 1.8 7.6 0"
          stroke="var(--bot-face, #2f6b09)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        {/* λεπτό φωτεινό χείλος κάτω — ανάκλαση, βαθαίνει το σχήμα */}
        <path
          d="M8.4 25.2h17.2"
          stroke="#fff"
          strokeOpacity="0.28"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
