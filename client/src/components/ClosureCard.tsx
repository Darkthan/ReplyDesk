interface ClosureCardProps {
  closure: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    default_subject: string;
    default_message: string;
    is_active: boolean;
  };
  subscribed?: boolean;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
}

export default function ClosureCard({ closure, subscribed, onSubscribe, onUnsubscribe }: ClosureCardProps) {
  const now = new Date();
  const start = new Date(closure.start_date);
  const end = new Date(closure.end_date);
  const isActive = now >= start && now <= end && closure.is_active;
  const isPast = now > end;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${isActive ? 'border-green-500' : isPast ? 'border-gray-300' : 'border-indigo-500'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{closure.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(closure.start_date)} - {formatDate(closure.end_date)}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${isActive ? 'bg-green-100 text-green-800' : isPast ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-800'}`}>
          {isActive ? 'En cours' : isPast ? 'Terminée' : 'A venir'}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-600"><span className="font-medium">Sujet :</span> {closure.default_subject}</p>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{closure.default_message}</p>
      </div>
      {(onSubscribe || onUnsubscribe) && !isPast && (
        <div className="mt-4">
          {subscribed ? (
            <button
              onClick={onUnsubscribe}
              className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
            >
              Se désabonner
            </button>
          ) : (
            <button
              onClick={onSubscribe}
              className="px-4 py-2 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
            >
              S'abonner
            </button>
          )}
        </div>
      )}
    </div>
  );
}
