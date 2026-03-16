'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { ArrowLeft, Loader2, X, Plus, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

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
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
  }, [user, venueOwner, authLoading, router, pathname]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-200 shrink-0" asChild>
          <Link href="/management/academy/user-groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Νέα Κατηγορία Χρηστών</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Δημιουργήστε μια νέα κατηγορία με δυναμικά πεδία</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive shrink-0">
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900 mb-1">Βασικά Στοιχεία</h2>
            <p className="text-[13px] text-zinc-400">Όνομα, εικονίδιο και χρώμα κατηγορίας</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-zinc-700">Όνομα (ενικός) <span className="text-red-400">*</span></Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Φυσιοθεραπευτής" className="h-11 bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Όνομα (πληθυντικός) <span className="text-red-400">*</span></Label>
              <Input type="text" value={namePlural} onChange={(e) => setNamePlural(e.target.value)} placeholder="π.χ. Φυσιοθεραπευτές" className="h-11 bg-white" />
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label className="text-zinc-700">Εικονίδιο</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 text-xl rounded-xl border flex items-center justify-center transition-all duration-150 ${
                    icon === ic
                      ? 'border-zinc-900 bg-zinc-900/5 scale-110 shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <Label className="text-zinc-700">Χρώμα</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    GROUP_COLORS[c]
                  } ${color === c ? 'ring-2 ring-zinc-900 ring-offset-1 scale-105' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900 mb-1">Πεδία Φόρμας</h2>
            <p className="text-[13px] text-zinc-400">Ορίστε τα πεδία που θα συμπληρώνονται για χρήστες αυτής της κατηγορίας</p>
          </div>

          {/* Existing fields */}
          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div>
                    <span className="font-medium text-zinc-900 text-sm">{field.label}</span>
                    <span className="ml-2 text-xs text-zinc-400">({FIELD_TYPE_LABELS[field.type]})</span>
                    {field.required && <span className="ml-1 text-xs text-red-400">*</span>}
                    {field.type === 'select' && field.options && field.options.length > 0 && (
                      <span className="ml-2 text-xs text-zinc-400">[{field.options.join(', ')}]</span>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeField(index)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="border-t border-zinc-100/60 pt-6 space-y-4">
            <p className="text-sm font-medium text-zinc-700">Προσθήκη Πεδίου</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Ετικέτα *</Label>
                <Input type="text" value={newField.label} onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))} placeholder="π.χ. ΑΜΚΑ" className="h-11 bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Τύπος</Label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value as UserGroupFieldType, options: [] }))}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                >
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2.5 cursor-pointer">
                  <Checkbox checked={newField.required} onCheckedChange={(checked) => setNewField((prev) => ({ ...prev, required: checked === true }))} />
                  <span className="text-sm text-zinc-700">Υποχρεωτικό</span>
                </label>
              </div>
            </div>

            {newField.type !== 'select' && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Placeholder</Label>
                <Input type="text" value={newField.placeholder || ''} onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))} placeholder="Κείμενο βοήθειας..." className="h-11 bg-white" />
              </div>
            )}

            {newField.type === 'select' && (
              <div className="space-y-3">
                <Label className="text-xs text-zinc-400">Επιλογές</Label>
                <div className="flex gap-2">
                  <Input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} placeholder="Προσθήκη επιλογής..." className="h-11 bg-white" />
                  <Button type="button" variant="outline" onClick={addOption} className="h-11 border-zinc-200">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {(newField.options || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(newField.options || []).map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 bg-zinc-100 text-zinc-700">
                        {opt}
                        <button type="button" onClick={() => removeOption(i)} className="hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button type="button" variant="outline" onClick={addField} disabled={!newField.label.trim()} className="w-full h-11 border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:border-zinc-400">
              <Plus className="h-4 w-4" />
              Προσθήκη Πεδίου
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-4">
          <h2 className="text-[15px] font-semibold text-zinc-900">Προεπισκόπηση</h2>
          <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl border border-zinc-100">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900">{name || 'Όνομα κατηγορίας'}</span>
                <Badge variant="secondary" className={GROUP_COLORS[color] || ''}>
                  {namePlural || 'Πληθυντικός'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {fields.length} πεδί{fields.length === 1 ? 'ο' : 'α'}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" onClick={() => router.back()}>
            Ακύρωση
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1 h-11">
            {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Δημιουργία...</>) : 'Δημιουργία Κατηγορίας'}
          </Button>
        </div>
      </form>
    </div>
  );
}
