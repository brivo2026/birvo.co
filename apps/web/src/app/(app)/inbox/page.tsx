import { MessageSquare } from 'lucide-react';

export default function InboxEmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-slate-400">
      <MessageSquare className="h-12 w-12" strokeWidth={1.2} />
      <p className="text-sm">Selecciona una conversación para empezar.</p>
    </div>
  );
}
