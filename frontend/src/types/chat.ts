export interface Source {
  id: string;
  name: string;
  text: string;
  relevantParts: string[];
}

export interface MessageFeedbackDetails {
  feedbackType: 1 | 0;
  reason: string | null;
  text: string | null;
  acknowledged: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt?: string;
  sources?: Source[];
  data?: Record<string, unknown>;
  feedback?: "up" | "down" | null;
  feedbackReason?: string;
  feedbackDetails?: MessageFeedbackDetails | null;
  imageSelection?: Array<{ key: string; src: string; filepath: string; type: string }>;
  suggestedQuestions?: string[];
}

export interface ConversationData {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt?: string;
  sources?: Source[];
  data?: {
    type: string;
    sources?: Source[];
    [key: string]: unknown;
  };
  feedback?: MessageFeedbackDetails | null;
  imageSelection?: Array<{ key: string; src: string; filepath: string; type: string }>;
}

export interface PendingFeedback {
  messageId: string;
  selectedReason: string | null;
  customExplanation: string;
}
