import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TrainingSession } from '@/types/training';

const COLLECTION = 'yabalitsa_training_sessions';

function convertSession(id: string, data: Record<string, unknown>): TrainingSession {
  return {
    id,
    venueId: (data.venueId as string) || '',
    squadId: (data.squadId as string) || '',
    pitchId: data.pitchId as string | undefined,
    title: (data.title as string) || '',
    date: (data.date as string) || '',
    startTime: (data.startTime as string) || '',
    endTime: (data.endTime as string) || '',
    type: (data.type as TrainingSession['type']) || 'training',
    coachId: (data.coachId as string) || '',
    coachName: (data.coachName as string) || '',
    assistantCoachIds: (data.assistantCoachIds as string[]) || [],
    notes: (data.notes as string) || '',
    drills: (data.drills as TrainingSession['drills']) || [],
    attendance: (data.attendance as TrainingSession['attendance']) || [],
    status: (data.status as TrainingSession['status']) || 'scheduled',
    createdAt: (data.createdAt as { toDate?(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?(): Date })?.toDate?.() || new Date(),
  };
}

export const trainingService = {
  async create(data: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getByVenue(venueId: string): Promise<TrainingSession[]> {
    const q = query(
      collection(db, COLLECTION),
      where('venueId', '==', venueId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertSession(d.id, d.data()));
  },

  async getBySquad(venueId: string, squadId: string): Promise<TrainingSession[]> {
    const q = query(
      collection(db, COLLECTION),
      where('venueId', '==', venueId),
      where('squadId', '==', squadId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertSession(d.id, d.data()));
  },

  async getById(id: string): Promise<TrainingSession | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (!docSnap.exists()) return null;
    return convertSession(docSnap.id, docSnap.data());
  },

  async update(id: string, data: Partial<TrainingSession>): Promise<void> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    delete updateData.id;
    delete updateData.createdAt;
    // Remove undefined values recursively — Firestore rejects them
    const clean = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (obj[key] === undefined) { delete obj[key]; }
        else if (Array.isArray(obj[key])) {
          obj[key] = (obj[key] as unknown[]).map((item) =>
            item && typeof item === 'object' && !Array.isArray(item)
              ? (clean(item as Record<string, unknown>), item)
              : item
          );
        }
      }
    };
    clean(updateData);
    await updateDoc(doc(db, COLLECTION, id), updateData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  async updateAttendance(id: string, attendance: TrainingSession['attendance']): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      attendance,
      updatedAt: serverTimestamp(),
    });
  },

  async markCompleted(id: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
  },

  async markCancelled(id: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  },
};
