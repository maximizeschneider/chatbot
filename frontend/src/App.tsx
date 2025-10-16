import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { SourceDialog } from "@/components/chat/source-dialog";
import { FeedbackDialog } from "@/components/chat/feedback-dialog";
import { Toaster } from "@/components/ui/sonner";
import { useChatMutation } from "@/api/chat";
import type { ChatRequest } from "@/api/chat";
import { useFeedbackMutation } from "@/api/feedback";
import { useQuestionGenerationMutation } from "@/api/questions";
import { fetchConversationMessages, fetchMessageSources } from "@/api/message";
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  useUpdateConversationMutation,
} from "@/api/conversation";
import { useConfigQuery, type ConfigOption } from "@/api/config";
import { useUserProfileQuery, type UserProfile } from "@/api/user-profile";
import type {
  ChatMessage,
  ConversationData,
  PendingFeedback,
  Source,
} from "@/types/chat";
import type { StickToBottomContext } from "use-stick-to-bottom";

const INITIAL_CONVERSATION: ConversationData = {
  id: "local-seed",
  title: "New Conversation",
};

interface ActiveStreamState {
  conversationId: string | null;
  isStreaming: boolean;
  message: string;
  statusUpdate: string;
  error: string | null;
}

const INITIAL_STREAM_STATE: ActiveStreamState = {
  conversationId: null,
  isStreaming: false,
  message: "",
  statusUpdate: "",
  error: null,
};

const NEGATIVE_FEEDBACK_OPTIONS = [
  { value: "incorrect", label: "Incorrect or misleading information" },
  { value: "missing", label: "Missing important details" },
  { value: "not-helpful", label: "Not relevant or helpful" },
  { value: "tone", label: "Tone or style issue" },
  { value: "other", label: "Other" },
] as const;

type NegativeFeedbackValue =
  (typeof NEGATIVE_FEEDBACK_OPTIONS)[number]["value"];

const OTHER_FEEDBACK_VALUE: NegativeFeedbackValue = "other";

const normalizeSources = (sources?: Source[] | null): Source[] | undefined => {
  if (!Array.isArray(sources)) {
    return undefined;
  }

  return sources.map((source) => ({
    ...source,
    text: source.text ?? "No excerpt available.",
    relevantParts: source.relevantParts ?? [],
  }));
};

const parseFeedbackReason = (
  reason?: string | null
): { selectedReason: NegativeFeedbackValue | null; customExplanation: string } => {
  if (!reason || !reason.trim()) {
    return {
      selectedReason: null,
      customExplanation: "",
    };
  }

  const normalized = reason.trim();
  const matchedOption = NEGATIVE_FEEDBACK_OPTIONS.find(
    (option) =>
      option.label.toLowerCase() === normalized.toLowerCase() ||
      option.value === normalized
  );
  if (matchedOption) {
    if (matchedOption.value === OTHER_FEEDBACK_VALUE) {
      const explanation = normalized
        .replace(/^other\s*[:\-]?\s*/i, "")
        .trim();
      return {
        selectedReason: OTHER_FEEDBACK_VALUE,
        customExplanation: explanation,
      };
    }

    return {
      selectedReason: matchedOption.value,
      customExplanation: "",
    };
  }

  if (/^other\b/i.test(normalized)) {
    const explanation = normalized.replace(/^other\s*[:\-]?\s*/i, "").trim();
    return {
      selectedReason: OTHER_FEEDBACK_VALUE,
      customExplanation: explanation,
    };
  }

  return {
    selectedReason: OTHER_FEEDBACK_VALUE,
    customExplanation: normalized,
  };
};

const formatFeedbackReason = (
  selectedReason: NegativeFeedbackValue,
  customExplanation: string
): string => {
  const option = NEGATIVE_FEEDBACK_OPTIONS.find(
    (candidate) => candidate.value === selectedReason
  );

  if (!option) {
    return customExplanation.trim();
  }

  if (selectedReason === OTHER_FEEDBACK_VALUE) {
    const trimmed = customExplanation.trim();
    return trimmed ? `Other: ${trimmed}` : option.label;
  }

  return option.label;
};

const isNegativeFeedbackValue = (
  value: string | null | undefined
): value is NegativeFeedbackValue =>
  typeof value === "string" &&
  NEGATIVE_FEEDBACK_OPTIONS.some((option) => option.value === value);

export default function App() {
  const [conversations, setConversations] = useState<ConversationData[]>([
    INITIAL_CONVERSATION,
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    INITIAL_CONVERSATION.id
  );
  const [activeStream, setActiveStream] =
    useState<ActiveStreamState>(INITIAL_STREAM_STATE);
  const [selectedSourceContext, setSelectedSourceContext] = useState<{
    sources: Source[];
    index: number;
  } | null>(null);
  const [selectedConfigName, setSelectedConfigName] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingFeedback, setPendingFeedback] =
    useState<PendingFeedback | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({
    [INITIAL_CONVERSATION.id]: [],
  });
  const [messagesLoadingByConversation, setMessagesLoadingByConversation] =
    useState<Record<string, boolean>>({});
  const [_messagesErrorByConversation, setMessagesErrorByConversation] =
    useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomContextRef = useRef<StickToBottomContext | null>(null);
  const hasUserScrolledDuringStreamRef = useRef(false);
  const wasStreamingRef = useRef(false);
  const streamingConversationRef = useRef<string | null>(null);
  const [hasInitializedConversations, setHasInitializedConversations] =
    useState(false);
  const [visibleSourcesByConversation, setVisibleSourcesByConversation] =
    useState<Record<string, Record<string, boolean>>>({});
  const [loadingSourcesByConversation, setLoadingSourcesByConversation] =
    useState<Record<string, Record<string, boolean>>>({});
  const [sourcesErrorByConversation, setSourcesErrorByConversation] =
    useState<Record<string, Record<string, string>>>({});
  const visibleSourcesRef = useRef(visibleSourcesByConversation);
  const conversationsRef = useRef(conversations);
  const messagesRef = useRef(messagesByConversation);

  useEffect(() => {
    visibleSourcesRef.current = visibleSourcesByConversation;
  }, [visibleSourcesByConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesRef.current = messagesByConversation;
  }, [messagesByConversation]);

  const loadMessagesForConversation = useCallback(
    async (conversationId: string, { force = false }: { force?: boolean } = {}) => {
      if (!conversationId) {
        return;
      }

      if (!force && messagesRef.current[conversationId] !== undefined) {
        return;
      }

      setMessagesErrorByConversation((current) => {
        const next = { ...current };
        delete next[conversationId];
        return next;
      });

      setMessagesLoadingByConversation((current) => ({
        ...current,
        [conversationId]: true,
      }));

      try {
        const fetchedMessages = await fetchConversationMessages(conversationId);
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: fetchedMessages,
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load messages for this conversation.";
        setMessagesErrorByConversation((current) => ({
          ...current,
          [conversationId]: message,
        }));
        toast.error("Failed to load messages", {
          description: message,
        });
      } finally {
        setMessagesLoadingByConversation((current) => {
          const next = { ...current };
          delete next[conversationId];
          return next;
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void loadMessagesForConversation(activeConversationId);

    setVisibleSourcesByConversation((current) => {
      if (current[activeConversationId] && Object.keys(current[activeConversationId]).length === 0) {
        return current;
      }

      const next = {
        ...current,
        [activeConversationId]: {},
      };
      visibleSourcesRef.current = next;
      return next;
    });

    setLoadingSourcesByConversation((current) => {
      if (!current[activeConversationId]) {
        return current;
      }
      const next = { ...current };
      delete next[activeConversationId];
      return next;
    });

    setSourcesErrorByConversation((current) => {
      if (!current[activeConversationId]) {
        return current;
      }
      const next = { ...current };
      delete next[activeConversationId];
      return next;
    });
  }, [activeConversationId, loadMessagesForConversation]);

  const { data: configData, isError: isConfigError, error: configError } = useConfigQuery();
  const { data: userProfileData, isError: isProfileError, error: profileError } = useUserProfileQuery();
  const { data: remoteConversations, isError: isConversationsError, error: conversationsError } = useConversationsQuery();

  // Show toast notifications for query errors
  useEffect(() => {
    if (isConfigError) {
      toast.error("Failed to load configs", {
        description: configError instanceof Error ? configError.message : "Could not fetch configuration options",
      });
    }
  }, [isConfigError, configError]);

  useEffect(() => {
    if (isProfileError) {
      toast.error("Failed to load user profiles", {
        description: profileError instanceof Error ? profileError.message : "Could not fetch user profile options",
      });
    }
  }, [isProfileError, profileError]);

  useEffect(() => {
    if (isConversationsError) {
      toast.error("Failed to load conversations", {
        description: conversationsError instanceof Error ? conversationsError.message : "Could not fetch your conversation history",
      });
    }
  }, [isConversationsError, conversationsError]);

  // Process configs: put publishedToMain first
  const configOptions: ConfigOption[] = configData
    ? (() => {
        const published = configData.find((c) => c.publishedToMain);
        const others = configData.filter((c) => !c.publishedToMain);
        return published ? [published, ...others] : configData;
      })()
    : [];

  // get upn from context session, hardcoded for now
  const upn = "max1.schneider@genbw.com"
  const userProfileOptions: UserProfile[] = userProfileData
    ? [{ name: upn, _id: "upn" }, ...userProfileData]
    : [];

  useEffect(() => {
    if (
      selectedConfigName &&
      configOptions.length > 0 &&
      !configOptions.some((c) => c.name === selectedConfigName)
    ) {
      setSelectedConfigName(configOptions[0]?.name ?? null);
    } else if (!selectedConfigName && configOptions.length > 0) {
      setSelectedConfigName(configOptions[0]?.name ?? null);
    }
  }, [configOptions, selectedConfigName]);

  useEffect(() => {
    if (
      selectedProfile &&
      userProfileOptions.length > 0 &&
      !userProfileOptions.some((p) => p.name === selectedProfile.name)
    ) {
      setSelectedProfile(userProfileOptions[0] ?? null);
    } else if (!selectedProfile && userProfileOptions.length > 0) {
      setSelectedProfile(userProfileOptions[0] ?? null);
    }
  }, [userProfileOptions, selectedProfile]);

  useEffect(() => {
    if (hasInitializedConversations) return;
    if (remoteConversations) {
      if (remoteConversations.length > 0) {
        setConversations(remoteConversations);
        setActiveConversationId(remoteConversations[0].id);
        setMessagesByConversation({});
        setMessagesLoadingByConversation({});
        setMessagesErrorByConversation({});
      }
      setHasInitializedConversations(true);
    }
  }, [remoteConversations, hasInitializedConversations]);

  const chatMutation = useChatMutation({
    onStatusUpdate: (status) => {
      setActiveStream((current) => {
        if (
          !streamingConversationRef.current ||
          current.conversationId !== streamingConversationRef.current
        ) {
          return current;
        }

        return {
          ...current,
          statusUpdate: status,
        };
      });
    },
    onToken: (token) => {
      setActiveStream((current) => {
        if (
          !streamingConversationRef.current ||
          current.conversationId !== streamingConversationRef.current
        ) {
          return current;
        }

        return {
          ...current,
          message: current.message + token,
          statusUpdate: "",
        };
      });
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });
  const feedbackMutation = useFeedbackMutation();
  const questionMutation = useQuestionGenerationMutation();
  const createConversationMutation = useCreateConversationMutation();
  const updateConversationMutation = useUpdateConversationMutation();
  const deleteConversationMutation = useDeleteConversationMutation();

  const activeMessages =
    messagesByConversation[activeConversationId] ?? [];

  const loadSourcesForMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const conversationExists = conversationsRef.current.some(
        (conv) => conv.id === conversationId
      );
      const messagesForConversation = messagesRef.current[conversationId];
      const message = messagesForConversation?.find(
        (msg) => msg.id === messageId
      );

      if (!conversationExists || !message || message.role !== "assistant") {
        return;
      }

      if (message.sources !== undefined) {
        setLoadingSourcesByConversation((current) => {
          const conversationLoading = current[conversationId];
          if (
            !conversationLoading ||
            conversationLoading[messageId] === undefined
          ) {
            return current;
          }
          const { [messageId]: _removed, ...rest } = conversationLoading;
          const next = { ...current };
          if (Object.keys(rest).length > 0) {
            next[conversationId] = rest;
          } else {
            delete next[conversationId];
          }
          return next;
        });
        setSourcesErrorByConversation((current) => {
          const conversationErrors = current[conversationId];
          if (
            !conversationErrors ||
            conversationErrors[messageId] === undefined
          ) {
            return current;
          }
          const { [messageId]: _removed, ...rest } = conversationErrors;
          const next = { ...current };
          if (Object.keys(rest).length > 0) {
            next[conversationId] = rest;
          } else {
            delete next[conversationId];
          }
          return next;
        });
        return;
      }

    try {
      setLoadingSourcesByConversation((current) => ({
        ...current,
        [conversationId]: {
          ...(current[conversationId] ?? {}),
          [messageId]: true,
        },
      }));

      setSourcesErrorByConversation((current) => {
        const conversationErrors = current[conversationId];
        if (!conversationErrors || conversationErrors[messageId] === undefined) {
          return current;
        }
        const { [messageId]: _removed, ...rest } = conversationErrors;
        const next = { ...current };
        if (Object.keys(rest).length > 0) {
          next[conversationId] = rest;
        } else {
          delete next[conversationId];
        }
        return next;
      });
        const fetchedSources = await fetchMessageSources({
          conversationId,
          messageId,
        });
        const normalized = normalizeSources(fetchedSources) ?? [];
        if (!visibleSourcesRef.current[conversationId]?.[messageId]) {
          return;
        }
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((msg) =>
            msg.id === messageId ? { ...msg, sources: normalized } : msg
          ),
        }));
      } catch (error) {
        if (!visibleSourcesRef.current[conversationId]?.[messageId]) {
          return;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to load sources for this response.";
        setSourcesErrorByConversation((current) => ({
          ...current,
          [conversationId]: {
            ...(current[conversationId] ?? {}),
            [messageId]: errorMessage,
          },
        }));
      } finally {
        setLoadingSourcesByConversation((current) => {
          const conversationLoading = current[conversationId];
          if (!conversationLoading) {
            return current;
          }
          const { [messageId]: _removed, ...rest } = conversationLoading;
          const next = { ...current };
          if (Object.keys(rest).length > 0) {
            next[conversationId] = rest;
          } else {
            delete next[conversationId];
          }
          return next;
        });
      }
    },
    []
  );

  const isActiveConversationStreaming =
    activeStream.isStreaming &&
    activeStream.conversationId === activeConversationId;

  useEffect(() => {
    if (isActiveConversationStreaming && !wasStreamingRef.current) {
      hasUserScrolledDuringStreamRef.current = false;
    }

    if (!isActiveConversationStreaming && wasStreamingRef.current) {
      hasUserScrolledDuringStreamRef.current = false;
    }

    wasStreamingRef.current = isActiveConversationStreaming;
  }, [isActiveConversationStreaming]);

  const scrollToBottom = useCallback(() => {
    if (
      isActiveConversationStreaming &&
      hasUserScrolledDuringStreamRef.current
    ) {
      return;
    }

    const stickContext = stickToBottomContextRef.current;
    if (stickContext) {
      void stickContext.scrollToBottom();
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isActiveConversationStreaming]);

  const visibleStreamingMessage =
    activeStream.conversationId === activeConversationId
      ? activeStream.message
      : "";
  const visibleStatusUpdate =
    activeStream.conversationId === activeConversationId
      ? activeStream.statusUpdate
      : "";
  const visibleError =
    activeStream.conversationId === activeConversationId
      ? activeStream.error
      : null;
  const isLoadingMessages =
    !!(
      activeConversationId &&
      messagesLoadingByConversation[activeConversationId]
    );

  useEffect(() => {
    scrollToBottom();
  }, [
    activeMessages,
    visibleStreamingMessage,
    visibleStatusUpdate,
    visibleError,
    scrollToBottom,
  ]);

  const handleStickToBottomEscapeChange = useCallback(
    (escaped: boolean) => {
      if (isActiveConversationStreaming && escaped) {
        hasUserScrolledDuringStreamRef.current = true;
      }
    },
    [isActiveConversationStreaming]
  );

  const createNewConversation = async () => {
    // Optimistic update: create temporary conversation immediately
    const tempId = `temp-${Date.now()}`;
    const tempConv: ConversationData = {
      id: tempId,
      title: "New Conversation",
    };

    setConversations((prev) => [tempConv, ...prev]);
    setMessagesByConversation((prev) => ({
      ...prev,
      [tempId]: [],
    }));
    setActiveConversationId(tempId);

    try {
      const created = await createConversationMutation.mutateAsync({
        title: "New Conversation",
      });

      // Replace temporary conversation with the real one
      setConversations((prev) =>
        prev.map((conv) => (conv.id === tempId ? created : conv))
      );
      setMessagesByConversation((prev) => {
        const { [tempId]: tempMessages = [], ...rest } = prev;
        return {
          ...rest,
          [created.id]: tempMessages,
        };
      });
      setActiveConversationId(created.id);
    } catch (error) {
      console.error("Failed to create conversation via API:", error);
      toast.error("Failed to create conversation", {
        description: error instanceof Error ? error.message : "Could not create a new conversation. You can still use it locally.",
      });
      // Keep the temporary conversation for local use
      // Replace temp ID with a permanent local ID
      const localId = `local-${Date.now()}`;
      setConversations((prev) =>
        prev.map((conv) => (conv.id === tempId ? { ...conv, id: localId } : conv))
      );
      setMessagesByConversation((prev) => {
        const { [tempId]: tempMessages = [], ...rest } = prev;
        return {
          ...rest,
          [localId]: tempMessages,
        };
      });
      setActiveConversationId(localId);
    }
  };

  const updateConversationTitle = (convId: string, firstMessage: string) => {
    const trimmed = firstMessage.trim();
    if (!trimmed) {
      return;
    }

    const messageCount = messagesRef.current[convId]?.length ?? 0;
    if (messageCount > 1) {
      return;
    }

    const title =
      trimmed.slice(0, 30) + (trimmed.length > 30 ? "..." : "");

    setConversations((prev) =>
      prev.map((conv) => (conv.id === convId ? { ...conv, title } : conv))
    );

    if (convId.startsWith("temp-") || convId.startsWith("local-")) {
      return;
    }

    updateConversationMutation.mutate({
      conversationId: convId,
      title,
    });
  };

  const deleteConversation = async (conversationId: string) => {
    const conversationToDelete = conversations.find(
      (conv) => conv.id === conversationId
    );
    if (!conversationToDelete) return;

    const previousActiveId = activeConversationId;
    const previousConversations = conversations;
    const previousMessages = messagesByConversation;

    const remainingConversations = conversations.filter(
      (conv) => conv.id !== conversationId
    );

    if (remainingConversations.length === 0) {
      const newConversation: ConversationData = {
        id: Date.now().toString(),
        title: "New Conversation",
      };
      setConversations([newConversation]);
      setActiveConversationId(newConversation.id);
      setMessagesByConversation((prev) => {
        const { [conversationId]: _removed, ...rest } = prev;
        return {
          ...rest,
          [newConversation.id]: [],
        };
      });
    } else {
      setConversations(remainingConversations);
      if (conversationId === activeConversationId) {
        setActiveConversationId(remainingConversations[0].id);
      }
      setMessagesByConversation((prev) => {
        const { [conversationId]: _removed, ...rest } = prev;
        return rest;
      });
    }

    setVisibleSourcesByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const { [conversationId]: _removed, ...rest } = current;
      return rest;
    });
    setLoadingSourcesByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const { [conversationId]: _removed, ...rest } = current;
      return rest;
    });
    setSourcesErrorByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const { [conversationId]: _removed, ...rest } = current;
      return rest;
    });
    setMessagesLoadingByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const { [conversationId]: _removed, ...rest } = current;
      return rest;
    });
    setMessagesErrorByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const { [conversationId]: _removed, ...rest } = current;
      return rest;
    });

    try {
      await deleteConversationMutation.mutateAsync({ conversationId });
    } catch (error) {
      console.error("Failed to delete conversation via API:", error);
      toast.error("Failed to delete conversation", {
        description:
          error instanceof Error
            ? error.message
            : "Could not delete the conversation. It has been restored.",
      });

      setConversations(previousConversations);
      setMessagesByConversation(previousMessages);
      setActiveConversationId(previousActiveId);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || activeStream.isStreaming) return;

    const conversationId = activeConversationId;
    if (!conversationId) {
      return;
    }

    const existingMessages = messagesRef.current[conversationId] ?? [];
    const hadMessages = existingMessages.length > 0;
    setVisibleSourcesByConversation((current) => {
      if (!current[conversationId]) {
        const next = {
          ...current,
          [conversationId]: {},
        };
        visibleSourcesRef.current = next;
        return next;
      }

      const next = { ...current };
      delete next[conversationId];
      visibleSourcesRef.current = next;
      return next;
    });
    setSourcesErrorByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const next = { ...current };
      delete next[conversationId];
      return next;
    });
    setLoadingSourcesByConversation((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const next = { ...current };
      delete next[conversationId];
      return next;
    });

    streamingConversationRef.current = conversationId;
    setActiveStream({
      conversationId,
      isStreaming: true,
      message: "",
      statusUpdate: "",
      error: null,
    });
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      conversationId,
      role: "user",
      content: text,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), userMessage],
    }));

    if (!hadMessages) {
      updateConversationTitle(conversationId, text);
    }

    try {
      const chatRequest: ChatRequest = {
        prompt: text,
        conversationId,
      };
      if (selectedConfigName) {
        chatRequest.configName = selectedConfigName;
      }
      if (selectedProfile) {
        if (selectedProfile._id === "upn") {
          chatRequest.upn = selectedProfile.name;
        } else {
          chatRequest.profile = selectedProfile;
        }
      }

      const finalPayload = await chatMutation.mutateAsync(chatRequest);

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        conversationId,
        role: "assistant",
        content: finalPayload.message,
        feedback: null,
      };
      const normalizedSources = normalizeSources(finalPayload.sources);
      if (normalizedSources !== undefined) {
        assistantMessage.sources = normalizedSources;
      }

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [
          ...(prev[conversationId] ?? []),
          assistantMessage,
        ],
      }));

      setVisibleSourcesByConversation((current) => {
        const next = {
          ...current,
          [conversationId]: {
            [assistantMessage.id]: true,
          },
        };
        visibleSourcesRef.current = next;
        return next;
      });

      setLoadingSourcesByConversation((current) => {
        if (!current[conversationId]) {
          return current;
        }
        const next = { ...current };
        delete next[conversationId];
        return next;
      });

      setSourcesErrorByConversation((current) => {
        if (!current[conversationId]) {
          return current;
        }
        const next = { ...current };
        delete next[conversationId];
        return next;
      });
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while sending your message.";
      
      // Show toast notification for chat error
      toast.error("Chat error", {
        description: errorMessage,
      });

      setActiveStream((current) => {
        if (current.conversationId !== conversationId) {
          return current;
        }

        return {
          ...current,
          error: errorMessage,
        };
      });
    } finally {
      streamingConversationRef.current = null;
      setActiveStream((current) => {
        if (current.conversationId !== conversationId) {
          return current;
        }

        if (current.error) {
          return {
            ...current,
            isStreaming: false,
            statusUpdate: "",
            message: "",
          };
        }

        return {
          conversationId: null,
          isStreaming: false,
          message: "",
          statusUpdate: "",
          error: null,
        };
      });
    }
  };

  const handleFeedback = (
    messageId: string,
    feedback: "up" | "down" | null,
    reason?: string
  ) => {
    if (!activeConversationId) {
      return;
    }

    const trimmedReason = reason?.trim();

    setMessagesByConversation((prev) => {
      const messages = prev[activeConversationId];
      if (!messages) {
        return prev;
      }
      return {
        ...prev,
        [activeConversationId]: messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                feedback,
                feedbackReason:
                  feedback === "down"
                    ? trimmedReason || undefined
                    : undefined,
              }
            : msg
        ),
      };
    });

    feedbackMutation.mutate({
      conversationId: activeConversationId,
      messageId,
      feedback,
      reason: trimmedReason,
    });
  };

  const handleNegativeFeedbackClick = (message: ChatMessage) => {
    if (message.feedback === "down") {
      handleFeedback(message.id, null);
      return;
    }

    const { selectedReason, customExplanation } = parseFeedbackReason(
      message.feedbackReason
    );

    setPendingFeedback({
      messageId: message.id,
      selectedReason,
      customExplanation,
    });
  };

  const closeFeedbackDialog = () => {
    setPendingFeedback(null);
  };

  const submitFeedbackReason = () => {
    if (
      !pendingFeedback ||
      !isNegativeFeedbackValue(pendingFeedback.selectedReason)
    ) {
      return;
    }

    const reason = formatFeedbackReason(
      pendingFeedback.selectedReason,
      pendingFeedback.customExplanation
    );

    if (!reason.trim()) {
      return;
    }

    handleFeedback(pendingFeedback.messageId, "down", reason);
    closeFeedbackDialog();
  };

  const handleFeedbackReasonSelect = (value: string) => {
    if (!isNegativeFeedbackValue(value)) {
      return;
    }

    setPendingFeedback((current) =>
      current
        ? {
            ...current,
            selectedReason: value,
            customExplanation:
              value === OTHER_FEEDBACK_VALUE ? current.customExplanation : "",
          }
        : current
    );
  };

  const handleFeedbackExplanationChange = (value: string) => {
    setPendingFeedback((current) =>
      current
        ? {
            ...current,
            customExplanation: value,
          }
        : current
    );
  };

  const handleGenerateQuestions = async (message: ChatMessage) => {
    if (message.role !== "assistant" || questionMutation.isPending) {
      return;
    }

    if (!activeConversationId) {
      return;
    }

    try {
      const result = await questionMutation.mutateAsync({
        messageId: message.id,
        conversationId: activeConversationId,
        text: message.content,
      });

      if (result.questions?.length) {
        setMessagesByConversation((prev) => {
          const messages = prev[activeConversationId];
          if (!messages) {
            return prev;
          }
          return {
            ...prev,
            [activeConversationId]: messages.map((msg) =>
              msg.id === message.id
                ? { ...msg, suggestedQuestions: result.questions }
                : msg
            ),
          };
        });
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
    }
  };

  const handleFollowUpSelect = (messageId: string, question: string) => {
    const text = question.trim();
    if (!text) {
      return;
    }

    if (!activeConversationId) {
      return;
    }

    setMessagesByConversation((prev) => {
      const messages = prev[activeConversationId];
      if (!messages) {
        return prev;
      }

      return {
        ...prev,
        [activeConversationId]: messages.map((msg) => {
          if (msg.id !== messageId) {
            return msg;
          }

          const { suggestedQuestions: _removed, ...messageWithoutSuggestions } =
            msg;
          return messageWithoutSuggestions;
        }),
      };
    });

    void handleSendMessage(text);
  };

  const toggleSourcesVisibility = (message: ChatMessage) => {
    if (!activeConversationId) {
      return;
    }

    const conversationId = activeConversationId;
    const currentlyVisible =
      visibleSourcesByConversation[conversationId]?.[message.id] ?? false;

    if (currentlyVisible) {
      setVisibleSourcesByConversation((current) => {
        const conversationVisibility = current[conversationId];
        if (!conversationVisibility) {
          return current;
        }
        const { [message.id]: _removed, ...rest } = conversationVisibility;
        const next = { ...current };
        if (Object.keys(rest).length > 0) {
          next[conversationId] = rest;
        } else {
          delete next[conversationId];
        }
        visibleSourcesRef.current = next;
        return next;
      });
      setSourcesErrorByConversation((current) => {
        const conversationErrors = current[conversationId];
        if (!conversationErrors || conversationErrors[message.id] === undefined) {
          return current;
        }
        const { [message.id]: _removed, ...rest } = conversationErrors;
        const next = { ...current };
        if (Object.keys(rest).length > 0) {
          next[conversationId] = rest;
        } else {
          delete next[conversationId];
        }
        return next;
      });
      setLoadingSourcesByConversation((current) => {
        const conversationLoading = current[conversationId];
        if (!conversationLoading) {
          return current;
        }
        const { [message.id]: _removed, ...rest } = conversationLoading;
        const next = { ...current };
        if (Object.keys(rest).length > 0) {
          next[conversationId] = rest;
        } else {
          delete next[conversationId];
        }
        return next;
      });
      return;
    }

    setVisibleSourcesByConversation((current) => {
      const next = {
        ...current,
        [conversationId]: {
          ...(current[conversationId] ?? {}),
          [message.id]: true,
        },
      };
      visibleSourcesRef.current = next;
      return next;
    });

    if (message.sources !== undefined) {
      setSourcesErrorByConversation((current) => {
        const conversationErrors = current[conversationId];
        if (!conversationErrors || conversationErrors[message.id] === undefined) {
          return current;
        }
        const { [message.id]: _removed, ...rest } = conversationErrors;
        const next = { ...current };
        if (Object.keys(rest).length > 0) {
          next[conversationId] = rest;
        } else {
          delete next[conversationId];
        }
        return next;
      });
      return;
    }

    void loadSourcesForMessage(conversationId, message.id);
  };

  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-background">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          configOptions={configOptions}
          selectedConfigName={selectedConfigName}
          userProfileOptions={userProfileOptions}
          selectedProfile={selectedProfile}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onCreateConversation={() => {
            void createNewConversation();
          }}
          onSelectConversation={setActiveConversationId}
          onSelectConfigName={setSelectedConfigName}
          onSelectProfile={setSelectedProfile}
          onDeleteConversation={(conversationId) => {
            void deleteConversation(conversationId);
          }}
        />

        <div className="flex-1 flex flex-col">
          <ChatMessages
            messages={activeMessages}
            statusUpdate={visibleStatusUpdate}
            isStreaming={isActiveConversationStreaming}
            streamingMessage={visibleStreamingMessage}
            isLoadingMessages={isLoadingMessages}
            isSourcesVisible={(messageId) =>
              !!visibleSourcesByConversation[activeConversationId]?.[messageId]
            }
            isSourcesLoading={(messageId) =>
              !!loadingSourcesByConversation[activeConversationId]?.[messageId]
            }
            getSourcesError={(messageId) =>
              sourcesErrorByConversation[activeConversationId]?.[
                messageId
              ] ?? null
            }
            onToggleSources={(message) => {
          void toggleSourcesVisibility(message);
        }}
        messagesEndRef={messagesEndRef}
        stickToBottomContextRef={stickToBottomContextRef}
        onStickToBottomEscapeChange={handleStickToBottomEscapeChange}
        onSelectSource={(source, sources) => {
          const sourceIndex = sources.findIndex(
            (item) => item.id === source.id
          );
              setSelectedSourceContext({
                sources,
                index: sourceIndex >= 0 ? sourceIndex : 0,
              });
            }}
            onFeedback={handleFeedback}
            onNegativeFeedbackClick={handleNegativeFeedbackClick}
            onGenerateQuestions={handleGenerateQuestions}
            onFollowUpSelect={handleFollowUpSelect}
            isGeneratingQuestions={questionMutation.isPending}
            activeQuestionMessageId={
              questionMutation.variables?.messageId ?? null
            }
          />

          <div className="border-t p-4 bg-background">
            <div className="max-w-3xl mx-auto">
              <ChatInput isStreaming={activeStream.isStreaming} onSend={handleSendMessage} />
            </div>
          </div>
        </div>
      </div>

      <SourceDialog
        open={!!selectedSourceContext}
        sources={selectedSourceContext?.sources ?? []}
        activeIndex={selectedSourceContext?.index ?? 0}
        onClose={() => setSelectedSourceContext(null)}
        onNavigate={(direction) =>
          setSelectedSourceContext((current) => {
            if (!current) {
              return current;
            }

            const nextIndex =
              direction === "next" ? current.index + 1 : current.index - 1;
            if (nextIndex < 0 || nextIndex >= current.sources.length) {
              return current;
            }

            return { ...current, index: nextIndex };
          })
        }
      />
      <FeedbackDialog
        pendingFeedback={pendingFeedback}
        options={NEGATIVE_FEEDBACK_OPTIONS}
        onClose={closeFeedbackDialog}
        onSelectReason={handleFeedbackReasonSelect}
        onExplanationChange={handleFeedbackExplanationChange}
        onSubmit={submitFeedbackReason}
      />
    </>
  );
}
