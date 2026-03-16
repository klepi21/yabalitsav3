'use client';

import { useState, useMemo } from 'react';
import {
  AcademyUser,
  UserGroup,
  UserGroupField,
  GroupCapability,
  Squad,
} from '../types/academy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Search, UserPlus } from 'lucide-react';

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
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | null>>(initialData?.fields || {});
  const [squadId, setSquadId] = useState(initialData?.squad_id || '');
  const [parentUid, setParentUid] = useState(initialData?.parent_uid || '');
  const [error, setError] = useState<string | null>(null);

  // Quick add parent state
  const [showQuickAddParent, setShowQuickAddParent] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [quickParentName, setQuickParentName] = useState('');
  const [quickParentFields, setQuickParentFields] = useState<Record<string, string | number | null>>({});

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  // Find the "parent" group for quick-add
  const parentGroup = useMemo(
    () => groups.find((g) => g.isDefault && g.name === 'Γονέας'),
    [groups]
  );

  const hasCapability = (cap: string) => selectedGroup?.capabilities.includes(cap as GroupCapability) || false;

  const filteredParents = useMemo(() => {
    if (!parentSearch) return parentCandidates;
    const lower = parentSearch.toLowerCase();
    return parentCandidates.filter(
      (p) =>
        p.displayName.toLowerCase().includes(lower) ||
        (typeof p.fields.email === 'string' && p.fields.email.toLowerCase().includes(lower)) ||
        (typeof p.fields.phone === 'string' && p.fields.phone.includes(parentSearch))
    );
  }, [parentCandidates, parentSearch]);

  const setFieldValue = (key: string, value: string | number | null) => {
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

  // Render a single dynamic field
  const renderField = (field: UserGroupField, values: Record<string, string | number | null>, setValue: (key: string, val: string | number | null) => void) => {
    const value = values[field.key] ?? '';

    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <Input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            className="h-11 bg-white"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || ''}
            className="h-11 bg-white"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : ''}
            onChange={(e) => setValue(field.key, e.target.value || null)}
            className="h-11 bg-white"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder={field.placeholder || ''}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
          >
            <option value="">Επιλέξτε...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="h-11 bg-white"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200/60 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Group Selector */}
      <div className="space-y-3">
        <Label className="text-zinc-700 text-sm font-medium">Κατηγορία *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => handleGroupChange(group.id)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 border ${
                selectedGroupId === group.id
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <span>{group.icon}</span>
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-zinc-700">Ονοματεπώνυμο *</Label>
        <Input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-11 bg-white"
          placeholder="Εισάγετε ονοματεπώνυμο"
        />
      </div>

      {/* Dynamic Fields from Group Definition */}
      {selectedGroup && selectedGroup.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {selectedGroup.fields.map((field) => (
            <div key={field.key} className={`space-y-2 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
              <Label className="text-zinc-700">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </Label>
              {renderField(field, fieldValues, setFieldValue)}
            </div>
          ))}
        </div>
      )}

      {/* Squad Assignment (capability) */}
      {hasCapability('squad_assignment') && squads.length > 0 && (
        <div className="space-y-2">
          <Label className="text-zinc-700">Τμήμα</Label>
          <select
            value={squadId}
            onChange={(e) => setSquadId(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
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
        <div className="space-y-3">
          <Label className="text-zinc-700">Ανάθεση Τμημάτων</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {squads.map((squad) => {
              const isAssigned = (initialData?.assigned_squads || []).includes(squad.id);
              return (
                <label
                  key={squad.id}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isAssigned
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAssigned}
                    readOnly
                  />
                  <span className="text-sm font-medium">{squad.name} ({squad.ageGroup})</span>
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
            <Label className="text-zinc-700">Σύνδεση με Γονέα</Label>
            {onParentQuickAdd && parentGroup && (
              <button
                type="button"
                onClick={() => setShowQuickAddParent(!showQuickAddParent)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                {showQuickAddParent ? (
                  'Ακύρωση'
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Γρήγορη Προσθήκη
                  </>
                )}
              </button>
            )}
          </div>

          {!showQuickAddParent ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Αναζήτηση γονέα με όνομα, email ή τηλέφωνο..."
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  className="pl-10 h-11 bg-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                {filteredParents.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 text-sm">
                    {parentSearch ? 'Δεν βρέθηκαν γονείς' : 'Δεν υπάρχουν γονείς'}
                  </div>
                ) : (
                  filteredParents.map((parent) => (
                    <label
                      key={parent.id}
                      className={`flex items-center p-4 cursor-pointer hover:bg-zinc-50 transition-colors ${
                        parentUid === parent.id ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="parent_uid"
                        value={parent.id}
                        checked={parentUid === parent.id}
                        onChange={() => setParentUid(parent.id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-zinc-900">{parent.displayName}</p>
                        <p className="text-xs text-zinc-400">
                          {parent.fields.phone ? `${parent.fields.phone} \u2022 ` : ''}
                          {parent.fields.email ?? ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : parentGroup ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-700">Δημιουργία Νέου Γονέα</p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-600 text-xs">Ονοματεπώνυμο *</Label>
                <Input
                  type="text"
                  placeholder="Ονοματεπώνυμο γονέα"
                  value={quickParentName}
                  onChange={(e) => setQuickParentName(e.target.value)}
                  className="h-11 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parentGroup.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-zinc-600 text-xs">{field.label} {field.required && <span className="text-red-400">*</span>}</Label>
                    {renderField(field, quickParentFields, (key: string, val: string | number | null) =>
                      setQuickParentFields((prev) => ({ ...prev, [key]: val }))
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleQuickAddParent}
                disabled={isCreatingParent || !quickParentName}
                className="w-full"
              >
                {isCreatingParent ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Δημιουργία...
                  </>
                ) : (
                  'Δημιουργία & Σύνδεση Γονέα'
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100/60">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="flex-1 h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Ακύρωση
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Αποθήκευση...
            </>
          ) : (
            initialData?.id ? 'Ενημέρωση' : 'Δημιουργία'
          )}
        </Button>
      </div>
    </form>
  );
}
