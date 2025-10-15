import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { SourceDialog } from '@/components/chat/source-dialog';
import { FeedbackDialog } from '@/components/chat/feedback-dialog';
import { Toaster } from '@/components/ui/sonner';
import { useChatMutation } from '@/api/chat';
import type { ChatRequest } from '@/api/chat';
import { useFeedbackMutation } from '@/api/feedback';
import { useQuestionGenerationMutation } from '@/api/questions';
import { fetchMessageSources } from '@/api/message';
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
} from '@/api/conversation';
import { useConfigQuery, type ConfigOption } from '@/api/config';
import { useUserProfileQuery, type UserProfile } from '@/api/user-profile';
import type {
  ChatMessage,
  ConversationData,
  PendingFeedback,
  Source,
} from '@/types/chat';
import type { StickToBottomContext } from 'use-stick-to-bottom';

const INITIAL_CONVERSATION: ConversationData = {
  id: 'local-seed',
  title: 'New Conversation',
  messages: [],
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
  message: '',
  statusUpdate: '',
  error: null,
};

const NEGATIVE_FEEDBACK_OPTIONS = [
  { value: 'incorrect', label: 'Incorrect or misleading information' },
  { value: 'missing', label: 'Missing important details' },
  { value: 'not-helpful', label: 'Not relevant or helpful' },
  { value: 'tone', label: 'Tone or style issue' },
  { value: 'other', label: 'Other' },
] as const;

type NegativeFeedbackValue =
  (typeof NEGATIVE_FEEDBACK_OPTIONS)[number]['value'];

const OTHER_FEEDBACK_VALUE: NegativeFeedbackValue = 'other';

const normalizeSources = (sources?: Source[] | null): Source[] | undefined => {
  if (!Array.isArray(sources)) {
    return undefined;
  }

  return sources.map((source) => ({
    ...source,
    text: source.text ?? 'No excerpt available.',
    relevantParts: source.relevantParts ?? [],
  }));
};

const parseFeedbackReason = (
  reason?: string | null
): { selectedReason: NegativeFeedbackValue | null; customExplanation: string } => {
  if (!reason || !reason.trim()) {
    return {
      selectedReason: null,
      customExplanation: '',
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
        .replace(/^other\s*[:\-]?\s*/i, '')
        .trim();
      return {
        selectedReason: OTHER_FEEDBACK_VALUE,
        customExplanation: explanation,
      };
    }

    return {
      selectedReason: matchedOption.value,
      customExplanation: '',
    };
  }

  if (/^other\b/i.test(normalized)) {
    const explanation = normalized.replace(/^other\s*[:\-]?\s*/i, '').trim();
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
  typeof value === 'string' &&
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
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
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
  const visibleSourcesRef = useRef(visibleSourcesByConversation);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    visibleSourcesRef.current = visibleSourcesByConversation;
  }, [visibleSourcesByConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

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
  }, [activeConversationId]);

  const { data: configData, isError: isConfigError, error: configError } = useConfigQuery();
  const { data: userProfileData, isError: isProfileError, error: profileError } = useUserProfileQuery();
  const { data: remoteConversations, isError: isConversationsError, error: conversationsError } = useConversationsQuery();

  // Show toast notifications for query errors
  useEffect(() => {
    if (isConfigError) {
      toast.error('Failed to load configs', {
        description: configError instanceof Error ? configError.message : 'Could not fetch configuration options',
      });
    }
  }, [isConfigError, configError]);

  useEffect(() => {
    if (isProfileError) {
      toast.error('Failed to load user profiles', {
        description: profileError instanceof Error ? profileError.message : 'Could not fetch user profile options',
      });
    }
  }, [isProfileError, profileError]);

  useEffect(() => {
    if (isConversationsError) {
      toast.error('Failed to load conversations', {
        description: conversationsError instanceof Error ? conversationsError.message : 'Could not fetch your conversation history',
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

  // Process user profiles: merge "max.1sch" as first option
  const userProfileOptions: UserProfile | {name: string}[] = userProfileData
    ? [{ name: 'max.1sch' }, ...userProfileData]
    : [];

  useEffect(() => {
    if (
      selectedConfig &&
      configOptions.length > 0 &&
      !configOptions.some((c) => c.name === selectedConfig)
    ) {
      setSelectedConfig(configOptions[0]?.name ?? null);
    } else if (!selectedConfig && configOptions.length > 0) {
      setSelectedConfig(configOptions[0]?.name ?? null);
    }
  }, [configOptions, selectedConfig]);

  useEffect(() => {
    if (
      selectedProfile &&
      userProfileOptions.length > 0 &&
      !userProfileOptions.some((p) => p.name === selectedProfile)
    ) {
      setSelectedProfile(userProfileOptions[0]?.name ?? null);
    } else if (!selectedProfile && userProfileOptions.length > 0) {
      setSelectedProfile(userProfileOptions[0]?.name ?? null);
    }
  }, [userProfileOptions, selectedProfile]);

  useEffect(() => {
    if (hasInitializedConversations) return;
    if (remoteConversations) {
      if (remoteConversations.length > 0) {
        setConversations(remoteConversations);
        setActiveConversationId(remoteConversations[0].id);
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
          statusUpdate: '',
        };
      });
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  const feedbackMutation = useFeedbackMutation();
  const questionMutation = useQuestionGenerationMutation();
  const createConversationMutation = useCreateConversationMutation();
  const deleteConversationMutation = useDeleteConversationMutation();

  const activeConversation = conversations.find(
    (conv) => conv.id === activeConversationId
  );
  const loadSourcesForMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const conversation = conversationsRef.current.find(
        (conv) => conv.id === conversationId
      );
      const message = conversation?.messages.find((msg) => msg.id === messageId);

      if (!conversation || !message || message.role !== 'assistant') {
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

      try {
        const fetchedSources = await fetchMessageSources({
          conversationId,
          messageId,
        });
        const normalized = normalizeSources(fetchedSources) ?? [];
        if (!visibleSourcesRef.current[conversationId]?.[messageId]) {
          return;
        }
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, sources: normalized } : msg
                  ),
                }
              : conv
          )
        );
      } catch (error) {
        if (!visibleSourcesRef.current[conversationId]?.[messageId]) {
          return;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unable to load sources for this response.';
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

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isActiveConversationStreaming]);

  const visibleStreamingMessage =
    activeStream.conversationId === activeConversationId
      ? activeStream.message
      : '';
  const visibleStatusUpdate =
    activeStream.conversationId === activeConversationId
      ? activeStream.statusUpdate
      : '';
  const visibleError =
    activeStream.conversationId === activeConversationId
      ? activeStream.error
      : null;

  useEffect(() => {
    scrollToBottom();
  }, [
    activeConversation?.messages,
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
    try {
      const created = await createConversationMutation.mutateAsync({
        title: 'New Conversation',
      });
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
    } catch (error) {
      console.error(
        'Failed to create conversation via API, falling back to local creation.',
        error
      );
      const newId = Date.now().toString();
      const newConv: ConversationData = {
        id: newId,
        title: 'New Conversation',
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }
  };

  const updateConversationTitle = (convId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === convId && conv.messages.length <= 1
          ? { ...conv, title }
          : conv
      )
    );
  };

  const deleteConversation = async (conversationId: string) => {
    setConversations((prev) => {
      const updatedConversations = prev.filter(
        (conv) => conv.id !== conversationId
      );

      if (updatedConversations.length === 0) {
        const newConversation: ConversationData = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [],
        };
        setActiveConversationId(newConversation.id);
        return [newConversation];
      }

      if (conversationId === activeConversationId) {
        setActiveConversationId(updatedConversations[0].id);
      }

      return updatedConversations;
    });

    try {
      await deleteConversationMutation.mutateAsync({ conversationId });
    } catch (error) {
      console.error('Failed to delete conversation via API:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || activeStream.isStreaming) return;

    const conversationId = activeConversationId;
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
      message: '',
      statusUpdate: '',
      error: null,
    });
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, userMessage] }
          : conv
      )
    );

    if ((activeConversation?.messages.length ?? 0) === 0) {
      updateConversationTitle(conversationId, text);
    }

    try {
      const chatRequest: ChatRequest = {
        prompt: text,
        conversationId,
      };
      if (selectedConfig) {
        chatRequest.config = selectedConfig;
      }
      if (selectedProfile) {
        chatRequest.profile = selectedProfile;
      }

      const finalPayload = await chatMutation.mutateAsync(chatRequest);

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: finalPayload.message,
        feedback: null,
      };
      const normalizedSources = normalizeSources(finalPayload.sources);
      if (normalizedSources !== undefined) {
        assistantMessage.sources = normalizedSources;
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, assistantMessage] }
            : conv
        )
      );

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
      console.error('Error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong while sending your message.';
      
      // Show toast notification for chat error
      toast.error('Chat error', {
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
            statusUpdate: '',
            message: '',
          };
        }

        return {
          conversationId: null,
          isStreaming: false,
          message: '',
          statusUpdate: '',
          error: null,
        };
      });
    }
  };

  const handleFeedback = (
    messageId: string,
    feedback: 'up' | 'down' | null,
    reason?: string
  ) => {
    const trimmedReason = reason?.trim();

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      feedback,
                      feedbackReason:
                        feedback === 'down'
                          ? trimmedReason || undefined
                          : undefined,
                    }
                  : msg
              ),
            }
          : conv
      )
    );

    if (activeConversationId) {
      feedbackMutation.mutate({
        conversationId: activeConversationId,
        messageId,
        feedback,
        reason: trimmedReason,
      });
    }
  };

  const handleNegativeFeedbackClick = (message: ChatMessage) => {
    if (message.feedback === 'down') {
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

    handleFeedback(pendingFeedback.messageId, 'down', reason);
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
              value === OTHER_FEEDBACK_VALUE ? current.customExplanation : '',
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
    if (message.role !== 'assistant' || questionMutation.isPending) {
      return;
    }

    try {
      const result = await questionMutation.mutateAsync({
        messageId: message.id,
        conversationId: activeConversationId,
        text: message.content,
      });

      if (result.questions?.length) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === message.id
                      ? { ...msg, suggestedQuestions: result.questions }
                      : msg
                  ),
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
    }
  };

  const handleFollowUpSelect = (messageId: string, question: string) => {
    const text = question.trim();
    if (!text) {
      return;
    }

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversationId) {
          return conv;
        }

        return {
          ...conv,
          messages: conv.messages.map((msg) => {
            if (msg.id !== messageId) {
              return msg;
            }

            const { suggestedQuestions: _removed, ...messageWithoutSuggestions } =
              msg;
            return messageWithoutSuggestions;
          }),
        };
      })
    );

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

  const handleDismissError = () => {
    setActiveStream((current) => {
      if (current.conversationId !== activeConversationId) {
        return current;
      }

      return {
        conversationId: null,
        isStreaming: false,
        message: '',
        statusUpdate: '',
        error: null,
      };
    });
  };

  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-background">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          configOptions={configOptions}
          selectedConfig={selectedConfig}
          userProfileOptions={userProfileOptions}
          selectedProfile={selectedProfile}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onCreateConversation={() => {
            void createNewConversation();
          }}
          onSelectConversation={setActiveConversationId}
          onSelectConfig={setSelectedConfig}
          onSelectProfile={setSelectedProfile}
          onDeleteConversation={(conversationId) => {
            void deleteConversation(conversationId);
          }}
        />

        <div className="flex-1 flex flex-col">
          <ChatMessages
            messages={activeConversation?.messages ?? []}
            statusUpdate={visibleStatusUpdate}
            isStreaming={isActiveConversationStreaming}
            streamingMessage={visibleStreamingMessage}
            error={visibleError}
            onDismissError={handleDismissError}
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
              direction === 'next' ? current.index + 1 : current.index - 1;
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
