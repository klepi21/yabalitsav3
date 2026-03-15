'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
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
import { ArrowLeft, Loader2, X, Plus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export default function EditUserGroupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupId = params?.id as string;

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

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }

    const loadGroup = async () => {
      try {
        setIsLoading(true);
        const group = await userGroupService.getById(groupId);
        if (!group) {
          setError('Η κατηγορία δεν βρέθηκε');
          setIsLoading(false);
          return;
        }
        setName(group.name);
        setNamePlural(group.namePlural);
        setIcon(group.icon);
        setColor(group.color);
        setFields(group.fields);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadGroup();
  }, [user, venueOwner, authLoading, router, groupId, pathname]);

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
      setIsSaving(true);
      setError(null);
      await userGroupService.update(groupId, {
        name: name.trim(),
        namePlural: namePlural.trim(),
        icon,
        color,
        fields,
      });
      router.push('/management/academy/user-groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης');
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/management/academy/user-groups">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Επεξεργασία Κατηγορίας</h1>
          <p className="text-sm text-zinc-500 mt-1">Ενημέρωση στοιχείων κατηγορίας χρηστών</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Βασικά Στοιχεία</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Όνομα (ενικός) *</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="π.χ. Φυσιοθεραπευτής"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Όνομα (πληθυντικός) *</Label>
                  <Input
                    type="text"
                    value={namePlural}
                    onChange={(e) => setNamePlural(e.target.value)}
                    placeholder="π.χ. Φυσιοθεραπευτές"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div className="space-y-2">
                <Label>Εικονίδιο</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-10 h-10 text-xl rounded-lg border-2 flex items-center justify-center transition-all ${
                        icon === ic
                          ? 'border-primary bg-primary/5 scale-110'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-2">
                <Label>Χρώμα</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        GROUP_COLORS[c]
                      } ${color === c ? 'ring-2 ring-primary scale-105' : ''}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Πεδία Φόρμας</CardTitle>
              <p className="text-sm text-muted-foreground">Ορίστε τα πεδία που θα συμπληρώνονται για χρήστες αυτής της κατηγορίας</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing fields */}
              {fields.length > 0 && (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                    >
                      <div>
                        <span className="font-medium text-foreground text-sm">{field.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({FIELD_TYPE_LABELS[field.type]})</span>
                        {field.required && <span className="ml-1 text-xs text-destructive">*</span>}
                        {field.type === 'select' && field.options && field.options.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            [{field.options.join(', ')}]
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new field */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Προσθήκη Πεδίου</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ετικέτα *</Label>
                    <Input
                      type="text"
                      value={newField.label}
                      onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="π.χ. ΑΜΚΑ"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Τύπος</Label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value as UserGroupFieldType, options: [] }))}
                      className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 p-2 cursor-pointer">
                      <Checkbox
                        checked={newField.required}
                        onCheckedChange={(checked) => setNewField((prev) => ({ ...prev, required: checked === true }))}
                      />
                      <span className="text-sm text-foreground">Υποχρεωτικό</span>
                    </label>
                  </div>
                </div>

                {newField.type !== 'select' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Placeholder</Label>
                    <Input
                      type="text"
                      value={newField.placeholder || ''}
                      onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))}
                      placeholder="Κείμενο βοήθειας..."
                    />
                  </div>
                )}

                {/* Options for select type */}
                {newField.type === 'select' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Επιλογές</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                        placeholder="Προσθήκη επιλογής..."
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addOption}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(newField.options || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(newField.options || []).map((opt, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="gap-1"
                          >
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOption(i)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                  disabled={!newField.label.trim()}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Προσθήκη Πεδίου
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Προεπισκόπηση</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background text-2xl">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{name || 'Όνομα κατηγορίας'}</span>
                    <Badge variant="secondary" className={GROUP_COLORS[color] || ''}>
                      {namePlural || 'Πληθυντικός'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fields.length} πεδί{fields.length === 1 ? 'ο' : 'α'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              Ακύρωση
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
