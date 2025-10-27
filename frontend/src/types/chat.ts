export interface Source {
  id: string;
  name: string;
  text: string;
  relevantParts: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  sources?: Source[];
  feedback?: "up" | "down" | null;
  feedbackReason?: string;
  suggestedQuestions?: string[];
}

export interface ConversationData {
  id: string;
  name: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

export interface PendingFeedback {
  messageId: string;
  selectedReason: string | null;
  customExplanation: string;
}
