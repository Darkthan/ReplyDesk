import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../api/adminClient';
import { useAppSettings } from '../../context/AppSettingsContext';

export default function AppSettingsPage() {
  const { appName, logoUrl, refresh } = useAppSettings();
  const [name, setName] = useState(appName);
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [logoMode, setLogoMode] = useState<'file' | 'url'>('file');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(appName);
    setLogo(logoUrl);
    if (logoUrl && logoUrl.startsWith('http')) {
      setLogoUrlInput(logoUrl);
      setLogoMode('url');
    }
  }, [appName, logoUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 450_000) {
      setError('Image trop volumineuse (max 450 Ko)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const effectiveLogo = logoMode === 'url' ? (logoUrlInput.trim() || null) : logo;
      await adminApi.updateAppSettings({ app_name: name, app_logo: effectiveLogo });
      await refresh();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoUrlInput('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const previewLogo = logoMode === 'url' ? (logoUrlInput.trim() || null) : logo;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personnalisation de l'application</h2>

      {error && <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">{error}</div>}
      {success && <div className="mb-4 bg-green-50 text-green-700 p-3 rounded">Modifications enregistrées.</div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Nom de l'application */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'application</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            placeholder="EmailAuto"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Logo</label>

          {/* Prévisualisation */}
          <div className="mb-4 flex items-center space-x-4">
            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            {previewLogo && (
              <button onClick={handleRemoveLogo} className="text-sm text-red-600 hover:text-red-800">
                Supprimer le logo
              </button>
            )}
          </div>

          {/* Choix du mode */}
          <div className="flex space-x-4 mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" value="file" checked={logoMode === 'file'} onChange={() => setLogoMode('file')} className="text-indigo-600" />
              <span className="text-sm text-gray-700">Fichier image</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" value="url" checked={logoMode === 'url'} onChange={() => setLogoMode('url')} className="text-indigo-600" />
              <span className="text-sm text-gray-700">URL externe</span>
            </label>
          </div>

          {logoMode === 'file' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG — max 450 Ko. Idéalement carré.</p>
            </div>
          ) : (
            <input
              type="url"
              value={logoUrlInput}
              onChange={(e) => setLogoUrlInput(e.target.value)}
              className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="https://example.com/logo.png"
            />
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
