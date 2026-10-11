'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Youtube, Eye, Video, Edit3, Save, Trash2, Calendar, FileText } from 'lucide-react';
import { LeadItem } from '@/types';
import { STATUS_MAP, formatNumber, formatDate } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

interface LeadModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onOpenPitch?: (lead: LeadItem) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  leadId,
  isOpen,
  onClose,
  onUpdate,
  onOpenPitch,
}) => {
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [niche, setNiche] = useState('');

  useEffect(() => {
    if (leadId && isOpen) {
      fetchLeadDetails();
    }
  }, [leadId, isOpen]);

  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (data.lead) {
        setLead(data.lead);
        setStatus(data.lead.status);
        setEmail(data.lead.email || '');
        setNotes(data.lead.notes || '');
        setNiche(data.lead.niche || '');
      }
    } catch (err) {
      console.error('Failed to fetch lead:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!leadId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, email, notes, niche }),
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!leadId || !confirm('هل أنت متأكد من حذف هذا العميل نهائياً من قاعدة البيانات؟')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  if (!isOpen || !leadId) return null;

  let recentVideos: string[] = [];
  if (lead?.recentVideos) {
    try {
      recentVideos = JSON.parse(lead.recentVideos);
    } catch (e) {
      recentVideos = [];
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-white/10">
              {lead?.avatarUrl ? (
                <img src={lead.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Youtube className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">
                  {lead?.channelName || 'تفاصيل العميل'}
                </h3>
                {lead && <StatusBadge status={lead.status} />}
              </div>
              <a
                href={lead?.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <span>زيارة القناة على يوتيوب</span>
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">جارٍ تحميل بيانات العميل...</div>
          ) : (
            <>
              {/* Channel Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">المشتركين</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {formatNumber(lead?.subscriberCount || 0)}
                  </p>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">عدد الفيديوهات</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {lead?.videoCount || 0}
                  </p>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">تقييم الفرصة (Score)</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {lead?.score || 0}%
                  </p>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">تاريخ الإضافة</span>
                  <p className="text-xs font-semibold text-slate-300 mt-1">
                    {formatDate(lead?.createdAt)}
                  </p>
                </div>
              </div>

              {/* Status and Niche Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    حالة العميل في الـ Pipeline
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="lead_captured">تم جلب العميل (Lead Captured)</option>
                    <option value="pitch_ready">العرض جاهز (Pitch Ready)</option>
                    <option value="email_sent">تم إرسال البريد (Email Sent)</option>
                    <option value="replied">تم الرد والتفاعل (Replied)</option>
                    <option value="meeting_booked">تم حجز اجتماع (Meeting Booked)</option>
                    <option value="closed">تم إغلاق الصفقة بنجاح (Closed Deal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    البريد الإلكتروني للعميل
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Channel Description */}
              {lead?.description && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    وصف القناة (About)
                  </label>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed max-h-24 overflow-y-auto">
                    {lead.description}
                  </p>
                </div>
              )}

              {/* Recent Videos */}
              {recentVideos.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    آخر الفيديوهات المنشورة على القناة
                  </label>
                  <div className="space-y-1.5">
                    {recentVideos.map((title, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2"
                      >
                        <Video className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="truncate">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظات المتابعة وفريق المبيعات
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سجل أي ملاحظات خاصة بالعميل أو تفاصيل الاتفاق هنا..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف العميل</span>
          </button>
          <div className="flex items-center gap-3">
            {lead && onOpenPitch && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPitch(lead);
                }}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>عرض أو توليد Pitch</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
