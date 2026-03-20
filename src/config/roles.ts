// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC) CONFIG
// ============================================
// Central configuration for all role permissions.
// Add new roles here — sidebar, routes, and features
// will automatically adapt.
// ============================================

export type AppRole = 'admin' | 'coach';

// ============================================
// ROUTE PERMISSIONS
// ============================================
// Define which routes each role can access.
// Supports exact matches and prefix matches (ending with *)

export const ROUTE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: [
    '/management/*',  // Full access
  ],
  coach: [
    '/management/dashboard',
    '/management/academy/squads',
    '/management/academy/squads/*',
    '/management/academy/training',
    '/management/academy/training/*',
    '/management/academy/medical',
    '/management/academy/medical/*',
    '/management/academy/evaluations',
    '/management/academy/evaluations/*',
  ],
};

// ============================================
// SIDEBAR VISIBILITY
// ============================================
// Controls which sidebar items each role can see.
// Uses the same href/path as the navigation items.

export const SIDEBAR_PERMISSIONS: Record<AppRole, {
  // Top-level items visible (by href)
  visibleRoutes: string[];
  // Academy sub-items visible (by href)
  visibleAcademyRoutes: string[];
  // Show QR code card
  showQrCard: boolean;
  // Show Online Bookings toggle
  showBookingsToggle: boolean;
  // Show plan/subscription info in top bar
  showPlanInfo: boolean;
}> = {
  admin: {
    visibleRoutes: [
      '/management/dashboard',
      '/management/pitches',
      '/management/bookings',
      '/management/customers',
      '/management/tournaments',
      '/management/reports',
      '/management/settings',
    ],
    visibleAcademyRoutes: [
      '/management/academy/users',
      '/management/academy/squads',
      '/management/academy/user-groups',
      '/management/academy/training',
      '/management/academy/payments',
      '/management/academy/medical',
      '/management/academy/evaluations',
    ],
    showQrCard: true,
    showBookingsToggle: true,
    showPlanInfo: true,
  },
  coach: {
    visibleRoutes: [
      '/management/dashboard',
    ],
    visibleAcademyRoutes: [
      '/management/academy/squads',
      '/management/academy/training',
      '/management/academy/medical',
      '/management/academy/evaluations',
    ],
    showQrCard: false,
    showBookingsToggle: false,
    showPlanInfo: false,
  },
};

// ============================================
// FEATURE PERMISSIONS
// ============================================
// Granular feature-level permissions per role.

export const FEATURE_PERMISSIONS: Record<AppRole, {
  // Academy
  canManageUsers: boolean;        // Create/edit/delete academy users
  canManageUserGroups: boolean;   // Create/edit user group categories
  canManageSquads: boolean;       // Create/edit squads
  canViewSquads: boolean;         // View squad list & details
  canManageTraining: boolean;     // Create/edit training sessions
  canViewTraining: boolean;       // View training sessions
  canTakeAttendance: boolean;     // Mark attendance
  canManagePayments: boolean;     // View/manage academy payments
  canViewMedical: boolean;        // View medical certificates
  canManageMedical: boolean;      // Edit medical certificate dates
  canEvaluatePlayers: boolean;    // Create/edit evaluations
  canViewEvaluations: boolean;    // View evaluations
  canSendBroadcasts: boolean;     // Send broadcast messages
  canSendNotifications: boolean;  // Send payment/medical email reminders

  // Bookings & Venue
  canManageBookings: boolean;
  canManagePitches: boolean;
  canManageCustomers: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;

  // Tournaments
  canManageTournaments: boolean;

  // Invitations
  canInviteCoaches: boolean;
}> = {
  admin: {
    canManageUsers: true,
    canManageUserGroups: true,
    canManageSquads: true,
    canViewSquads: true,
    canManageTraining: true,
    canViewTraining: true,
    canTakeAttendance: true,
    canManagePayments: true,
    canViewMedical: true,
    canManageMedical: true,
    canEvaluatePlayers: true,
    canViewEvaluations: true,
    canSendBroadcasts: true,
    canSendNotifications: true,
    canManageBookings: true,
    canManagePitches: true,
    canManageCustomers: true,
    canViewReports: true,
    canManageSettings: true,
    canManageTournaments: true,
    canInviteCoaches: true,
  },
  coach: {
    canManageUsers: false,
    canManageUserGroups: false,
    canManageSquads: false,
    canViewSquads: true,
    canManageTraining: true,
    canViewTraining: true,
    canTakeAttendance: true,
    canManagePayments: false,
    canViewMedical: true,
    canManageMedical: false,
    canEvaluatePlayers: true,
    canViewEvaluations: true,
    canSendBroadcasts: true,
    canSendNotifications: false,
    canManageBookings: false,
    canManagePitches: false,
    canManageCustomers: false,
    canViewReports: false,
    canManageSettings: false,
    canManageTournaments: false,
    canInviteCoaches: false,
  },
};

// ============================================
// HELPERS
// ============================================

export function canAccessRoute(role: AppRole, path: string): boolean {
  const allowed = ROUTE_PERMISSIONS[role] || [];
  return allowed.some(pattern => {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return path === prefix || path.startsWith(prefix + '/');
    }
    return path === pattern;
  });
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'Διαχειριστής',
    coach: 'Προπονητής',
  };
  return labels[role] || role;
}

export function getRoleColor(role: AppRole): string {
  const colors: Record<AppRole, string> = {
    admin: 'bg-purple-100 text-purple-700',
    coach: 'bg-blue-100 text-blue-700',
  };
  return colors[role] || 'bg-zinc-100 text-zinc-700';
}
