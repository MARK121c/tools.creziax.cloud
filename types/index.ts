export interface LeadItem {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  avatarUrl?: string | null;
  email?: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount?: string | null;
  description?: string | null;
  recentVideos?: string | null;
  niche?: string | null;
  status: 'lead_captured' | 'pitch_ready' | 'email_sent' | 'replied' | 'meeting_booked' | 'closed';
  score: number;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  pitches?: PitchItem[];
  outreachLogs?: OutreachLogItem[];
}

export interface PitchItem {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  personalizedStrategy?: string | null;
  status: 'draft' | 'approved' | 'sent';
  generatedAt: string | Date;
  sentAt?: string | Date | null;
}

export interface OutreachLogItem {
  id: string;
  leadId: string;
  pitchId?: string | null;
  status: string;
  errorMessage?: string | null;
  sentAt: string | Date;
}

export interface MeetingBriefItem {
  id: string;
  leadId?: string | null;
  meetingDate?: string | Date | null;
  guestName?: string | null;
  guestEmail?: string | null;
  channelNiche?: string | null;
  briefingText: string;
  recommendedPrice?: string | null;
  strategyNotes?: string | null;
  sentToTelegram: boolean;
  createdAt: string | Date;
  lead?: LeadItem | null;
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string | Date;
}

export interface AnalyticsData {
  totalLeads: number;
  pitchesReady: number;
  emailsSent: number;
  repliesReceived: number;
  meetingsBooked: number;
  closedDeals: number;
  conversionRate: number;
  statusBreakdown: { [key: string]: number };
  recentLeads: LeadItem[];
  recentOutreach: OutreachLogItem[];
}

export interface YouTubeScrapeResult {
  channelId: string;
  channelName: string;
  channelUrl: string;
  avatarUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: string;
  description: string;
  email: string | null;
  recentVideos: string[];
  isDuplicate?: boolean;
}
