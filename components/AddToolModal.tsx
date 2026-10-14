'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Plus,
  Globe,
  Sparkles,
  Video,
  Download,
  Wrench,
  Layers,
  ExternalLink,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from 'lucide-react';

interface AddToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolAdded?: (tool: any) => void;
}

const availableIcons = [
  { id: 'Globe', label: 'موقع ويب', icon: Globe },
  { id: 'Sparkles', label: 'ذكاء اصطناعي', icon: Sparkles },
  { id: 'Video', label: 'فيديو واجتماعات', icon: Video },
  { id: 'Download', label: 'تنزيل ووسائط', icon: Download },
  { id: 'Wrench', label: 'أداة مساعدة', icon: Wrench },
  { id: 'Layers', label: 'منصة عمل', icon: Layers },
];

export const AddToolModal: React.FC<AddToolModalProps> = ({
  isOpen,
  onClose,
  onToolAdded,
}) => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('Globe');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !url.trim()) {
      setError('يرجى كتابة اسم الأداة والرابط');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          icon,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حفظ الأداة');
      }

      // Reset form
      setName('');
      setUrl('');
      setDescription('');
      setIcon('Globe');

      if (onToolAdded) {
        onToolAdded(data.tool);
      }

      onClose();
      // Redirect to the newly created tool in-app viewer
      router.push(`/tools/custom/${data.tool.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة الأداة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b101c] border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 animate-fade-in relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">إضافة أداة أو موقع جديد</h2>
              <p className="text-[11px] text-slate-400">تضمين أي موقع للعمل والمشاهدة داخل موقعك مباشرة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Tool Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              اسم الأداة أو الموقع <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Canva، Notion، ChatGPT، لوحة التحليلات..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Tool URL */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              رابط الموقع أو الأداة (URL) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                dir="ltr"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              يمكنك نسخ أي رابط من شريط عنوان المتصفح ولصقه هنا مباشرة.
            </p>
          </div>

          {/* Select Icon */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">أيقونة الأداة:</label>
            <div className="grid grid-cols-3 gap-2">
              {availableIcons.map((item) => {
                const Icon = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setIcon(item.id)}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">وصف الأداة (اختياري):</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لوظيفة هذه الأداة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>حفظ وتضمين الأداة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
