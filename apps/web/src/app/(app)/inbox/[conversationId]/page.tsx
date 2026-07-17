'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useConversationDetail } from '@/hooks/use-conversation-detail';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ConversationHeader } from '@/components/inbox/conversation-header';
import { MessageList } from '@/components/inbox/message-list';
import { Composer } from '@/components/inbox/composer';
import { AiSuggestionBanner } from '@/components/inbox/ai-suggestion-banner';
import { ContactPanel } from '@/components/inbox/contact-panel';
import { FullPageSpinner } from '@/components/ui/spinner';

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { data, isLoading, isError } = useConversationDetail(conversationId);
  const { data: userData } = useCurrentUser();
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: () => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  useEffect(() => {
    if (conversationId) markAsReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  if (isLoading) return <FullPageSpinner />;

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        No se pudo cargar esta conversación, o no tienes acceso a ella.
      </div>
    );
  }

  const canReply = userData?.user.permissions.includes('conversations:reply') ?? false;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader conversation={data} />
        <AiSuggestionBanner conversationId={conversationId} />
        <MessageList conversationId={conversationId} />
        <Composer conversationId={conversationId} canReply={canReply} />
      </div>
      <ContactPanel conversation={data} />
    </div>
  );
}
