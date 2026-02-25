import { useState, useRef } from 'react';

const TEMPLATE_VARS = [
  { label: '{{raison}}', hint: 'Motif de l\'absence' },
  { label: '{{periode}}', hint: 'Nom de la période' },
  { label: '{{date_debut}}', hint: 'Date de début' },
  { label: '{{date_fin}}', hint: 'Date de fin' },
];

interface ClosureFormProps {
  initial?: {
    name: string;
    start_date: string;
    end_date: string;
    default_subject: string;
    default_message: string;
    reason?: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement>, text: string, onChange: (v: string) => void) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newVal = el.value.slice(0, start) + text + el.value.slice(end);
  onChange(newVal);
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
  });
}

function toLocalDateTimeStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
}

export default function ClosureForm({ initial, onSubmit, onCancel }: ClosureFormProps) {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [form, setForm] = useState({
    name: initial?.name || '',
    start_date: initial?.start_date ? initial.start_date.slice(0, 16) : toLocalDateTimeStr(today),
    end_date: initial?.end_date ? initial.end_date.slice(0, 16) : toLocalDateTimeStr(tomorrow),
    default_subject: initial?.default_subject || 'Absence du {{date_debut}} au {{date_fin}}',
    default_message: initial?.default_message || 'Bonjour,\n\nJe suis absent du {{date_debut}} au {{date_fin}}.\nMotif : {{raison}}\n\nJe vous répondrai dès mon retour.\n\nCordialement',
    reason: initial?.reason || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        reason: form.reason || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Nom de la période</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
          placeholder="Vacances de Noël"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Motif de l'absence</label>
        <input
          type="text"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
          placeholder="Congés annuels, formation, déplacement…"
        />
        <p className="mt-1 text-xs text-gray-400">Utilisable dans le message avec <code className="bg-gray-100 px-1 rounded">{'{{raison}}'}</code></p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date de début</label>
          <input
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date de fin</label>
          <input
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Sujet</label>
        <div className="flex gap-1 mt-1 mb-1 flex-wrap">
          {TEMPLATE_VARS.map((v) => (
            <button
              key={v.label}
              type="button"
              title={v.hint}
              onClick={() => {
                const el = subjectRef.current;
                if (!el) return;
                const s = el.selectionStart ?? 0, e2 = el.selectionEnd ?? 0;
                const newVal = form.default_subject.slice(0, s) + v.label + form.default_subject.slice(e2);
                setForm({ ...form, default_subject: newVal });
                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + v.label.length; el.focus(); });
              }}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100"
            >
              {v.label}
            </button>
          ))}
        </div>
        <input
          ref={subjectRef}
          type="text"
          value={form.default_subject}
          onChange={(e) => setForm({ ...form, default_subject: e.target.value })}
          className="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Message</label>
        <div className="flex gap-1 mt-1 mb-1 flex-wrap">
          {TEMPLATE_VARS.map((v) => (
            <button
              key={v.label}
              type="button"
              title={v.hint}
              onClick={() => insertAtCursor(messageRef, v.label, (val) => setForm({ ...form, default_message: val }))}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100"
            >
              {v.label}
            </button>
          ))}
        </div>
        <textarea
          ref={messageRef}
          value={form.default_message}
          onChange={(e) => setForm({ ...form, default_message: e.target.value })}
          rows={6}
          className="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
          required
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
