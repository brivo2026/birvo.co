// Enums compartidos entre apps/api, apps/worker y apps/web.
// Deben mantenerse en sincronía con packages/database/prisma/schema.prisma.

export const OrganizationStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
} as const;
export type OrganizationStatus = (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const UserStatus = {
  ACTIVE: 'active',
  INVITED: 'invited',
  DISABLED: 'disabled',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const MembershipStatus = {
  ACTIVE: 'active',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const RoleName = {
  OWNER: 'owner',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  AGENT: 'agent',
  VIEWER: 'viewer',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const Permission = {
  ORG_MANAGE: 'org:manage',
  MEMBERS_MANAGE: 'members:manage',
  CHANNELS_MANAGE: 'channels:manage',
  CONVERSATIONS_VIEW_ALL: 'conversations:view_all',
  CONVERSATIONS_VIEW_ASSIGNED: 'conversations:view_assigned',
  CONVERSATIONS_REPLY: 'conversations:reply',
  CONVERSATIONS_ASSIGN: 'conversations:assign',
  CONVERSATIONS_CLOSE: 'conversations:close',
  CONTACTS_MANAGE: 'contacts:manage',
  TAGS_MANAGE: 'tags:manage',
  NOTES_MANAGE: 'notes:manage',
  AUTOMATIONS_MANAGE: 'automations:manage',
  AI_CONFIGURE: 'ai:configure',
  ANALYTICS_VIEW: 'analytics:view',
  AUDIT_VIEW: 'audit:view',
  SETTINGS_MANAGE: 'settings:manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.OWNER]: Object.values(Permission),
  [RoleName.ADMIN]: [
    Permission.MEMBERS_MANAGE,
    Permission.CHANNELS_MANAGE,
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_REPLY,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    Permission.CONTACTS_MANAGE,
    Permission.TAGS_MANAGE,
    Permission.NOTES_MANAGE,
    Permission.AUTOMATIONS_MANAGE,
    Permission.AI_CONFIGURE,
    Permission.ANALYTICS_VIEW,
    Permission.AUDIT_VIEW,
    Permission.SETTINGS_MANAGE,
  ],
  [RoleName.SUPERVISOR]: [
    Permission.CONVERSATIONS_VIEW_ALL,
    Permission.CONVERSATIONS_REPLY,
    Permission.CONVERSATIONS_ASSIGN,
    Permission.CONVERSATIONS_CLOSE,
    Permission.CONTACTS_MANAGE,
    Permission.TAGS_MANAGE,
    Permission.NOTES_MANAGE,
    Permission.ANALYTICS_VIEW,
  ],
  [RoleName.AGENT]: [
    Permission.CONVERSATIONS_VIEW_ASSIGNED,
    Permission.CONVERSATIONS_REPLY,
    Permission.CONVERSATIONS_CLOSE,
    Permission.CONTACTS_MANAGE,
    Permission.TAGS_MANAGE,
    Permission.NOTES_MANAGE,
  ],
  [RoleName.VIEWER]: [Permission.CONVERSATIONS_VIEW_ALL, Permission.ANALYTICS_VIEW],
};

export const ChannelProvider = {
  SANDBOX: 'sandbox',
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  MESSENGER: 'messenger',
} as const;
export type ChannelProvider = (typeof ChannelProvider)[keyof typeof ChannelProvider];

export const ChannelAccountStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  ERROR: 'error',
  PENDING: 'pending',
} as const;
export type ChannelAccountStatus = (typeof ChannelAccountStatus)[keyof typeof ChannelAccountStatus];

export const ConversationStatus = {
  OPEN: 'open',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REQUIRES_HUMAN: 'requires_human',
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const ConversationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;
export type ConversationPriority = (typeof ConversationPriority)[keyof typeof ConversationPriority];

export const AiMode = {
  OFF: 'off',
  SUGGESTION: 'suggestion',
  AUTOMATIC: 'automatic',
} as const;
export type AiMode = (typeof AiMode)[keyof typeof AiMode];

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageSenderType = {
  CONTACT: 'contact',
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system',
} as const;
export type MessageSenderType = (typeof MessageSenderType)[keyof typeof MessageSenderType];

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file',
  SYSTEM: 'system',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const TranscriptionStatus = {
  NONE: 'none',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type TranscriptionStatus = (typeof TranscriptionStatus)[keyof typeof TranscriptionStatus];

export const AutomationTrigger = {
  INACTIVITY_TIMEOUT: 'inactivity_timeout',
  KEYWORD_MATCH: 'keyword_match',
  CONVERSATION_CREATED: 'conversation_created',
} as const;
export type AutomationTrigger = (typeof AutomationTrigger)[keyof typeof AutomationTrigger];

export const AutomationRunStatus = {
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;
export type AutomationRunStatus = (typeof AutomationRunStatus)[keyof typeof AutomationRunStatus];

export const AiExecutionResult = {
  SUGGESTED: 'suggested',
  SENT: 'sent',
  SKIPPED_SAFETY: 'skipped_safety',
  SKIPPED_RULES: 'skipped_rules',
  FAILED: 'failed',
} as const;
export type AiExecutionResult = (typeof AiExecutionResult)[keyof typeof AiExecutionResult];

export const WebhookEventStatus = {
  RECEIVED: 'received',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
} as const;
export type WebhookEventStatus = (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

export const NotificationType = {
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  AI_SUGGESTION: 'ai_suggestion',
  CONVERSATION_REQUIRES_HUMAN: 'conversation_requires_human',
  MENTION: 'mention',
  SYSTEM: 'system',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const AuditAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  ASSIGN: 'assign',
  SEND_MESSAGE: 'send_message',
  STATUS_CHANGE: 'status_change',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
