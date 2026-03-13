'use client';

import { useState, useMemo } from 'react';
import {
  AcademyUser,
  UserGroup,
  UserGroupField,
  Squad,
  GROUP_COLORS,
} from '../types/academy';

interface AcademyUserFormProps {
  venueId: string;
  groups: UserGroup[];
  initialData?: AcademyUser | null;
  parentCandidates?: AcademyUser[];
  squads?: Squad[];
  onSubmit: (data: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onParentQuickAdd?: (data: Omit<AcademyUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  isLoading?: boolean;
}

export default function AcademyUserForm({
  venueId,
  groups,
  initialData,
  parentCandidates = [],
  squads = [],
  onSubmit,
  onParentQuickAdd,
  isLoading = false,
}: AcademyUserFormProps) {
  const defaultGroupId = initialData?.groupId || groups[0]?.id || '';

  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialData?.fields || {});
  const [squadId, setSquadId] = useState(initialData?.squad_id || '');
  const [parentUid, setParentUid] = useState(initialData?.parent_uid || '');
  const [error, setError] = useState<string | null>(null);

  // Quick add parent state
  const [showQuickAddParent, setShowQuickAddParent] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [quickParentName, setQuickParentName] = useState('');
  const [quickParentFields, setQuickParentFields] = useState<Record<string, any>>({});

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  // Find the "parent" group for quick-add
  const parentGroup = useMemo(
    () => groups.find((g) => g.isDefault && g.name === 'Γονέας'),
    [groups]
  );

  const hasCapability = (cap: string) => selectedGroup?.capabilities.includes(cap as any) || false;

  const filteredParents = useMemo(() => {
    if (!parentSearch) return parentCandidates;
    const lower = parentSearch.toLowerCase();
    return parentCandidates.filter(
      (p) =>
        p.displayName.toLowerCase().includes(lower) ||
        (p.fields.email && p.fields.email.toLowerCase().includes(lower)) ||
        (p.fields.phone && p.fields.phone.includes(parentSearch))
    );
  }, [parentCandidates, parentSearch]);

  const setFieldValue = (key: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setFieldValues({});
    setSquadId('');
    setParentUid('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Το όνομα είναι υποχρεωτικό');
      return;
    }

    // Validate required fields
    if (selectedGroup) {
      for (const field of selectedGroup.fields) {
        if (field.required && !fieldValues[field.key]) {
          setError(`Το πεδίο "${field.label}" είναι υποχρεωτικό`);
          return;
        }
      }
    }

    try {
      setError(null);
      await onSubmit({
        groupId: selectedGroupId,
        displayName: displayName.trim(),
        venueId,
        fields: fieldValues,
        ...(hasCapability('squad_assignment') && { squad_id: squadId }),
        ...(hasCapability('parent_linking') && { parent_uid: parentUid }),
        ...(hasCapability('coach_squads') && { assigned_squads: initialData?.assigned_squads || [] }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleQuickAddParent = async () => {
    if (!onParentQuickAdd || !parentGroup) return;
    try {
      setIsCreatingParent(true);
      const parentId = await onParentQuickAdd({
        groupId: parentGroup.id,
        displayName: quickParentName,
        venueId,
        fields: quickParentFields,
        linked_athletes: [],
      });
      setParentUid(parentId);
      setShowQuickAddParent(false);
      setQuickParentName('');
      setQuickParentFields({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας γονέα');
    } finally {
      setIsCreatingParent(false);
    }
  };

  const inputClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1';
  const selectClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base appearance-none';

  // Render a single dynamic field
  const renderField = (field: UserGroupField, values: Record<string, any>, setValue: (key: string, val: any) => void) => {
    const value = values[field.key] || '';

    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className={inputClasses}
            placeholder={field.placeholder || ''}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : '')}
            className={inputClasses}
            placeholder={field.placeholder || ''}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : ''}
            onChange={(e) => setValue(field.key, e.target.value || null)}
            className={inputClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            rows={2}
            className={inputClasses}
            placeholder={field.placeholder || ''}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className={selectClasses}
          >
            <option value="">Επιλέξτε...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className={inputClasses}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Group Selector */}
      <div>
        <label className={labelClasses}>Κατηγορία *</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => handleGroupChange(group.id)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                selectedGroupId === group.id
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{group.icon}</span>
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className={labelClasses}>
          Ονοματεπώνυμο *
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClasses}
          placeholder="Εισάγετε ονοματεπώνυμο"
        />
      </div>

      {/* Dynamic Fields from Group Definition */}
      {selectedGroup && selectedGroup.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectedGroup.fields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className={labelClasses}>
                {field.label} {field.required && '*'}
              </label>
              {renderField(field, fieldValues, setFieldValue)}
            </div>
          ))}
        </div>
      )}

      {/* Squad Assignment (capability) */}
      {hasCapability('squad_assignment') && squads.length > 0 && (
        <div>
          <label className={labelClasses}>Τμήμα</label>
          <select
            value={squadId}
            onChange={(e) => setSquadId(e.target.value)}
            className={selectClasses}
          >
            <option value="">Χωρίς τμήμα</option>
            {squads.map((squad) => (
              <option key={squad.id} value={squad.id}>
                {squad.name} ({squad.ageGroup})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Coach Squad Assignment (capability) */}
      {hasCapability('coach_squads') && squads.length > 0 && (
        <div>
          <label className={labelClasses}>Ανάθεση Τμημάτων</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {squads.map((squad) => {
              const isAssigned = (initialData?.assigned_squads || []).includes(squad.id);
              return (
                <label
                  key={squad.id}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    isAssigned ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAssigned}
                    readOnly
                  />
                  <span className="text-sm">{squad.name} ({squad.ageGroup})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Parent Linking (capability) */}
      {hasCapability('parent_linking') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClasses}>Σύνδεση με Γονέα</label>
            {onParentQuickAdd && parentGroup && (
              <button
                type="button"
                onClick={() => setShowQuickAddParent(!showQuickAddParent)}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {showQuickAddParent ? 'Ακύρωση' : '+ Γρήγορη Προσθήκη Γονέα'}
              </button>
            )}
          </div>

          {!showQuickAddParent ? (
            <>
              <input
                type="text"
                placeholder="Αναζήτηση γονέα με όνομα, email ή τηλέφωνο..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className={inputClasses}
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y">
                {filteredParents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {parentSearch ? 'Δεν βρέθηκαν γονείς' : 'Δεν υπάρχουν γονείς'}
                  </div>
                ) : (
                  filteredParents.map((parent) => (
                    <label
                      key={parent.id}
                      className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        parentUid === parent.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="parent_uid"
                        value={parent.id}
                        checked={parentUid === parent.id}
                        onChange={() => setParentUid(parent.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{parent.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {parent.fields.phone && `${parent.fields.phone} \u2022 `}
                          {parent.fields.email || ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : parentGroup ? (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700">Δημιουργία Νέου Γονέα</p>
              <input
                type="text"
                placeholder="Ονοματεπώνυμο γονέα *"
                value={quickParentName}
                onChange={(e) => setQuickParentName(e.target.value)}
                className={inputClasses}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parentGroup.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-500 mb-1">{field.label} {field.required && '*'}</label>
                    {renderField(field, quickParentFields, (key, val) =>
                      setQuickParentFields((prev) => ({ ...prev, [key]: val }))
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleQuickAddParent}
                disabled={isCreatingParent || !quickParentName}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingParent ? 'Δημιουργία...' : 'Δημιουργία & Σύνδεση Γονέα'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-1 px-6 py-4 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Ακύρωση
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl text-base font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isLoading ? 'Αποθήκευση...' : initialData?.id ? 'Ενημέρωση' : 'Δημιουργία'}
        </button>
      </div>
    </form>
  );
}
