'use client';

import { useState, useMemo, useRef } from 'react';
import {
  AcademyUser,
  UserGroup,
  UserGroupField,
  UserDocument,
  GroupCapability,
  Squad,
} from '../types/academy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Search, UserPlus, FileText, Upload, Trash2, Download } from 'lucide-react';
import { storageService } from '@/lib/storage-service';

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
  // Resolve groupId — handle old role-based values like 'athlete' by matching group name
  const resolveGroupId = (gid: string | undefined) => {
    if (!gid) return groups[0]?.id || '';
    if (groups.find((g) => g.id === gid)) return gid;
    // Fallback: match by legacy role name
    const roleMap: Record<string, string> = { athlete: 'Αθλητής', parent: 'Γονέας', coach: 'Προπονητής', admin: 'Διαχειριστής' };
    const matchedGroup = groups.find((g) => g.name === roleMap[gid]);
    return matchedGroup?.id || groups[0]?.id || '';
  };

  const defaultGroupId = resolveGroupId(initialData?.groupId);

  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | null>>(initialData?.fields || {});
  const [squadIds, setSquadIds] = useState<string[]>(initialData?.squad_ids || (initialData?.squad_id ? [initialData.squad_id] : []));
  const [parentUid, setParentUid] = useState(initialData?.parent_uid || '');
  const [assignedSquads, setAssignedSquads] = useState<string[]>(initialData?.assigned_squads || []);
  const [error, setError] = useState<string | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<UserDocument[]>(initialData?.documents || []);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    () => groups.find((g) => g.name === 'Γονέας'),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const userId = initialData?.id || 'new';

    try {
      setIsUploading(true);
      setError(null);
      const newDocs: UserDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const doc = await storageService.uploadUserDocument(venueId, userId, files[i]);
        newDocs.push(doc);
      }

      setDocuments((prev) => [...prev, ...newDocs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ανεβάσματος αρχείου');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: UserDocument) => {
    try {
      await storageService.deleteUserDocument(doc.path);
    } catch {
      // File may already be deleted from storage — that's fine
    }
    setDocuments((prev) => prev.filter((d) => d.path !== doc.path));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        documents,
        ...(hasCapability('squad_assignment') && { squad_ids: squadIds, squad_id: squadIds[0] || '' }),
        ...(hasCapability('parent_linking') && { parent_uid: parentUid }),
        ...(hasCapability('coach_squads') && { assigned_squads: assignedSquads }),
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

      {/* Group Selector — only show on create */}
      {!initialData && (
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
      )}

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
        <div className="space-y-3">
          <Label className="text-zinc-700">Τμήματα</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {squads.map((squad) => {
              const isSelected = squadIds.includes(squad.id);
              return (
                <label
                  key={squad.id}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => {
                      setSquadIds((prev) =>
                        isSelected ? prev.filter((id) => id !== squad.id) : [...prev, squad.id]
                      );
                    }}
                  />
                  <span className="text-sm font-medium">{squad.name} ({squad.ageGroup})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Coach Squad Assignment (capability) */}
      {hasCapability('coach_squads') && squads.length > 0 && (
        <div className="space-y-3">
          <Label className="text-zinc-700">Ανάθεση Τμημάτων</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {squads.map((squad) => {
              const isAssigned = assignedSquads.includes(squad.id);
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
                    onChange={() => {
                      setAssignedSquads((prev) =>
                        isAssigned ? prev.filter((id) => id !== squad.id) : [...prev, squad.id]
                      );
                    }}
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

      {/* Documents (PDF Upload) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-700 text-sm font-medium">Αρχεία / Έγγραφα (PDF)</Label>
          <span className="text-xs text-zinc-400">Μέγ. 10MB ανά αρχείο</span>
        </div>

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.path}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 group"
              >
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-400">
                    {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 hover:bg-zinc-50/50 transition-all duration-150"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Ανέβασμα...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">Ανέβασμα PDF αρχείων</span>
            </>
          )}
        </button>
      </div>

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
