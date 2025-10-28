import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { fetchMessageSources } from "@/api/message";
import { fetchConversationMessages } from "@/api/messages";
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
} from "@/api/conversation";
import { useConfigQuery, type ConfigOption } from "@/api/config";
import { useUserProfileQuery, type UserProfile } from "@/api/user-profile";
import type {
  ChatMessage,
  ConversationData,
  ConversationMessage,
  PendingFeedback,
  Source,
} from "@/types/chat";
import type { StickToBottomContext } from "use-stick-to-bottom";

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
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
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
  const [loadingMessagesByConversation, setLoadingMessagesByConversation] =
    useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const visibleSourcesRef = useRef(visibleSourcesByConversation);
  const messagesByConversationRef = useRef(messagesByConversation);
  const autoScrollOnMessagesChangeRef = useRef(false);

  visibleSourcesRef.current = visibleSourcesByConversation;
  messagesByConversationRef.current = messagesByConversation;

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

  const resolvedConfigName =
    selectedConfigName &&
    configOptions.some((candidate) => candidate.name === selectedConfigName)
      ? selectedConfigName
      : configOptions[0]?.name ?? null;

  const resolvedProfile =
    selectedProfile &&
    userProfileOptions.some((candidate) => candidate.name === selectedProfile.name)
      ? selectedProfile
      : userProfileOptions[0] ?? null;

  const ensureMessagesLoaded = useCallback(
    async (conversationId: string) => {
      if (!conversationId) {
        return;
      }

      if (conversationId in messagesByConversationRef.current) {
        return;
      }

      try {
        setLoadingMessagesByConversation((current) => ({
          ...current,
          [conversationId]: true,
        }));
        const apiMessages = await fetchConversationMessages(conversationId);
        const normalized: ChatMessage[] = apiMessages.map(
          (message: ConversationMessage) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            feedback: null,
          })
        );

        autoScrollOnMessagesChangeRef.current = true;
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: normalized,
        }));
      } catch (error) {
        console.error("Failed to load messages for conversation", error);
        autoScrollOnMessagesChangeRef.current = true;
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: current[conversationId] ?? [],
        }));
      } finally {
        setLoadingMessagesByConversation((current) => {
          const next = { ...current };
          delete next[conversationId];
          return next;
        });
      }
    },
    [setMessagesByConversation]
  );

  const getQuestionsCacheKey = useCallback(
    (conversationId: string, messageId: string) =>
      ["message-questions", conversationId, messageId] as const,
    []
  );

  const applySuggestedQuestionsToMessage = useCallback(
    (
      conversationId: string,
      messageId: string,
      questions: string[] | null | undefined,
      shouldAutoScroll: boolean
    ) => {
      if (shouldAutoScroll) {
        autoScrollOnMessagesChangeRef.current = true;
      }
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).map((msg) => {
          if (msg.id !== messageId) {
            return msg;
          }

          if (!questions || questions.length === 0) {
            const { suggestedQuestions: _removed, ...messageWithoutSuggestions } = msg;
            return messageWithoutSuggestions;
          }

          return { ...msg, suggestedQuestions: questions };
        }),
      }));
    },
    [setMessagesByConversation]
  );

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void ensureMessagesLoaded(activeConversationId);

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
  }, [activeConversationId, ensureMessagesLoaded]);

  useEffect(() => {
    if (hasInitializedConversations || !remoteConversations) {
      return;
    }

    if (remoteConversations.length > 0) {
      setConversations(remoteConversations);
      const firstConversationId = remoteConversations[0].id;
      setActiveConversationId(firstConversationId);
      setHasInitializedConversations(true);
      void ensureMessagesLoaded(firstConversationId);
    } else {
      // No conversations available; do not auto-create a placeholder
      setHasInitializedConversations(true);
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [remoteConversations, hasInitializedConversations, ensureMessagesLoaded]);

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
  const deleteConversationMutation = useDeleteConversationMutation();

  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] ?? []
    : [];
  const loadSourcesForMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const messages = messagesByConversationRef.current[conversationId];
      const message = messages?.find((msg) => msg.id === messageId);

      if (!message || message.role !== "assistant") {
        return;
      }

      if (message.sources !== undefined) {
        setLoadingSourcesByConversation((current) => {
          const conversationLoading = current[conversationId];
          if (!conversationLoading || conversationLoading[messageId] === undefined) {
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

        const fetchedSources = await fetchMessageSources(messageId);
        const normalized = normalizeSources(fetchedSources) ?? [];
        if (!visibleSourcesRef.current[conversationId]?.[messageId]) {
          return;
        }
        const latestMessages = messagesByConversationRef.current[conversationId] ?? [];
        const lastMessageId =
          latestMessages.length > 0 ? latestMessages[latestMessages.length - 1]?.id ?? null : null;
        if (lastMessageId === messageId) {
          autoScrollOnMessagesChangeRef.current = true;
        }
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((msg) =>
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
    [
      setLoadingSourcesByConversation,
      setSourcesErrorByConversation,
      setMessagesByConversation,
    ]
  );

  const isActiveConversationStreaming =
    activeStream.isStreaming &&
    activeStream.conversationId === activeConversationId;

  const wasStreamingPreviously = wasStreamingRef.current;
  if (wasStreamingPreviously !== isActiveConversationStreaming) {
    hasUserScrolledDuringStreamRef.current = false;
    wasStreamingRef.current = isActiveConversationStreaming;
  }

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

  useEffect(() => {
    const shouldScrollFromMessages = autoScrollOnMessagesChangeRef.current;
    const shouldScrollFromStream =
      isActiveConversationStreaming ||
      visibleStreamingMessage.length > 0 ||
      visibleStatusUpdate.length > 0 ||
      visibleError !== null;

    if (shouldScrollFromStream || shouldScrollFromMessages) {
      scrollToBottom();
    }

    autoScrollOnMessagesChangeRef.current = false;
  }, [
    activeMessages,
    visibleStreamingMessage,
    visibleStatusUpdate,
    visibleError,
    scrollToBottom,
    isActiveConversationStreaming,
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
      name: "New Conversation",
    };
    
    setConversations((prev) => [tempConv, ...prev]);
    setActiveConversationId(tempId);
    setMessagesByConversation((current) => ({
      ...current,
      [tempId]: [],
    }));

    try {
      const created = await createConversationMutation.mutateAsync({
        name: "New Conversation",
      });
      
      // Replace temporary conversation with the real one
      setConversations((prev) =>
        prev.map((conv) => (conv.id === tempId ? created : conv))
      );
      setMessagesByConversation((current) => {
        const { [tempId]: tempMessages = [] } = current;
        const next = { ...current };
        delete next[tempId];
        next[created.id] = tempMessages;
        return next;
      });
      // Only switch focus if the temp conversation is still active
      setActiveConversationId((currentActive) =>
        currentActive === tempId ? created.id : currentActive
      );
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
      setMessagesByConversation((current) => {
        const { [tempId]: tempMessages = [] } = current;
        const next = { ...current };
        delete next[tempId];
        next[localId] = tempMessages;
        return next;
      });
      // Only switch focus if the temp conversation is still active
      setActiveConversationId((currentActive) =>
        currentActive === tempId ? localId : currentActive
      );
    }
  };

  const updateConversationName = (convId: string, firstMessage: string) => {
    const name = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === convId && conv.name === "New Conversation"
          ? { ...conv, name }
          : conv
      )
    );
  };

  const deleteConversation = async (conversationId: string) => {
    // Store the conversation and current state for potential rollback
    const conversationToDelete = conversations.find((conv) => conv.id === conversationId);
    if (!conversationToDelete) return;

    const previousActiveId = activeConversationId;
    const previousConversations = conversations;
    const previousMessages = messagesByConversation;

    // Optimistic update: remove immediately from UI
    const updatedConversations = conversations.filter(
      (conv) => conv.id !== conversationId
    );

    if (updatedConversations.length === 0) {
      setConversations([]);
      setActiveConversationId(null);
    } else {
      setConversations(updatedConversations);
      if (conversationId === activeConversationId) {
        setActiveConversationId(updatedConversations[0]?.id ?? null);
      }
    }

    setMessagesByConversation((current) => {
      const next = { ...current };
      delete next[conversationId];
      return next;
    });

    try {
      await deleteConversationMutation.mutateAsync({ conversationId });
    } catch (error) {
      console.error("Failed to delete conversation via API:", error);
      toast.error("Failed to delete conversation", {
        description: error instanceof Error ? error.message : "Could not delete the conversation. It has been restored.",
      });
      
      // Rollback: restore the conversation
      setConversations(previousConversations);
      setMessagesByConversation(previousMessages);
      setActiveConversationId(previousActiveId);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || activeStream.isStreaming) return;
    if (!activeConversationId) return;

    let conversationId = activeConversationId;
    
    // If this is a temp conversation (starts with "temp-"), create a real one
    if (conversationId.startsWith("temp-")) {
      try {
        const tempConversationId = conversationId;
        const created = await createConversationMutation.mutateAsync({
          name: "New Conversation",
        });
        
        // Replace the temp conversation with the real one
        setConversations((prev) =>
          prev.map((conv) => (conv.id === tempConversationId ? created : conv))
        );
        setMessagesByConversation((current) => {
          const { [tempConversationId]: tempMessages = [] } = current;
          const next = { ...current };
          delete next[tempConversationId];
          next[created.id] = tempMessages;
          return next;
        });
        conversationId = created.id;
        // Only switch focus if the temp conversation is still active
        setActiveConversationId((currentActive) =>
          currentActive === tempConversationId ? created.id : currentActive
        );
      } catch (error) {
        console.error("Failed to create conversation:", error);
        toast.error("Failed to create conversation", {
          description: error instanceof Error ? error.message : "Could not create a new conversation",
        });
        return;
      }
    }
    
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
      role: "user",
      content: text,
    };

    const wasEmpty = (messagesByConversationRef.current[conversationId]?.length ?? 0) === 0;

    autoScrollOnMessagesChangeRef.current = true;
    setMessagesByConversation((current) => {
      const existing = current[conversationId] ?? [];
      const clearedExisting = existing.map((msg) => {
        if (!msg.suggestedQuestions || msg.suggestedQuestions.length === 0) {
          return msg;
        }
        const { suggestedQuestions: _removed, ...messageWithoutSuggestions } = msg;
        return messageWithoutSuggestions;
      });
      return {
        ...current,
        [conversationId]: [...clearedExisting, userMessage],
      };
    });

    if (wasEmpty) {
      updateConversationName(conversationId, text);
    }

    try {
      const chatRequest: ChatRequest = {
        prompt: text,
        conversationId,
      };
      if (resolvedConfigName) {
        chatRequest.configName = resolvedConfigName;
      }
      if (resolvedProfile) {
        if (resolvedProfile._id === "upn") {
          chatRequest.upn = resolvedProfile.name;
        } else {
          chatRequest.profile = resolvedProfile;
        }
      }

      const finalPayload = await chatMutation.mutateAsync(chatRequest);

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: finalPayload.message,
        feedback: null,
      };
      const normalizedSources = normalizeSources(finalPayload.sources);
      if (normalizedSources !== undefined) {
        assistantMessage.sources = normalizedSources;
      }

      autoScrollOnMessagesChangeRef.current = true;
      setMessagesByConversation((current) => {
        const existing = current[conversationId] ?? [];
        return {
          ...current,
          [conversationId]: [...existing, assistantMessage],
        };
      });

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
    const trimmedReason = reason?.trim();

    if (!activeConversationId) {
      return;
    }

    setMessagesByConversation((current) => ({
      ...current,
      [activeConversationId]: (current[activeConversationId] ?? []).map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              feedback,
              feedbackReason:
                feedback === "down" ? trimmedReason || undefined : undefined,
            }
          : msg
      ),
    }));

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
    if (message.role !== "assistant" || questionMutation.isPending || !activeConversationId) {
      return;
    }

    const conversationMessages = messagesByConversationRef.current[activeConversationId] ?? [];
    const lastMessageId =
      conversationMessages.length > 0
        ? conversationMessages[conversationMessages.length - 1]?.id ?? null
        : null;
    const isLastMessage = lastMessageId === message.id;

    const cacheKey = getQuestionsCacheKey(activeConversationId, message.id);
    const cachedQuestions = queryClient.getQueryData<string[]>(cacheKey);
    if (cachedQuestions?.length) {
      applySuggestedQuestionsToMessage(
        activeConversationId,
        message.id,
        cachedQuestions,
        isLastMessage
      );
      return;
    }

    try {
      const result = await questionMutation.mutateAsync({
        messageId: message.id,
        conversationId: activeConversationId,
        text: message.content,
      });

      if (result.questions?.length) {
        queryClient.setQueryData(cacheKey, result.questions);
        applySuggestedQuestionsToMessage(
          activeConversationId,
          message.id,
          result.questions,
          isLastMessage
        );
      } else {
        queryClient.setQueryData(cacheKey, []);
        applySuggestedQuestionsToMessage(
          activeConversationId,
          message.id,
          undefined,
          isLastMessage
        );
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

    if (activeConversationId) {
      const conversationMessages = messagesByConversationRef.current[activeConversationId] ?? [];
      const lastMessageId =
        conversationMessages.length > 0
          ? conversationMessages[conversationMessages.length - 1]?.id ?? null
          : null;
      const isLastMessage = lastMessageId === messageId;
      autoScrollOnMessagesChangeRef.current = isLastMessage;

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversationId]: (current[activeConversationId] ?? []).map((msg) => {
          if (msg.id !== messageId) {
            return msg;
          }
          const { suggestedQuestions: _removed, ...messageWithoutSuggestions } = msg;
          return messageWithoutSuggestions;
        }),
      }));
    }

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
          selectedConfigName={resolvedConfigName}
          userProfileOptions={userProfileOptions}
          selectedProfile={resolvedProfile}
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
            isMessagesLoading={
              activeConversationId
                ? !!loadingMessagesByConversation[activeConversationId]
                : false
            }
            messagesEndRef={messagesEndRef}
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
            isSourcesVisible={(messageId) =>
              activeConversationId
                ? !!visibleSourcesByConversation[activeConversationId]?.[messageId]
                : false
            }
            isSourcesLoading={(messageId) =>
              activeConversationId
                ? !!loadingSourcesByConversation[activeConversationId]?.[messageId]
                : false
            }
            getSourcesError={(messageId) =>
              activeConversationId
                ? sourcesErrorByConversation[activeConversationId]?.[
                    messageId
                  ] ?? null
                : null
            }
            onToggleSources={(message) => {
              void toggleSourcesVisibility(message);
            }}
            stickToBottomContextRef={stickToBottomContextRef}
            onStickToBottomEscapeChange={handleStickToBottomEscapeChange}
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
