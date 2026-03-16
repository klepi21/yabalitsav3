import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { UserDocument } from '@/types/academy';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ALLOWED_TYPES = ['application/pdf'];

export const storageService = {
  async uploadUserDocument(
    venueId: string,
    userId: string,
    file: File
  ): Promise<UserDocument> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Μόνο αρχεία PDF επιτρέπονται');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Το αρχείο δεν μπορεί να υπερβαίνει τα 10MB');
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `yabalitsa/${venueId}/users/${userId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
      name: file.name,
      url,
      path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  },

  async deleteUserDocument(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  },
};
