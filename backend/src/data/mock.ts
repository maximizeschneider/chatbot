export type Source = {
  id: string;
  name: string;
  text: string;
  relevantParts: string[];
};

export type StoredMessage = {
  id: string;
  role: "assistant" | "user" | "tool";
  content: string;
  sources?: Source[];
};

export type StoredConversation = {
  id: string;
  name: string;
};

export const HARDCODED_SOURCES: Source[] = [
  {
    id: "source-1",
    name: "Product Documentation",
    text: "# Heading 1\nFirst, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.Our platform offers comprehensive analytics and real-time monitoring capabilities. Users can track key metrics, set up custom alerts, and generate detailed reports. The analytics dashboard provides visualization tools including charts, graphs, and customizable widgets.",
    relevantParts: [
      "Our platform offers comprehensive analytics and real-time monitoring capabilities.",
      "Users can track key metrics, set up custom alerts, and generate detailed reports.",
      "The analytics dashboard provides visualization tools including charts, graphs, and customizable widgets.",
    ],
  },
  {
    id: "source-2",
    name: "Knowledge Base Article",
    text: "First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.",
    relevantParts: [
      "First, obtain your API key from the dashboard.",
      "Make authenticated requests using the bearer token format.",
      "All API endpoints require authentication via the Authorization header.",
    ],
  },
  {
    id: "source-3",
    name: "Best Practices Guide",
    text: "We recommend implementing caching strategies, batching requests when possible. Using webhooks for real-time updates rather than polling. Batching multiple operations into a single request improves efficiency.",
    relevantParts: [
      "We recommend implementing caching strategies, batching requests when possible.",
      "Using webhooks for real-time updates rather than polling.",
      "Batching multiple operations into a single request improves efficiency.",
    ],
  },
  {
    id: "source-4",
    name: "Best Practices Guide",
    text: "We recommend implementing caching strategies, batching requests when possible. Using webhooks for real-time updates rather than polling. Batching multiple operations into a single request improves efficiency.",
    relevantParts: [
      "We recommend implementing caching strategies, batching requests when possible.",
      "Using webhooks for real-time updates rather than polling.",
      "Batching multiple operations into a single request improves efficiency.",
    ],
  },
];

export const conversations: StoredConversation[] = [
  {
    id: "seed-1",
    name: "Welcome Conversation",
  },
  {
    id: "seed-2",
    name: "Getting Started",
  },
  {
    id: "seed-3",
    name: "Help & Support",
  },
  {
    id: "seed-4",
    name: "Quick Tips",
  },
];

export const messagesByConversation: Record<string, StoredMessage[]> = {
  "seed-1": [
    {
      id: "seed-1-msg-1",
      role: "assistant",
      content: "Hi there! I'm your AI assistant. How can I help you today?",
      sources: HARDCODED_SOURCES,
    },
    {
      id: "seed-1-msg-2",
      role: "user",
      content: "What can you help me with?",
    },
    {
      id: "seed-1-msg-3",
      role: "assistant",
      content:
        "I can help you with several things including:\n1. Code assistance\n2. Data analysis\n3. General questions\nWhat would you like to explore?",
    },
  ],
  "seed-2": [
    {
      id: "seed-2-msg-1",
      role: "assistant",
      content: "Welcome! I'm here to help you get started. What would you like to know first?",
    },
    {
      id: "seed-2-msg-2",
      role: "user",
      content: "Give me an overview of the available features",
    },
    {
      id: "seed-2-msg-3",
      role: "assistant",
      content:
        "Here's an overview of what I can help you with:\n\n• **Code Assistance**: I can help debug, write, and explain code\n• **Data Analysis**: Analyze datasets and provide insights\n• **General Questions**: Answer questions on a wide range of topics\n• **Problem Solving**: Help break down complex problems into manageable steps\n• **Documentation**: Help you understand and document your work\n\nWhich area interests you most?",
    },
  ],
  "seed-3": [
    {
      id: "seed-3-msg-1",
      role: "assistant",
      content: "Hello! How can I assist you today?",
    },
    {
      id: "seed-3-msg-2",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-3",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
      id: "seed-3-msg-4",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-5",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
      id: "seed-3-msg-6",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-7",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
      id: "seed-3-msg-8",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-9",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
      id: "seed-3-msg-10",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-11",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
      id: "seed-3-msg-12",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-13",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
    {
        id: "seed-3-msg-14",
      role: "user",
      content: "What's the best way to use this tool?",
    },
    {
      id: "seed-3-msg-15",
      role: "assistant",
      content:
        "Here are some tips for getting the most out of this tool:\n\n1. **Be Specific**: The more details you provide, the better I can help\n2. **Use Examples**: Share code snippets or examples when relevant\n3. **Ask Follow-ups**: Don't hesitate to ask for clarification or elaboration\n4. **Iterate**: You can refine your questions based on my responses\n5. **Use the Tools**: I can call tools to help solve your problems\n\nWhat specific task would you like help with?",
    },
  ],
  "seed-4": [
    {
      id: "seed-4-msg-1",
      role: "assistant",
      content: "Hi! I'm ready to help. What do you need?",
    },
    {
      id: "seed-4-msg-2",
      role: "user",
      content: "Explain how to get started",
    },
    {
      id: "seed-4-msg-3",
      role: "assistant",
      content:
        "Here's how to get started:\n\n**Getting Started Guide:**\n\n1. **Ask a Question**: Simply type what you need help with in the chat\n2. **Review Responses**: I'll provide detailed answers with explanations\n3. **Explore Features**: Try asking about different capabilities\n4. **Use Feedback**: Let me know if something is helpful or needs improvement\n5. **Follow-up**: Ask for more details on anything that interests you\n\nWould you like me to walk you through a specific feature or topic?",
    },
  ],
};

export const ensureConversationMessages = (conversationId: string) => {
  if (!messagesByConversation[conversationId]) {
    messagesByConversation[conversationId] = [];
  }
};

export const getConversationMessages = (conversationId: string) => {
  ensureConversationMessages(conversationId);
  return messagesByConversation[conversationId];
};

export const findMessageById = (messageId: string) => {
  for (const messages of Object.values(messagesByConversation)) {
    const match = messages.find((candidate) => candidate.id === messageId);
    if (match) {
      return match;
    }
  }
  return undefined;
};
