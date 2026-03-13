'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userGroupService } from '@/lib/academy-services';
import {
  UserGroupField,
  UserGroupFieldType,
  AVAILABLE_COLORS,
  AVAILABLE_ICONS,
  GROUP_COLORS,
} from '@/types/academy';

const FIELD_TYPE_LABELS: Record<UserGroupFieldType, string> = {
  text: 'Κείμενο',
  email: 'Email',
  phone: 'Τηλέφωνο',
  number: 'Αριθμός',
  select: 'Λίστα Επιλογών',
  date: 'Ημερομηνία',
  textarea: 'Μεγάλο Κείμενο',
};

export default function NewUserGroupPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push('/venue-login'); return; }
  }, [user, venueOwner, authLoading, router]);

  const [name, setName] = useState('');
  const [namePlural, setNamePlural] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [color, setColor] = useState('blue');
  const [fields, setFields] = useState<UserGroupField[]>([]);

  // New field form
  const [newField, setNewField] = useState<UserGroupField>({
    key: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
  });
  const [newOption, setNewOption] = useState('');

  const venueId = venueOwner?.venueId || '';

  const addField = () => {
    if (!newField.label.trim()) return;
    const key = newField.label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    setFields((prev) => [
      ...prev,
      { ...newField, key: key || `field_${prev.length}` },
    ]);
    setNewField({ key: '', label: '', type: 'text', required: false, options: [], placeholder: '' });
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setNewField((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()],
    }));
    setNewOption('');
  };

  const removeOption = (index: number) => {
    setNewField((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !namePlural.trim()) {
      setError('Το όνομα είναι υποχρεωτικό');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await userGroupService.create({
        name: name.trim(),
        namePlural: namePlural.trim(),
        icon,
        color,
        fields,
        capabilities: [],
        isDefault: false,
        order: 99,
        venueId,
      });
      router.push('/management/academy/user-groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας');
      setIsLoading(false);
    }
  };

  const inputClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1';
  const selectClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base appearance-none';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/management/academy/user-groups"
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Νέα Κατηγορία Χρηστών</h1>
              <p className="text-sm text-gray-500">Δημιουργήστε μια νέα κατηγορία με δυναμικά πεδία</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Βασικά Στοιχεία</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Όνομα (ενικός) *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClasses}
                  placeholder="π.χ. Φυσιοθεραπευτής"
                />
              </div>
              <div>
                <label className={labelClasses}>Όνομα (πληθυντικός) *</label>
                <input
                  type="text"
                  value={namePlural}
                  onChange={(e) => setNamePlural(e.target.value)}
                  className={inputClasses}
                  placeholder="π.χ. Φυσιοθεραπευτές"
                />
              </div>
            </div>

            {/* Icon Selector */}
            <div>
              <label className={labelClasses}>Εικονίδιο</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-10 h-10 text-xl rounded-lg border-2 flex items-center justify-center transition-all ${
                      icon === ic
                        ? 'border-green-500 bg-green-50 scale-110'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className={labelClasses}>Χρώμα</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      GROUP_COLORS[c]
                    } ${color === c ? 'ring-2 ring-green-500 scale-105' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Πεδία Φόρμας</h2>
            <p className="text-sm text-gray-500">Ορίστε τα πεδία που θα συμπληρώνονται για χρήστες αυτής της κατηγορίας</p>

            {/* Existing fields */}
            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{field.label}</span>
                      <span className="ml-2 text-xs text-gray-500">({FIELD_TYPE_LABELS[field.type]})</span>
                      {field.required && <span className="ml-1 text-xs text-red-500">*</span>}
                      {field.type === 'select' && field.options && field.options.length > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          [{field.options.join(', ')}]
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new field */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Προσθήκη Πεδίου</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ετικέτα *</label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                    className={inputClasses}
                    placeholder="π.χ. ΑΜΚΑ"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Τύπος</label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value as UserGroupFieldType, options: [] }))}
                    className={selectClasses}
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))}
                      className="h-4 w-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Υποχρεωτικό</span>
                  </label>
                </div>
              </div>

              {newField.type !== 'select' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={newField.placeholder || ''}
                    onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))}
                    className={inputClasses}
                    placeholder="Κείμενο βοήθειας..."
                  />
                </div>
              )}

              {/* Options for select type */}
              {newField.type === 'select' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Επιλογές</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                      className={inputClasses}
                      placeholder="Προσθήκη επιλογής..."
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 text-sm font-medium"
                    >
                      +
                    </button>
                  </div>
                  {(newField.options || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(newField.options || []).map((opt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs"
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => removeOption(i)}
                            className="hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={addField}
                disabled={!newField.label.trim()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-green-400 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Προσθήκη Πεδίου
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Προεπισκόπηση</h2>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-3xl">{icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{name || 'Όνομα κατηγορίας'}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_COLORS[color] || 'bg-gray-100 text-gray-800'}`}>
                    {namePlural || 'Πληθυντικός'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {fields.length} πεδί{fields.length === 1 ? 'ο' : 'α'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl text-base font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isLoading ? 'Δημιουργία...' : 'Δημιουργία Κατηγορίας'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
