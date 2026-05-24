import React from "react";
import type { Conversation } from "../../types";
import { useConversations } from "./useMessages";
import { useStore, selectUser } from "../../store";

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
}

function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId?: string;
  onClick: () => void;
}) {
  const otherParticipants = conversation.participants?.filter(
    (p) => p.id !== currentUserId
  );
  const displayName =
    otherParticipants?.map((p) => p.name).join(", ") ||
    "Conversa";

  const hasUnread = (conversation.unread_count ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
      }`}
    >
      {/* Avatar placeholder */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
        {displayName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              hasUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
            }`}
          >
            {displayName}
          </p>
          {conversation.last_message_at && (
            <span className="flex-shrink-0 text-xs text-gray-400">
              {new Date(conversation.last_message_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        {conversation.last_message_preview && (
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {conversation.last_message_preview}
          </p>
        )}
      </div>

      {hasUnread && (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
          {conversation.unread_count}
        </span>
      )}
    </button>
  );
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  selectedId,
}) => {
  const user = useStore(selectUser);
  const { conversations, loading, error, refetch } = useConversations();

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-600">
        {error.message}
        <button onClick={refetch} className="ml-2 underline">
          Recarregar
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Nenhuma conversa ainda.
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          currentUserId={user?.id}
          onClick={() => onSelectConversation(conv)}
        />
      ))}
    </div>
  );
};

export default ConversationList;
