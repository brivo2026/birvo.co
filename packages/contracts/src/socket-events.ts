/**
 * Catálogo de eventos de Socket.IO emitidos por apps/api y consumidos por
 * apps/web. Los nombres deben coincidir exactamente entre backend y frontend.
 */
export const SocketEvent = {
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_ASSIGNED: 'conversation.assigned',
  CONVERSATION_CLOSED: 'conversation.closed',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_STATUS_UPDATED: 'message.status.updated',
  MESSAGE_TRANSCRIPTION_UPDATED: 'message.transcription.updated',
  AI_SUGGESTION_CREATED: 'ai.suggestion.created',
  NOTIFICATION_CREATED: 'notification.created',
  USER_PRESENCE_UPDATED: 'user.presence.updated',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export function organizationRoom(organizationId: string): string {
  return `organization:${organizationId}`;
}
export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
