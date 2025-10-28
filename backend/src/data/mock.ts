import { randomUUID } from "crypto";

export type Source = {
  id: string;
  name: string;
  text: string;
  relevantParts: string[];
};

export type MessageFeedback = {
  feedbackType: 1 | 0;
  reason: string | null;
  text: string | null;
  acknowledged: boolean;
};

export type MessageData =
  | {
      type: "references";
      sources: Source[];
    }
  | {
      type: "image";
      url: string;
      description?: string;
    };

export type ImageSelection = {
  key: string;
  src: string;
  filepath: string;
  type: string;
};

export type Message = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  conversationId: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  data?: MessageData;
  feedback?: MessageFeedback;
  imageSelection?: ImageSelection[];
};

export type Conversation = {
  _id: string;
  title: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type Tenant = {
  id: string;
  name: string;
  logoUrl?: string;
};

export type Configuration = {
  name: string;
  templateId: string;
  publishedToMain: boolean;
  blocks: Array<{
    id: string;
    title: string;
  }>;
};

export type TestProfile = {
  _id: string;
  userId: string;
  description: string;
  data: Record<string, unknown>;
};

export type TechnicalUserPermissions = {
  canChat: boolean;
  canDeleteConversation: boolean;
  canProvideFeedback: boolean;
};

export type ActiveUser = {
  id: string;
  displayName: string;
  email: string;
};

export const HARDCODED_SOURCES: Source[] = [
  {
    id: "source-1",
    name: "Product Documentation",
    text: [
      "First, obtain your API key from the dashboard.",
      "Then, make authenticated requests using the bearer token format.",
      "All API endpoints require authentication via the Authorization header.",
      "Our platform offers comprehensive analytics and real-time monitoring capabilities.",
    ].join(" "),
    relevantParts: [
      "Our platform offers comprehensive analytics and real-time monitoring capabilities.",
      "Users can track key metrics, set up custom alerts, and generate detailed reports.",
    ],
  },
  {
    id: "source-2",
    name: "Knowledge Base Article",
    text: "Make authenticated requests using the bearer token format. All API endpoints require authentication.",
    relevantParts: [
      "Make authenticated requests using the bearer token format.",
      "All API endpoints require authentication.",
    ],
  },
  {
    id: "source-3",
    name: "Best Practices Guide",
    text: "We recommend implementing caching strategies and batching requests when possible.",
    relevantParts: [
      "Implement caching strategies.",
      "Batch requests when possible.",
    ],
  },
];

export const TENANTS: Tenant[] = [
  { id: "tenant-1", name: "Acme Industries" },
  { id: "tenant-2", name: "Globex Corporation" },
];

export const ACTIVE_USER: ActiveUser = {
  id: "user-123",
  displayName: "Max Schneider",
  email: "max.schneider@example.com",
};

export const TECHNICAL_USER_PERMISSIONS: Record<
  string,
  TechnicalUserPermissions
> = {
  "tenant-1": {
    canChat: true,
    canDeleteConversation: true,
    canProvideFeedback: true,
  },
  "tenant-2": {
    canChat: true,
    canDeleteConversation: false,
    canProvideFeedback: true,
  },
};

export const CONFIGURATIONS_BY_TENANT: Record<string, Configuration[]> = {
  "tenant-1": [
    {
      name: "default",
      templateId: "tmpl-default",
      publishedToMain: true,
      blocks: [
        { id: "intro", title: "Introduction" },
        { id: "summary", title: "Summary" },
      ],
    },
    {
      name: "finance-specialist",
      templateId: "tmpl-finance",
      publishedToMain: false,
      blocks: [
        { id: "analysis", title: "Financial Analysis" },
        { id: "risk", title: "Risk Summary" },
      ],
    },
  ],
  "tenant-2": [
    {
      name: "default",
      templateId: "tmpl-default-2",
      publishedToMain: true,
      blocks: [{ id: "overview", title: "Overview" }],
    },
  ],
};

export const TEST_PROFILES_BY_TENANT: Record<string, TestProfile[]> = {
  "tenant-1": [
    {
      _id: "profile-1",
      userId: "test-user-1",
      description: "Sales manager scenario",
      data: { region: "EMEA" },
    },
    {
      _id: "profile-2",
      userId: "test-user-2",
      description: "Support specialist scenario",
      data: { language: "en-US" },
    },
  ],
  "tenant-2": [
    {
      _id: "profile-3",
      userId: "test-user-3",
      description: "Marketing analyst scenario",
      data: { region: "APAC" },
    },
  ],
};

const seededConversations: Conversation[] = [
  {
    _id: "conv-1",
    title: "Quarterly planning",
    tenantId: "tenant-1",
    userId: "user-123",
    createdAt: "2024-01-10T12:00:00.000Z",
    updatedAt: "2024-01-10T12:45:00.000Z",
  },
  {
    _id: "conv-2",
    title: "Incident response",
    tenantId: "tenant-1",
    userId: "user-123",
    createdAt: "2024-02-02T09:13:00.000Z",
    updatedAt: "2024-02-02T10:01:00.000Z",
  },
  {
    _id: "conv-3",
    title: "Data retention policy",
    tenantId: "tenant-2",
    userId: "user-123",
    createdAt: "2024-03-14T15:25:00.000Z",
    updatedAt: "2024-03-14T15:55:00.000Z",
  },
];

const seededMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      _id: "conv-1-msg-1",
      role: "user",
      content: "Can you summarise the Q1 OKRs?",
      conversationId: "conv-1",
      tenantId: "tenant-1",
      userId: "user-123",
      createdAt: "2024-01-10T12:00:00.000Z",
    },
    {
      _id: "conv-1-msg-2",
      role: "assistant",
      content:
        "Sure! The primary objectives for Q1 focus on driving expansion revenue, improving churn, and launching the analytics revamp.",
      conversationId: "conv-1",
      tenantId: "tenant-1",
      userId: "user-123",
      createdAt: "2024-01-10T12:01:15.000Z",
      data: {
        type: "references",
        sources: HARDCODED_SOURCES,
      },
      feedback: {
        feedbackType: 1,
        reason: null,
        text: null,
        acknowledged: true,
      },
    },
  ],
  "conv-2": [
    {
      _id: "conv-2-msg-1",
      role: "assistant",
      content:
        "Hello! I'm here to help with incident response planning. What scenario are you working through?",
      conversationId: "conv-2",
      tenantId: "tenant-1",
      userId: "user-123",
      createdAt: "2024-02-02T09:13:00.000Z",
    },
  ],
  "conv-3": [
    {
      _id: "conv-3-msg-1",
      role: "user",
      content: "What is our retention policy for analytics data?",
      conversationId: "conv-3",
      tenantId: "tenant-2",
      userId: "user-123",
      createdAt: "2024-03-14T15:25:00.000Z",
    },
  ],
};

const conversations = [...seededConversations];
export const messagesByConversationId: Record<string, Message[]> = {
  ...seededMessages,
};

export const listConversations = (tenantId: string, userId: string) =>
  conversations
    .filter(
      (conversation) =>
        conversation.tenantId === tenantId && conversation.userId === userId,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

export const findConversation = (
  tenantId: string,
  userId: string,
  conversationId: string,
) =>
  conversations.find(
    (conversation) =>
      conversation._id === conversationId &&
      conversation.tenantId === tenantId &&
      conversation.userId === userId,
  );

export const createConversation = (
  tenantId: string,
  userId: string,
  title?: string,
) => {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    _id: `conv-${randomUUID()}`,
    title: title?.trim() ? title.trim() : "New conversation",
    tenantId,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  conversations.unshift(conversation);
  messagesByConversationId[conversation._id] = [];

  return conversation;
};

export const updateConversationTitle = (
  tenantId: string,
  userId: string,
  conversationId: string,
  title: string,
) => {
  const conversation = findConversation(tenantId, userId, conversationId);
  if (!conversation) {
    return undefined;
  }

  const trimmed = title.trim();
  conversation.title = trimmed.length > 0 ? trimmed : conversation.title;
  conversation.updatedAt = new Date().toISOString();
  return conversation;
};

export const deleteConversation = (
  tenantId: string,
  userId: string,
  conversationId: string,
) => {
  const index = conversations.findIndex(
    (conversation) =>
      conversation._id === conversationId &&
      conversation.tenantId === tenantId &&
      conversation.userId === userId,
  );

  if (index === -1) {
    return false;
  }

  conversations.splice(index, 1);
  delete messagesByConversationId[conversationId];
  return true;
};

export const listMessages = (
  tenantId: string,
  userId: string,
  conversationId: string,
) => {
  const conversation = findConversation(tenantId, userId, conversationId);
  if (!conversation) {
    return undefined;
  }

  return [...(messagesByConversationId[conversationId] ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

export const findMessage = (
  tenantId: string,
  userId: string,
  conversationId: string,
  messageId: string,
) => {
  const messages = listMessages(tenantId, userId, conversationId);
  if (!messages) {
    return undefined;
  }

  return messages.find((message) => message._id === messageId);
};

export const appendMessage = (message: Message) => {
  const list = messagesByConversationId[message.conversationId] ?? [];
  list.push(message);
  messagesByConversationId[message.conversationId] = list;

  const conversation = conversations.find(
    (candidate) => candidate._id === message.conversationId,
  );
  if (conversation) {
    conversation.updatedAt = new Date().toISOString();
  }
};

export const upsertFeedback = (
  tenantId: string,
  userId: string,
  conversationId: string,
  messageId: string,
  payload: MessageFeedback | null,
) => {
  const messages = listMessages(tenantId, userId, conversationId);
  if (!messages) {
    return undefined;
  }

  const match = messages.find((message) => message._id === messageId);
  if (!match) {
    return undefined;
  }

  if (!payload) {
    delete match.feedback;
    return match;
  }

  match.feedback = {
    ...payload,
    reason: payload.reason ?? null,
    text: payload.text ?? null,
    acknowledged:
      typeof payload.acknowledged === "boolean" ? payload.acknowledged : false,
  };

  return match;
};

