// Formas de respuesta del API. Los contratos de *entrada* (DTOs) viven en
// @birvo/contracts y se comparten con el backend; estas interfaces
// describen las respuestas de lectura, que en el MVP se definen ad-hoc en
// cada servicio de NestJS (ver docs/architecture/overview.md).

export interface ConversationSummary {
  id: string;
  status: string;
  priority: string;
  aiMode: string;
  unreadCount: number;
  lastMessageAt: string;
  contact: { id: string; name: string; avatarUrl: string | null; phone: string | null };
  channel: { id: string; provider: string; displayName: string };
  assignedUser: { id: string; name: string; avatarUrl: string | null } | null;
  tags: Array<{ id: string; name: string; color: string }>;
  lastMessage: { content: string; type: string; direction: string; createdAt: string } | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MessageAttachment {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  duration: number | null;
  transcriptionStatus: string;
  transcriptionText: string | null;
}

export interface MessageDto {
  id: string;
  direction: 'inbound' | 'outbound';
  senderType: 'contact' | 'user' | 'ai' | 'system';
  senderName: string | null;
  messageType: string;
  content: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  attachments: MessageAttachment[];
}

export interface ContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  identities: Array<{ provider: string; username: string | null; channel: string }>;
  recentConversations: Array<{ id: string; status: string; lastMessageAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface InternalNoteDto {
  id: string;
  body: string;
  author: { name: string; avatarUrl?: string | null };
  createdAt: string;
}

export interface TagDto {
  id: string;
  name: string;
  color: string;
}

export interface ChannelAccountDto {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface AiExecutionDto {
  id: string;
  provider: string;
  model: string;
  promptVersion: string;
  output: { text?: string } | null;
  result: string;
  safetyFlags: string[];
  latencyMs: number | null;
  tokensUsed: number | null;
  createdAt: string;
}
