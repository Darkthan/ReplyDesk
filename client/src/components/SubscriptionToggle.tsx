import { useState, useRef } from 'react';

const TEMPLATE_VARS = [
  { label: '{{raison}}', hint: 'Motif de l\'absence' },
  { label: '{{periode}}', hint: 'Nom de la période' },
  { label: '{{date_debut}}', hint: 'Date de début' },
  { label: '{{date_fin}}', hint: 'Date de fin' },
];

interface SubscriptionToggleProps {
  subscription: {
    id: string;
    closure_name: string;
    start_date: string;
    end_date: string;
    custom_subject: string | null;
    custom_message: string | null;
    default_subject: string;
    default_message: string;
    is_active: boolean;
  };
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function SubscriptionToggle({ subscription, onUpdate, onDelete }: SubscriptionToggleProps) {
  const [editing, setEditing] = useState(false);
  const [customSubject, setCustomSubject] = useState(subscription.custom_subject || '');
  const [customMessage, setCustomMessage] = useState(subscription.custom_message || '');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const insertVar = (v: string) => {
    const el = messageRef.current;
    if (!el) { setCustomMessage(customMessage + v); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const newVal = customMessage.slice(0, s) + v + customMessage.slice(e);
    setCustomMessage(newVal);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + v.length; el.focus(); });
  };

  const handleSave = async () => {
    await onUpdate(subscription.id, {
      custom_subject: customSubject || null,
      custom_message: customMessage || null,
    });
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-900">{subscription.closure_name}</h4>
          <p className="text-xs text-gray-500">
            {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditing(!editing)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {editing ? 'Fermer' : 'Personnaliser'}
          </button>
          <button
            onClick={() => onDelete(subscription.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Supprimer
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Sujet personnalisé (vide = défaut : "{subscription.default_subject}")
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="block w-full rounded border-gray-300 shadow-sm text-sm border p-2"
              placeholder={subscription.default_subject}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Message personnalisé (vide = défaut)
            </label>
            <div className="flex gap-1 mb-1 flex-wrap">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v.label}
                  type="button"
                  title={v.hint}
                  onClick={() => insertVar(v.label)}
                  className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <textarea
              ref={messageRef}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="block w-full rounded border-gray-300 shadow-sm text-sm border p-2"
              placeholder={subscription.default_message}
            />
          </div>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}
