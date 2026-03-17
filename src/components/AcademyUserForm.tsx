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
import { cn, toGreekUpperCase } from '@/lib/utils';
import { Loader2, Plus, Search, UserPlus, FileText, Upload, Trash2, Download, ChevronDown, Phone, Mail } from 'lucide-react';
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
    setSquadIds([]);
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
            placeholder={toGreekUpperCase(field.placeholder || '')}
            className="h-20 px-8 rounded-[1.5rem] bg-zinc-50 border-none font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-200 shadow-inner"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : '')}
            placeholder={toGreekUpperCase(field.placeholder || '')}
            className="h-20 px-8 rounded-[1.5rem] bg-zinc-50 border-none font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all shadow-inner"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : ''}
            onChange={(e) => setValue(field.key, e.target.value || null)}
            className="h-20 px-8 rounded-[1.5rem] bg-zinc-50 border-none font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all shadow-inner"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            rows={5}
            className="flex w-full rounded-[2.5rem] bg-zinc-50 border-none px-10 py-8 font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-200 resize-none shadow-inner"
            placeholder={toGreekUpperCase(field.placeholder || '')}
          />
        );

      case 'select':
        return (
          <div className="relative group">
            <select
              value={value}
              onChange={(e) => setValue(field.key, e.target.value)}
              className="flex h-20 w-full rounded-[1.5rem] bg-zinc-50 border-none px-10 py-2 font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all appearance-none uppercase shadow-inner"
            >
              <option value="">{toGreekUpperCase('Επιλέξτε...')}</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>{toGreekUpperCase(opt)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-300 pointer-events-none group-focus-within:text-emerald-500 transition-all group-focus-within:rotate-180" />
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="h-20 px-8 rounded-[1.5rem] bg-zinc-50 border-none font-black text-xl"
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
        <div className="space-y-4">
          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Κατηγορία *')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleGroupChange(group.id)}
                className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 text-center gap-3 active:scale-95 group/btn ${
                  selectedGroupId === group.id
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl scale-105 z-10'
                    : 'bg-white text-zinc-400 border-zinc-100 hover:border-emerald-200 hover:text-emerald-600 hover:shadow-lg'
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-sm ${
                   selectedGroupId === group.id ? 'bg-white/10 text-emerald-400' : 'bg-zinc-50 group-hover/btn:bg-emerald-50'
                }`}>
                  {group.icon || '👤'}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toGreekUpperCase(group.name)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display Name */}
      <div className="space-y-4">
        <Label htmlFor="displayName" className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
            {toGreekUpperCase('Ονοματεπώνυμο *')}
        </Label>
        <Input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-24 px-10 rounded-[2rem] bg-zinc-50 border-none font-black text-3xl focus:bg-white focus:ring-[1rem] focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-200 shadow-inner"
          placeholder={toGreekUpperCase('Εισάγετε ονοματεπώνυμο')}
        />
      </div>

      {/* Dynamic Fields from Group Definition */}
      {selectedGroup && selectedGroup.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {selectedGroup.fields.map((field) => (
            <div key={field.key} className={`space-y-4 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
              <Label className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                {toGreekUpperCase(field.label)} {field.required && <span className="text-red-400 font-black">*</span>}
              </Label>
              {renderField(field, fieldValues, setFieldValue)}
            </div>
          ))}
        </div>
      )}

      {/* Squad Assignment (capability) */}
      {hasCapability('squad_assignment') && squads.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-100">
          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Τμήματα')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {squads.map((squad) => {
              const isSelected = squadIds.includes(squad.id);
              return (
                <label
                  key={squad.id}
                  className={`flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 text-center gap-2 active:scale-95 group/squad ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg shadow-emerald-100'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-emerald-200 hover:bg-white hover:text-emerald-600'
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
                  <span className="text-[11px] font-black uppercase tracking-widest">{toGreekUpperCase(squad.name)}</span>
                  <span className="text-[10px] font-bold opacity-60">{toGreekUpperCase(squad.ageGroup)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Coach Squad Assignment (capability) */}
      {hasCapability('coach_squads') && squads.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-100">
          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{toGreekUpperCase('Ανάθεση Τμημάτων')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {squads.map((squad) => {
              const isAssigned = assignedSquads.includes(squad.id);
              return (
                <label
                  key={squad.id}
                  className={`flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 text-center gap-2 active:scale-95 group/coach ${
                    isAssigned
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg shadow-emerald-100'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-emerald-200 hover:bg-white hover:text-emerald-600'
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
                   <span className="text-[11px] font-black uppercase tracking-widest">{toGreekUpperCase(squad.name)}</span>
                   <span className="text-[10px] font-bold opacity-60">{toGreekUpperCase(squad.ageGroup)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Parent Linking (capability) */}
      {hasCapability('parent_linking') && (
        <div className="space-y-8 pt-10 border-t-2 border-zinc-50">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-900 font-black text-2xl uppercase tracking-tight">
                {toGreekUpperCase('Σύνδεση με Γονέα')}
            </Label>
            {onParentQuickAdd && parentGroup && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQuickAddParent(!showQuickAddParent)}
                className="h-12 px-6 rounded-2xl border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-black text-xs uppercase tracking-widest transition-all"
              >
                {showQuickAddParent ? (
                  toGreekUpperCase('Ακύρωση')
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {toGreekUpperCase('Γρήγορη Προσθήκη')}
                  </>
                )}
              </Button>
            )}
          </div>

          {!showQuickAddParent ? (
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-300 group-focus-within:text-emerald-500 transition-all group-focus-within:scale-110" />
                <Input
                  type="text"
                  placeholder={toGreekUpperCase('Αναζήτηση γονέα με όνομα, email ή τηλέφωνο...')}
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  className="h-20 pl-20 pr-8 bg-zinc-50 border-none rounded-[1.5rem] font-black text-xl focus:bg-white focus:ring-8 focus:ring-emerald-500/10 transition-all uppercase placeholder:text-zinc-200 shadow-inner"
                />
              </div>
              <div className="max-h-[30rem] overflow-y-auto rounded-[2.5rem] border-2 border-zinc-50 bg-white p-4 space-y-3 shadow-inner">
                {filteredParents.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center gap-6">
                    <UserPlus className="h-16 w-16 text-zinc-100" />
                    <p className="font-black text-lg text-zinc-300 uppercase tracking-widest">
                      {parentSearch ? toGreekUpperCase('Δεν βρέθηκαν γονείς') : toGreekUpperCase('Δεν υπάρχουν γονείς')}
                    </p>
                  </div>
                ) : (
                  filteredParents.map((parent) => (
                    <label
                      key={parent.id}
                      className={cn(
                        "flex items-center p-8 rounded-[2rem] cursor-pointer hover:shadow-2xl transition-all border-4 relative overflow-hidden group/parent",
                        parentUid === parent.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200' : 'bg-zinc-50/30 border-transparent hover:bg-white hover:border-emerald-100'
                      )}
                    >
                      <div className={cn(
                        "h-14 w-14 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0",
                        parentUid === parent.id ? 'border-white/30 bg-white/20 text-white' : 'border-zinc-200 bg-white text-zinc-300 group-hover/parent:border-emerald-200 group-hover/parent:text-emerald-500'
                      )}>
                        {parentUid === parent.id ? <Plus className="h-8 w-8 rotate-45" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                      </div>
                      <div className="ml-8 min-w-0">
                        <p className={cn("text-2xl font-black uppercase tracking-tight truncate", parentUid === parent.id ? 'text-white' : 'text-zinc-900')}>
                            {toGreekUpperCase(parent.displayName)}
                        </p>
                        <div className={cn("flex flex-wrap items-center gap-4 mt-2", parentUid === parent.id ? 'text-emerald-100' : 'text-zinc-400')}>
                          {parent.fields.phone && (
                              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                  <Phone className="h-3 w-3" />
                                  {parent.fields.phone}
                              </div>
                          )}
                          {parent.fields.email && (
                              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest lowercase">
                                  <Mail className="h-3 w-3" />
                                  {parent.fields.email}
                              </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="parent_uid"
                        value={parent.id}
                        checked={parentUid === parent.id}
                        onChange={() => setParentUid(parent.id)}
                        className="sr-only"
                      />
                      {parentUid === parent.id && (
                          <div className="absolute -bottom-6 -right-6 opacity-20">
                              <UserPlus className="h-24 w-24 -rotate-12" />
                          </div>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : parentGroup ? (
            <div className="rounded-[2.5rem] border-2 border-emerald-100 bg-emerald-50/30 p-10 lg:p-16 space-y-10 animate-in zoom-in-95 duration-300 shadow-xl">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <UserPlus className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Δημιουργία Νέου Γονέα')}</h3>
                    <p className="text-sm font-bold text-emerald-600/70 uppercase tracking-widest">{toGreekUpperCase('ΣΥΜΠΛΗΡΩΣΤΕ ΤΑ ΣΤΟΙΧΕΙΑ ΤΟΥ ΓΟΝΕΑ')}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                    {toGreekUpperCase('Ονοματεπώνυμο Γονέα *')}
                </Label>
                <Input
                  type="text"
                  placeholder={toGreekUpperCase('π.χ. Ιωάννης Παπαδόπουλος')}
                  value={quickParentName}
                  onChange={(e) => setQuickParentName(e.target.value)}
                  className="h-20 px-8 bg-white rounded-[1.5rem] border-none shadow-sm focus:ring-8 focus:ring-emerald-500/10 font-black text-xl uppercase transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {parentGroup.fields.map((field) => (
                  <div key={field.key} className="space-y-4">
                    <Label className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                        {toGreekUpperCase(field.label)} {field.required && <span className="text-red-400 font-black">*</span>}
                    </Label>
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
                className="h-20 w-full rounded-[1.5rem] bg-emerald-600 hover:bg-zinc-900 text-white font-black text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95"
              >
                {isCreatingParent ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mr-4" />
                    {toGreekUpperCase('Δημιουργία...')}
                  </>
                ) : (
                  toGreekUpperCase('Δημιουργία & Σύνδεση Γονέα')
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Documents (PDF Upload) */}
      <div className="space-y-8 pt-10 border-t-2 border-zinc-50">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-900 font-black text-2xl uppercase tracking-tight">
              {toGreekUpperCase('Αρχεία / Έγγραφα (PDF)')}
          </Label>
          <div className="px-5 py-2 bg-zinc-100 rounded-full text-[10px] font-black uppercase text-zinc-400 tracking-widest shadow-inner">
              {toGreekUpperCase('Μέγ. 10MB ανά αρχείο')}
          </div>
        </div>

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.path}
                className="flex items-center gap-6 p-6 rounded-2xl border-2 border-zinc-50 bg-white hover:border-red-100 hover:bg-red-50/30 transition-all group"
              >
                <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-zinc-900 truncate uppercase tracking-tight">{toGreekUpperCase(doc.name)}</p>
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                    {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-xl flex items-center justify-center bg-zinc-50 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    <Download className="h-6 w-6" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc)}
                    className="h-12 w-12 rounded-xl flex items-center justify-center bg-zinc-50 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 shadow-sm"
                  >
                    <Trash2 className="h-6 w-6" />
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
          className="w-full h-32 flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-4 border-dashed border-zinc-100 text-zinc-300 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/20 transition-all duration-500 active:scale-[0.98] group bg-zinc-50 shadow-inner"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <span className="text-xl font-black uppercase tracking-[0.3em]">{toGreekUpperCase('Ανέβασμα...')}</span>
            </>
          ) : (
            <>
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform duration-500">
                  <Upload className="h-6 w-6 text-zinc-400 group-hover:text-emerald-500" />
              </div>
              <span className="text-xl font-black uppercase tracking-[0.3em] group-hover:text-emerald-700">{toGreekUpperCase('Ανέβασμα PDF αρχείων')}</span>
            </>
          )}
        </button>
      </div>

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t-2 border-zinc-50">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="flex-1 h-20 rounded-[1.5rem] font-black text-zinc-400 hover:text-zinc-600 border-none bg-zinc-50 hover:bg-zinc-100 transition-all text-xl uppercase tracking-widest"
        >
          {toGreekUpperCase('Ακύρωση')}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 h-20 rounded-[1.5rem] bg-zinc-900 hover:bg-black text-white font-black shadow-2xl shadow-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] text-xl uppercase tracking-widest group"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 mr-4 animate-spin" />
              {toGreekUpperCase('Αποθήκευση...')}
            </>
          ) : (
            <>
                <Plus className="h-8 w-8 mr-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                {initialData?.id ? toGreekUpperCase('Ενημέρωση') : toGreekUpperCase('Δημιουργία')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
