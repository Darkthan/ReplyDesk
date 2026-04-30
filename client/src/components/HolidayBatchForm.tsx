import { useState, useRef } from 'react';

interface HolidayEntry {
  name: string;
  date: string;
}

interface HolidayBatchFormProps {
  onSubmit: (data: {
    default_subject: string;
    default_message: string;
    reason?: string;
    holidays: HolidayEntry[];
  }) => Promise<void>;
  onCancel: () => void;
}

const TEMPLATE_VARS = [
  { label: '{{raison}}', value: '{{raison}}' },
  { label: '{{periode}}', value: '{{periode}}' },
  { label: '{{date_debut}}', value: '{{date_debut}}' },
  { label: '{{date_fin}}', value: '{{date_fin}}' },
];

export default function HolidayBatchForm({ onSubmit, onCancel }: HolidayBatchFormProps) {
  const [defaultSubject, setDefaultSubject] = useState('Absence le {{date_debut}}');
  const [defaultMessage, setDefaultMessage] = useState('Je suis absent(e) le {{date_debut}} pour {{raison}}.\n\nJe vous répondrai dès mon retour.');
  const [reason, setReason] = useState('');
  const [holidays, setHolidays] = useState<HolidayEntry[]>([{ name: '', date: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const subjRef = useRef<HTMLInputElement>(null);

  const addEntry = () => setHolidays(prev => [...prev, { name: '', date: '' }]);

  const removeEntry = (i: number) => setHolidays(prev => prev.filter((_, idx) => idx !== i));

  const updateEntry = (i: number, field: keyof HolidayEntry, value: string) => {
    setHolidays(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h));
  };

  const insertVar = (v: string, target: 'subject' | 'message') => {
    if (target === 'subject' && subjRef.current) {
      const el = subjRef.current;
      const start = el.selectionStart ?? defaultSubject.length;
      const end = el.selectionEnd ?? start;
      setDefaultSubject(defaultSubject.slice(0, start) + v + defaultSubject.slice(end));
      setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length); }, 0);
    } else if (target === 'message' && msgRef.current) {
      const el = msgRef.current;
      const start = el.selectionStart ?? defaultMessage.length;
      const end = el.selectionEnd ?? start;
      setDefaultMessage(defaultMessage.slice(0, start) + v + defaultMessage.slice(end));
      setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length); }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const valid = holidays.filter(h => h.name.trim() && h.date);
    if (valid.length === 0) {
      setError('Ajoutez au moins un jour férié avec un nom et une date.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        default_subject: defaultSubject,
        default_message: defaultMessage,
        reason: reason || undefined,
        holidays: valid,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Liste des jours fériés */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Jours fériés à ajouter</label>
          <button
            type="button"
            onClick={addEntry}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Ajouter une date
          </button>
        </div>
        <div className="space-y-2">
          {holidays.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="date"
                value={h.date}
                onChange={e => updateEntry(i, 'date', e.target.value)}
                className="border rounded px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <input
                type="text"
                placeholder="Nom (ex : 1er mai)"
                value={h.name}
                onChange={e => updateEntry(i, 'name', e.target.value)}
                className="border rounded px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              {holidays.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Supprimer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Motif */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motif (optionnel)</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="ex : jour férié légal"
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Sujet par défaut */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sujet de l'auto-réponse</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {TEMPLATE_VARS.map(v => (
            <button key={v.value} type="button" onClick={() => insertVar(v.value, 'subject')}
              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100">
              {v.label}
            </button>
          ))}
        </div>
        <input
          ref={subjRef}
          type="text"
          value={defaultSubject}
          onChange={e => setDefaultSubject(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
      </div>

      {/* Message par défaut */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message de l'auto-réponse</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {TEMPLATE_VARS.map(v => (
            <button key={v.value} type="button" onClick={() => insertVar(v.value, 'message')}
              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100">
              {v.label}
            </button>
          ))}
        </div>
        <textarea
          ref={msgRef}
          value={defaultMessage}
          onChange={e => setDefaultMessage(e.target.value)}
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit" disabled={submitting}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">
          {submitting ? 'Création...' : `Créer ${holidays.filter(h => h.name && h.date).length || ''} jour(s) férié(s)`}
        </button>
      </div>
    </form>
  );
}
