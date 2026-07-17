import { ConversationList } from '@/components/inbox/conversation-list';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-1 overflow-hidden">
      <ConversationList />
      {children}
    </div>
  );
}
