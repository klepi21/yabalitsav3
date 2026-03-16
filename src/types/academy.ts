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
export type GroupCapability = 'squad_assignment' | 'parent_linking' | 'coach_squads';

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

// Legacy type aliases for backward compatibility
export type AcademyUserRole = 'admin' | 'coach' | 'parent' | 'athlete';
export type ParentUser = AcademyUser & { fields: { email: string; phone: string; address: string } };
export type CoachUser = AcademyUser & { fields: { email: string; phone: string; specialization: string; license: string } };
