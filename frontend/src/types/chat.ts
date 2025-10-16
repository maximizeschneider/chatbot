export interface Source {
  id: string;
  name: string;
  text: string;
  relevantParts: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  sources?: Source[];
  feedback?: "up" | "down" | null;
  feedbackReason?: string;
  suggestedQuestions?: string[];
}

export interface ConversationData {
  id: string;
  title: string;
}

export interface PendingFeedback {
  messageId: string;
  selectedReason: string | null;
  customExplanation: string;
}
