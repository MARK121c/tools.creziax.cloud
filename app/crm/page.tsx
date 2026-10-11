'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  Mail,
  Send,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Youtube,
} from 'lucide-react';
import { LeadItem, PitchItem } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNumber, formatDate, STATUS_MAP } from '@/lib/utils';
import { PitchModal } from '@/components/PitchModal';
import { LeadModal } from '@/components/LeadModal';

export default function CRMPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});

  // Modals
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [selectedPitch, setSelectedPitch] = useState<PitchItem | null>(null);
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadUrl, setNewLeadUrl] = useState('');
  const [newLeadNiche, setNewLeadNiche] = useState('مونتاج وفيديو');
  const [newLeadSubs, setNewLeadSubs] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);

  // Mass action status
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/leads', window.location.origin);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Failed to fetch CRM leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    const allSelected = leads.every((l) => selectedLeads[l.id]);
    const updated: Record<string, boolean> = {};
    leads.forEach((l) => {
      updated[l.id] = !allSelected;
    });
    setSelectedLeads(updated);
  };

  const selectedIds = Object.keys(selectedLeads).filter((id) => selectedLeads[id]);

  // Bulk AI Generation
  const handleBulkGenerate = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/ai/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds }),
      });
      const data = await res.json();
      setActionMessage({ type: 'success', text: `تم توليد ${data.generatedCount} عرض جديد بالذكاء الاصطناعي!` });
      fetchLeads();
      setSelectedLeads({});
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'فشل التوليد الجماعي' });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Email Send
  const handleBulkSend = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من إرسال العروض لـ ${selectedIds.length} عميل محدد؟`)) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/email/batch-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds }),
      });
      const data = await res.json();
      setActionMessage({ type: 'success', text: `تم إرسال ${data.sentCount} إيميل بنجاح عبر SMTP!` });
      fetchLeads();
      setSelectedLeads({});
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'فشل الإرسال الجماعي' });
    } finally {
      setActionLoading(false);
    }
  };

  // Inline Status Change
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus as any } : l))
      );
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  // Create Manual Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName) return;
    setCreatingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: newLeadName,
          email: newLeadEmail,
          channelUrl: newLeadUrl,
          niche: newLeadNiche,
          subscriberCount: parseInt(newLeadSubs || '0', 10),
        }),
      });
      if (res.ok) {
        setAddLeadOpen(false);
        setNewLeadName('');
        setNewLeadEmail('');
        setNewLeadUrl('');
        setNewLeadSubs('');
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to create manual lead:', err);
    } finally {
      setCreatingLead(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>CRM & Pipeline Management</span>
            </div>
            <h1 className="text-2xl font-black text-white">إدارة العملاء والمحادثات (CRM)</h1>
            <p className="text-xs text-slate-300 mt-1">
              متابعة كل صانع محتوى، تخصيص العروض الترويجية، مراجعة وتعديل مسار المبيعات وتواريخ الإرسال.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddLeadOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل يدوياً</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'lead_captured', label: 'تم الجلب' },
              { key: 'pitch_ready', label: 'جاهز (AI)' },
              { key: 'email_sent', label: 'تم الإرسال' },
              { key: 'replied', label: 'تم الرد' },
              { key: 'meeting_booked', label: 'موعد محجوز' },
              { key: 'closed', label: 'مغلق 🚀' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`text-xs px-3.5 py-2 rounded-xl font-semibold transition-all flex-shrink-0 ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الإيميل أو النيش..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </form>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2 text-xs animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Mass Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 border border-blue-500/40 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-white font-semibold pr-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>تم تحديد {selectedIds.length} عميل</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkGenerate}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>توليد عروض AI</span>
            </button>
            <button
              onClick={handleBulkSend}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال إيميلات</span>
            </button>
          </div>
        </div>
      )}

      {/* CRM Main Table */}
      <div className="glass-panel p-6 overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 pr-3 w-8">
                  <button
                    onClick={toggleSelectAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      leads.length > 0 && leads.every((l) => selectedLeads[l.id])
                        ? 'bg-blue-600 border-blue-500'
                        : 'border-slate-700'
                    }`}
                  >
                    {leads.length > 0 && leads.every((l) => selectedLeads[l.id]) && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </button>
                </th>
                <th className="pb-3 font-semibold">صانع المحتوى / القناة</th>
                <th className="pb-3 font-semibold">البريد الإلكتروني</th>
                <th className="pb-3 font-semibold">المشتركين</th>
                <th className="pb-3 font-semibold">عرض الـ AI (Pitch)</th>
                <th className="pb-3 font-semibold">مرحلة الـ Pipeline</th>
                <th className="pb-3 pl-3 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>جارٍ تحميل العملاء...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <p className="font-semibold text-white">لا يوجد عملاء يطابقون الفلتر الحالي</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      يمكنك استخدام صائد القنوات لجلب صناع محتوى جدد من يوتيوب.
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = !!selectedLeads[lead.id];
                  const hasPitch = lead.pitches && lead.pitches.length > 0;
                  const latestPitch = hasPitch ? lead.pitches[0] : null;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pr-3">
                        <button
                          onClick={() => toggleSelect(lead.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isSelected && <span className="text-[10px] font-bold">✓</span>}
                        </button>
                      </td>

                      {/* Channel Info */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300 overflow-hidden border border-slate-700 flex-shrink-0">
                            {lead.avatarUrl ? (
                              <img src={lead.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Youtube className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{lead.channelName}</span>
                              <a
                                href={lead.channelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-blue-400"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <span className="text-[11px] text-slate-400 block">{lead.niche || 'عام'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 font-mono text-slate-300">
                        {lead.email ? (
                          <span className="text-emerald-400 font-semibold">{lead.email}</span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setLeadModalOpen(true);
                            }}
                            className="text-[11px] text-amber-400/80 hover:underline italic font-sans"
                          >
                            + إضافة إيميل
                          </button>
                        )}
                      </td>

                      {/* Subs */}
                      <td className="py-3.5 font-bold text-slate-200">
                        {formatNumber(lead.subscriberCount)}
                      </td>

                      {/* AI Pitch Status */}
                      <td className="py-3.5">
                        {hasPitch ? (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setSelectedPitch(latestPitch);
                              setPitchModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all font-medium text-[11px]"
                          >
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>معاينة العرض</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setSelectedPitch(null);
                              setPitchModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-purple-300 text-[11px] flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>+ توليد بالذكاء الاصطناعي</span>
                          </button>
                        )}
                      </td>

                      {/* Pipeline Stage Select */}
                      <td className="py-3.5">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="lead_captured">تم الجلب (Captured)</option>
                          <option value="pitch_ready">العرض جاهز (Pitch Ready)</option>
                          <option value="email_sent">تم الإرسال (Email Sent)</option>
                          <option value="replied">تم الرد (Replied)</option>
                          <option value="meeting_booked">موعد محجوز (Meeting Booked)</option>
                          <option value="closed">صفقة مغلقة 🚀 (Closed)</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 pl-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setSelectedPitch(latestPitch);
                              setPitchModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="إرسال إيميل العرض"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setLeadModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            title="تفاصيل العميل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Lead Modal */}
      {addLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-1">إضافة صانع محتوى يدوياً للـ CRM</h3>
            <p className="text-xs text-slate-400 mb-4">أدخل بيانات العميل لإضافته وتوليد عروض ذكاء اصطناعي له</p>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم القناة / العميل</label>
                <input
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="مثال: بودكاست الرواد"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    placeholder="creator@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">المجال / النيش</label>
                  <input
                    type="text"
                    value={newLeadNiche}
                    onChange={(e) => setNewLeadNiche(e.target.value)}
                    placeholder="بودكاست، فيتنس، إلخ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">عدد المشتركين</label>
                  <input
                    type="number"
                    value={newLeadSubs}
                    onChange={(e) => setNewLeadSubs(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رابط القناة (URL)</label>
                  <input
                    type="url"
                    value={newLeadUrl}
                    onChange={(e) => setNewLeadUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingLead}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {creatingLead ? 'جارٍ الإضافة...' : 'حفظ العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <PitchModal
        lead={selectedLead}
        pitch={selectedPitch}
        isOpen={pitchModalOpen}
        onClose={() => setPitchModalOpen(false)}
        onSuccess={fetchLeads}
      />

      <LeadModal
        leadId={selectedLead?.id || null}
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onUpdate={fetchLeads}
        onOpenPitch={(lead) => {
          setSelectedLead(lead);
          setPitchModalOpen(true);
        }}
      />
    </div>
  );
}
