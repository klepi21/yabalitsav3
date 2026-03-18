import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { EvaluationTemplate, PlayerEvaluation } from '@/types/academy';

const TEMPLATES_COLLECTION = 'yabalitsa_evaluation_templates';
const EVALUATIONS_COLLECTION = 'yabalitsa_player_evaluations';

function convertTemplate(id: string, data: Record<string, unknown>): EvaluationTemplate {
  return {
    id,
    venueId: (data.venueId as string) || '',
    name: (data.name as string) || '',
    skills: (data.skills as EvaluationTemplate['skills']) || [],
    createdAt: (data.createdAt as { toDate?(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?(): Date })?.toDate?.() || new Date(),
  };
}

function convertEvaluation(id: string, data: Record<string, unknown>): PlayerEvaluation {
  return {
    id,
    venueId: (data.venueId as string) || '',
    athleteId: (data.athleteId as string) || '',
    athleteName: (data.athleteName as string) || '',
    squadId: (data.squadId as string) || '',
    squadName: (data.squadName as string) || '',
    coachId: (data.coachId as string) || '',
    coachName: (data.coachName as string) || '',
    templateId: (data.templateId as string) || '',
    period: (data.period as string) || '',
    periodLabel: (data.periodLabel as string) || '',
    ratings: (data.ratings as Record<string, number>) || {},
    notes: (data.notes as string) || '',
    createdAt: (data.createdAt as { toDate?(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?(): Date })?.toDate?.() || new Date(),
  };
}

export const evaluationTemplateService = {
  async create(data: Omit<EvaluationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getByVenue(venueId: string): Promise<EvaluationTemplate[]> {
    const q = query(collection(db, TEMPLATES_COLLECTION), where('venueId', '==', venueId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertTemplate(d.id, d.data()));
  },

  async getById(id: string): Promise<EvaluationTemplate | null> {
    const docSnap = await getDoc(doc(db, TEMPLATES_COLLECTION, id));
    if (!docSnap.exists()) return null;
    return convertTemplate(docSnap.id, docSnap.data());
  },

  async update(id: string, data: Partial<EvaluationTemplate>): Promise<void> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    delete updateData.id; delete updateData.createdAt;
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), updateData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
  },
};

export const playerEvaluationService = {
  async create(data: Omit<PlayerEvaluation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, EVALUATIONS_COLLECTION), {
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getByVenue(venueId: string): Promise<PlayerEvaluation[]> {
    const q = query(
      collection(db, EVALUATIONS_COLLECTION),
      where('venueId', '==', venueId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertEvaluation(d.id, d.data()));
  },

  async getByAthlete(venueId: string, athleteId: string): Promise<PlayerEvaluation[]> {
    const q = query(
      collection(db, EVALUATIONS_COLLECTION),
      where('venueId', '==', venueId),
      where('athleteId', '==', athleteId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertEvaluation(d.id, d.data()));
  },

  async getById(id: string): Promise<PlayerEvaluation | null> {
    const docSnap = await getDoc(doc(db, EVALUATIONS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    return convertEvaluation(docSnap.id, docSnap.data());
  },

  async update(id: string, data: Partial<PlayerEvaluation>): Promise<void> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    delete updateData.id; delete updateData.createdAt;
    await updateDoc(doc(db, EVALUATIONS_COLLECTION, id), updateData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, EVALUATIONS_COLLECTION, id));
  },
};
