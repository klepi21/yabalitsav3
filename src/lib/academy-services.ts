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
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AcademyUser,
  AcademyPayment,
  UserGroup,
  Squad,
} from '../types/academy';

const USERS_COLLECTION = 'yabalitsa_academy_users';
const SQUADS_COLLECTION = 'yabalitsa_squads';
const GROUPS_COLLECTION = 'yabalitsa_user_groups';
const PAYMENTS_COLLECTION = 'yabalitsa_academy_payments';

// ============================================
// User Group Service
// ============================================

export const userGroupService = {
  // Get all groups for a venue
  async getByVenue(venueId: string): Promise<UserGroup[]> {
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('venueId', '==', venueId)
    );
    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
      updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
    })) as UserGroup[];
    return groups.sort((a, b) => a.order - b.order);
  },

  // Get group by ID
  async getById(id: string): Promise<UserGroup | null> {
    const docSnap = await getDoc(doc(db, GROUPS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as UserGroup;
  },

  // Create a new group
  async create(groupData: Omit<UserGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), {
      ...groupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update a group
  async update(id: string, data: Partial<UserGroup>): Promise<void> {
    const docRef = doc(db, GROUPS_COLLECTION, id);
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    delete updateData.id;
    delete updateData.createdAt;
    await updateDoc(docRef, updateData);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, GROUPS_COLLECTION, id));
  },
};

// ============================================
// Academy User Service
// ============================================

function convertToUser(id: string, data: Record<string, unknown>): AcademyUser {
  return {
    id,
    groupId: (data.groupId as string) || (data.role as string) || '', // backward compat with old 'role' field
    displayName: (data.displayName as string) || '',
    venueId: (data.venueId as string) || '',
    fields: (data.fields as Record<string, string | number | null>) || {},
    documents: (data.documents as AcademyUser['documents']) || [],
    squad_id: data.squad_id as string | undefined,
    squad_ids: (data.squad_ids as string[]) || (data.squad_id ? [data.squad_id as string] : []),
    parent_uid: data.parent_uid as string | undefined,
    linked_athletes: data.linked_athletes as string[] | undefined,
    assigned_squads: data.assigned_squads as string[] | undefined,
    createdAt: (data.createdAt as { toDate?(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?(): Date })?.toDate?.() || new Date(),
  };
}

export const academyUserService = {
  // Create user
  async create(userData: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get all users for a venue
  async getByVenue(venueId: string): Promise<AcademyUser[]> {
    const q = query(collection(db, USERS_COLLECTION), where('venueId', '==', venueId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertToUser(d.id, d.data()));
  },

  // Get users by group
  async getByGroup(venueId: string, groupId: string): Promise<AcademyUser[]> {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('venueId', '==', venueId),
      where('groupId', '==', groupId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertToUser(d.id, d.data()));
  },

  // Get user by ID
  async getById(id: string): Promise<AcademyUser | null> {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    return convertToUser(docSnap.id, docSnap.data());
  },

  // Update user
  async update(id: string, userData: Partial<AcademyUser>): Promise<void> {
    const updateData: Record<string, unknown> = { ...userData, updatedAt: serverTimestamp() };
    delete updateData.id;
    delete updateData.createdAt;
    await updateDoc(doc(db, USERS_COLLECTION, id), updateData);
  },

  // Delete user
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, USERS_COLLECTION, id));
  },

  // Get users that can be parents (groups with no special capabilities = generic contacts)
  // For parent linking, we find users whose group has the parent-like fields
  async getParentCandidates(venueId: string, parentGroupId: string): Promise<AcademyUser[]> {
    return this.getByGroup(venueId, parentGroupId);
  },

  // Link athlete to parent
  async linkAthleteToParent(athleteId: string, parentId: string): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, athleteId), {
      parent_uid: parentId,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, USERS_COLLECTION, parentId), {
      linked_athletes: arrayUnion(athleteId),
      updatedAt: serverTimestamp(),
    });
  },

  // Unlink athlete from parent
  async unlinkAthleteFromParent(athleteId: string, parentId: string): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, athleteId), {
      parent_uid: '',
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, USERS_COLLECTION, parentId), {
      linked_athletes: arrayRemove(athleteId),
      updatedAt: serverTimestamp(),
    });
  },

  // Create user with parent linkage
  async createWithParent(
    userData: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>,
    parentId: string
  ): Promise<string> {
    const userId = await this.create({ ...userData, parent_uid: parentId });
    if (parentId) {
      await updateDoc(doc(db, USERS_COLLECTION, parentId), {
        linked_athletes: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });
    }
    return userId;
  },
};

// ============================================
// Squad Service
// ============================================

export const squadService = {
  async create(squadData: Omit<Squad, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, SQUADS_COLLECTION), {
      ...squadData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getByVenue(venueId: string): Promise<Squad[]> {
    const q = query(collection(db, SQUADS_COLLECTION), where('venueId', '==', venueId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || new Date(),
    })) as Squad[];
  },

  async getById(id: string): Promise<Squad | null> {
    const docSnap = await getDoc(doc(db, SQUADS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Squad;
  },

  async update(id: string, squadData: Partial<Squad>): Promise<void> {
    await updateDoc(doc(db, SQUADS_COLLECTION, id), {
      ...squadData,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, SQUADS_COLLECTION, id));
  },

  async assignCoach(squadId: string, coachId: string): Promise<void> {
    await updateDoc(doc(db, SQUADS_COLLECTION, squadId), {
      coachIds: arrayUnion(coachId),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, USERS_COLLECTION, coachId), {
      assigned_squads: arrayUnion(squadId),
      updatedAt: serverTimestamp(),
    });
  },

  async removeCoach(squadId: string, coachId: string): Promise<void> {
    await updateDoc(doc(db, SQUADS_COLLECTION, squadId), {
      coachIds: arrayRemove(coachId),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, USERS_COLLECTION, coachId), {
      assigned_squads: arrayRemove(squadId),
      updatedAt: serverTimestamp(),
    });
  },
};

// ============================================
// Academy Payment Service (monthly fees)
// ============================================

function convertToPayment(id: string, data: Record<string, unknown>): AcademyPayment {
  return {
    id,
    venueId: (data.venueId as string) || '',
    userId: (data.userId as string) || '',
    userName: (data.userName as string) || '',
    month: (data.month as string) || '',
    amount: (data.amount as number) || 0,
    paid: (data.paid as boolean) || false,
    paidAt: data.paidAt as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: (data.createdAt as { toDate?(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?(): Date })?.toDate?.() || new Date(),
  };
}

export const academyPaymentService = {
  // Get payments for a venue + month
  async getByVenueAndMonth(venueId: string, month: string): Promise<AcademyPayment[]> {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('venueId', '==', venueId),
      where('month', '==', month)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertToPayment(d.id, d.data()));
  },

  // Get all payments for a venue (for reports)
  async getByVenue(venueId: string): Promise<AcademyPayment[]> {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('venueId', '==', venueId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => convertToPayment(d.id, d.data()));
  },

  // Toggle paid status
  async togglePaid(paymentId: string, paid: boolean): Promise<void> {
    await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentId), {
      paid,
      paidAt: paid ? new Date().toISOString() : null,
      updatedAt: serverTimestamp(),
    });
  },

  // Create a single payment record
  async create(data: Omit<AcademyPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Bulk create unpaid records for a list of athletes for a given month
  async initMonth(
    venueId: string,
    athletes: { id: string; displayName: string }[],
    month: string,
    defaultAmount: number
  ): Promise<void> {
    // Get existing records to avoid duplicates
    const existing = await this.getByVenueAndMonth(venueId, month);
    const existingUserIds = new Set(existing.map((p) => p.userId));

    for (const athlete of athletes) {
      if (existingUserIds.has(athlete.id)) continue;
      await addDoc(collection(db, PAYMENTS_COLLECTION), {
        venueId,
        userId: athlete.id,
        userName: athlete.displayName,
        month,
        amount: defaultAmount,
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Update payment
  async update(id: string, data: Partial<AcademyPayment>): Promise<void> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    delete updateData.id;
    delete updateData.createdAt;
    await updateDoc(doc(db, PAYMENTS_COLLECTION, id), updateData);
  },

  // Delete payment record
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, PAYMENTS_COLLECTION, id));
  },
};
