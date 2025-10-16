type ToolResultContent = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: {
    type: "text";
    value: string;
  };
};

export type StoredConversation = {
  id: string;
  title: string;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: "assistant" | "user" | "tool";
  content: string | ToolResultContent[];
};

export const conversations: StoredConversation[] = [
  {
    id: "seed-1",
    title: "Welcome Conversation",
  },
];

export const messages: StoredMessage[] = [
  {
    id: "seed-1-message-1",
    conversationId: "seed-1",
    role: "assistant",
    content: "Hi there! I'm your AI assistant. How can I help you today?",
  },
  {
    id: "seed-1-message-2",
    conversationId: "seed-1",
    role: "user",
    content: "What can you help me with?",
  },
  {
    id: "seed-1-message-3",
    conversationId: "seed-1",
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "get-capabilities-1",
        toolName: "get_capabilities",
        output: {
          type: "text",
          value:
            "Available capabilities: code assistance, data analysis, general questions",
        },
      },
    ],
  },
  {
    id: "seed-1-message-4",
    conversationId: "seed-1",
    role: "assistant",
    content:
      "I can help you with several things including:\n1. Code assistance\n2. Data analysis\n3. General questions\nWhat would you like to explore?",
  },
];
