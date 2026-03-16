export type TrainingType = 'training' | 'friendly' | 'fitness' | 'tactical' | 'recovery';
export type TrainingStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'injured';

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  training: 'Προπόνηση',
  friendly: 'Φιλικό',
  fitness: 'Φυσική Κατάσταση',
  tactical: 'Τακτική',
  recovery: 'Αποκατάσταση',
};

export const TRAINING_TYPE_COLORS: Record<TrainingType, { bg: string; text: string; border: string }> = {
  training: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  friendly: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  fitness: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  tactical: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  recovery: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Παρών',
  absent: 'Απών',
  late: 'Αργοπορία',
  injured: 'Τραυματίας',
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  injured: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export interface TrainingDrill {
  name: string;
  duration: number;       // minutes
  description?: string;
}

export interface TrainingAttendance {
  athleteId: string;
  athleteName: string;    // denormalized for display
  status: AttendanceStatus;
  note?: string;
}

export interface TrainingSession {
  id: string;
  venueId: string;
  squadId: string;
  pitchId?: string;
  title: string;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:mm
  endTime: string;        // HH:mm
  type: TrainingType;
  coachId: string;
  coachName: string;      // denormalized
  assistantCoachIds: string[];
  notes: string;
  drills: TrainingDrill[];
  attendance: TrainingAttendance[];
  status: TrainingStatus;
  createdAt: Date;
  updatedAt: Date;
}
