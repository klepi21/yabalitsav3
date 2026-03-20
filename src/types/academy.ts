// ============================================
// Dynamic User Groups
// ============================================

// Field types supported in user group definitions
export type UserGroupFieldType = 'text' | 'email' | 'phone' | 'number' | 'select' | 'date' | 'textarea';

// A single field definition within a user group
export interface UserGroupField {
  key: string;           // unique field key for storage (e.g., 'email', 'birth_year')
  label: string;         // display label (e.g., 'Email', 'Έτος Γέννησης')
  type: UserGroupFieldType;
  required: boolean;
  options?: string[];    // for 'select' type
  placeholder?: string;
}

// Special capabilities a group can have (for built-in features)
export type GroupCapability = 'squad_assignment' | 'parent_linking' | 'coach_squads' | 'monthly_payment' | 'medical_tracking' | 'athlete_card' | 'player_evaluation';

// User Group definition - stored per venue in Firestore
export interface UserGroup {
  id: string;
  venueId: string;
  name: string;          // e.g., "Αθλητής"
  namePlural: string;    // e.g., "Αθλητές"
  icon: string;          // emoji
  color: string;         // tailwind color key (e.g., 'green', 'blue')
  fields: UserGroupField[];
  capabilities: GroupCapability[];  // special built-in features
  monthlyAmount?: number;  // default monthly fee for this group (used by monthly_payment capability)
  order: number;         // display order
  createdAt: Date;
  updatedAt: Date;
}

// Badge color mapping for group colors
export const GROUP_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  purple: 'bg-purple-100 text-purple-800',
  red: 'bg-red-100 text-red-800',
  pink: 'bg-pink-100 text-pink-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
  cyan: 'bg-cyan-100 text-cyan-800',
};

export const AVAILABLE_COLORS = Object.keys(GROUP_COLORS);

export const CAPABILITY_LABELS: Record<GroupCapability, { label: string; description: string }> = {
  squad_assignment: { label: 'Ανάθεση σε τμήμα', description: 'Οι χρήστες μπορούν να ανατεθούν σε τμήματα/ομάδες' },
  parent_linking: { label: 'Σύνδεση γονέα', description: 'Μπορούν να συνδεθούν ως γονείς αθλητών' },
  coach_squads: { label: 'Διαχείριση τμημάτων', description: 'Μπορούν να αναλάβουν τμήματα ως προπονητές' },
  monthly_payment: { label: 'Μηνιαία πληρωμή', description: 'Παρακολούθηση μηνιαίας συνδρομής' },
  medical_tracking: { label: 'Ιατρικό πιστοποιητικό', description: 'Παρακολούθηση λήξης ιατρικού πιστοποιητικού' },
  athlete_card: { label: 'Καρτέλα αθλητή', description: 'Προβολή πλήρους καρτέλας με στοιχεία, πληρωμές & πιστοποιητικά' },
  player_evaluation: { label: 'Αξιολόγηση αθλητή', description: 'Περιοδική αξιολόγηση δεξιοτήτων & κάρτα προόδου' },
};

export const ALL_CAPABILITIES: GroupCapability[] = ['squad_assignment', 'parent_linking', 'coach_squads', 'monthly_payment', 'medical_tracking', 'athlete_card', 'player_evaluation'];

export const AVAILABLE_ICONS = [
  '⚽', '🏆', '👨‍👩‍👧', '👤', '🏃', '🎓', '🏅', '💪',
  '🧑‍🏫', '🩺', '📋', '🎯', '🏟️', '⭐', '🔧', '📊',
];

// ============================================
// Academy User (generic, works with any group)
// ============================================

export interface UserDocument {
  name: string;        // original file name
  url: string;         // Firebase Storage download URL
  path: string;        // Storage path for deletion
  size: number;        // file size in bytes
  uploadedAt: string;  // ISO date string
}

export interface AcademyUser {
  id: string;
  groupId: string;       // references UserGroup.id
  displayName: string;
  venueId: string;
  fields: Record<string, string | number | null>;  // dynamic field values
  documents?: UserDocument[];  // uploaded PDF files
  // Special relationship fields (used by capabilities)
  squad_id?: string;       // legacy single squad
  squad_ids?: string[];    // multiple squad assignment
  parent_uid?: string;
  linked_athletes?: string[];
  assigned_squads?: string[];
  lastMedicalNotifiedAt?: string;  // ISO date — last medical cert reminder sent
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Squad (unchanged)
// ============================================

export interface Squad {
  id: string;
  name: string;
  venueId: string;
  ageGroup: string;
  coachIds: string[];
  paymentsEnabled?: boolean;  // whether this squad appears in payments dashboard
  monthlyAmount?: number;  // monthly fee for athletes in this squad
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Default Groups (seeded per venue)
// ============================================

export const DEFAULT_GROUPS: Omit<UserGroup, 'id' | 'venueId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Αθλητής',
    namePlural: 'Αθλητές',
    icon: '⚽',
    color: 'green',
    order: 1,
    capabilities: ['squad_assignment', 'parent_linking'],
    fields: [
      { key: 'birth_year', label: 'Έτος Γέννησης', type: 'number', required: true, placeholder: 'π.χ. 2012' },
      { key: 'medical_cert_expiry', label: 'Λήξη Ιατρικού Πιστοποιητικού', type: 'date', required: false },
    ],
  },
  {
    name: 'Γονέας',
    namePlural: 'Γονείς',
    icon: '👨‍👩‍👧',
    color: 'amber',
    order: 2,
    capabilities: [],
    fields: [
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'goneas@email.gr' },
      { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
      { key: 'address', label: 'Διεύθυνση', type: 'textarea', required: true, placeholder: 'Πλήρης διεύθυνση κατοικίας' },
    ],
  },
  {
    name: 'Προπονητής',
    namePlural: 'Προπονητές',
    icon: '🏆',
    color: 'blue',
    order: 3,
    capabilities: ['coach_squads'],
    fields: [
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'coach@academy.gr' },
      { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
      {
        key: 'specialization', label: 'Ειδικότητα', type: 'select', required: true,
        options: ['Αρχηγός Προπονητής', 'Βοηθός Προπονητής', 'Προπονητής Τερματοφύλακα', 'Γυμναστής', 'Τεχνικός Προπονητής', 'Προπονητής Ακαδημιών'],
      },
      {
        key: 'license', label: 'Δίπλωμα', type: 'select', required: true,
        options: ['Χωρίς Δίπλωμα', 'Εθνικό D', 'Εθνικό C', 'UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro'],
      },
    ],
  },
  {
    name: 'Διαχειριστής',
    namePlural: 'Διαχειριστές',
    icon: '👤',
    color: 'purple',
    order: 4,
    capabilities: [],
    fields: [
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'admin@academy.gr' },
      { key: 'phone', label: 'Τηλέφωνο', type: 'phone', required: true, placeholder: '69x xxx xxxx' },
    ],
  },
];

// ============================================
// Academy Payment (monthly fee tracking)
// ============================================

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Μετρητά',
  bank_transfer: 'Τραπεζική Μεταφορά',
  card: 'Κάρτα',
  other: 'Άλλο',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: '💵',
  bank_transfer: '🏦',
  card: '💳',
  other: '📋',
};

export interface AcademyPayment {
  id: string;
  venueId: string;
  userId: string;        // references AcademyUser.id
  userName: string;      // denormalized for display
  month: string;         // format: "YYYY-MM" (e.g., "2026-03")
  amount: number;        // payment amount in euros
  paid: boolean;
  paidAt?: string;       // ISO date string
  paymentMethod?: PaymentMethod;  // how the payment was made
  notes?: string;
  lastNotifiedAt?: string;  // ISO date string — last time a payment reminder was sent
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Broadcast (squad/academy announcements)
// ============================================

export interface Broadcast {
  id: string;
  venueId: string;
  squadId?: string;        // null = whole academy
  squadName?: string;
  subject: string;
  message: string;
  template?: string;       // template key used
  recipientCount: number;
  recipientEmails: string[];
  sentBy: string;          // venue owner name
  createdAt: Date;
}

export const BROADCAST_TEMPLATES: { key: string; label: string; subject: string; message: string }[] = [
  {
    key: 'cancel_training',
    label: 'Ακύρωση Προπόνησης',
    subject: 'Ακύρωση Προπόνησης',
    message: 'Σας ενημερώνουμε ότι η σημερινή προπόνηση ακυρώνεται λόγω καιρικών συνθηκών. Θα σας ενημερώσουμε για την επόμενη προπόνηση.',
  },
  {
    key: 'time_change',
    label: 'Αλλαγή Ώρας',
    subject: 'Αλλαγή Ώρας Προπόνησης',
    message: 'Σας ενημερώνουμε ότι η ώρα της προπόνησης έχει αλλάξει.',
  },
  {
    key: 'general',
    label: 'Γενική Ανακοίνωση',
    subject: 'Ανακοίνωση',
    message: '',
  },
];

// ============================================
// Player Evaluation
// ============================================

export interface EvaluationSkill {
  key: string;        // unique key (e.g., 'passing', 'shooting')
  label: string;      // display name (e.g., 'Πάσα', 'Σουτ')
}

// Template that defines which skills to evaluate — per venue
export interface EvaluationTemplate {
  id: string;
  venueId: string;
  name: string;       // e.g., 'Αξιολόγηση Ποδοσφαίρου'
  skills: EvaluationSkill[];
  createdAt: Date;
  updatedAt: Date;
}

// A single evaluation for a player
export interface PlayerEvaluation {
  id: string;
  venueId: string;
  athleteId: string;
  athleteName: string;       // denormalized
  squadId: string;
  squadName: string;         // denormalized
  coachId: string;
  coachName: string;         // denormalized
  templateId: string;
  period: string;            // e.g., '2026-Q1', '2026-Q2'
  periodLabel: string;       // e.g., 'Ιαν-Μαρ 2026'
  ratings: Record<string, number>;  // skill key → 1-5
  notes: string;             // coach comments
  sentAt?: string;           // ISO date when PDF was sent to parent
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_EVALUATION_SKILLS: EvaluationSkill[] = [
  { key: 'technique', label: 'Τεχνική' },
  { key: 'passing', label: 'Πάσα' },
  { key: 'shooting', label: 'Σουτ' },
  { key: 'speed', label: 'Ταχύτητα' },
  { key: 'stamina', label: 'Αντοχή' },
  { key: 'tactical', label: 'Τακτική' },
  { key: 'teamwork', label: 'Ομαδικότητα' },
  { key: 'discipline', label: 'Πειθαρχία' },
];

export const EVALUATION_PERIODS = [
  { value: 'Q1', label: 'Ιαν - Μαρ' },
  { value: 'Q2', label: 'Απρ - Ιουν' },
  { value: 'Q3', label: 'Ιουλ - Σεπ' },
  { value: 'Q4', label: 'Οκτ - Δεκ' },
];

// Legacy type aliases for backward compatibility
export type AcademyUserRole = 'admin' | 'coach' | 'parent' | 'athlete';
export type ParentUser = AcademyUser & { fields: { email: string; phone: string; address: string } };
export type CoachUser = AcademyUser & { fields: { email: string; phone: string; specialization: string; license: string } };
