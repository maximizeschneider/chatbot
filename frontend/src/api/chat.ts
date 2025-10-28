import { useMutation } from "@tanstack/react-query";
import type { ConversationMessage, Source } from "@/types/chat";
import { buildApiUrl } from "./client";
import type { ApiMessage } from "./messages";
import { mapApiMessage } from "./messages";

export type DevParams = {
  evaluationActivated?: boolean;
  testDataUserId?: string;
};

export type ChatRequest = {
  tenantId: string;
  userId: string;
  conversationId: string;
  message: {
    id?: string;
    role: "user" | "assistant";
    content: string;
  };
  configName?: string | null;
  devParams?: DevParams;
  model?: string;
  stream?: boolean;
  signal?: AbortSignal;
};

export type ChatCompletionPayload = {
  message: ConversationMessage;
  documents?: Source[];
};

export type ChatStreamCallbacks = {
  onStatusUpdate?: (status: string) => void;
  onToken?: (token: string) => void;
  onComplete?: (payload: ChatCompletionPayload) => void;
  onError?: (error: Error) => void;
};

type StreamEvent =
  | {
      type: "statusUpdate";
      message?: { content?: string };
    }
  | {
      type: "messageChunk";
      message?: { content?: string };
    }
  | {
      type: "documents";
      message?: { sources?: Source[] };
    }
  | {
      type: "finalMessage";
      message: ApiMessage;
    };

const toChatCompletionPayload = (
  message: ApiMessage,
  documents?: Source[],
): ChatCompletionPayload => {
  const mapped = mapApiMessage(message);
  return {
    message: mapped,
    documents:
      documents ??
      (mapped.sources && mapped.sources.length > 0 ? mapped.sources : undefined),
  };
};

const parseHttpStream = async (
  response: Response,
  callbacks: ChatStreamCallbacks,
) => {
  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalMessage: ApiMessage | null = null;
  let documents: Source[] | undefined;

  const handleChunk = (chunk: string) => {
    if (!chunk) return;

    try {
      const data = JSON.parse(chunk) as StreamEvent;

      switch (data.type) {
        case "statusUpdate": {
          const status = data.message?.content;
          if (status) {
            callbacks.onStatusUpdate?.(status);
          }
          break;
        }
        case "messageChunk": {
          const token = data.message?.content;
          if (token) {
            callbacks.onToken?.(token);
          }
          break;
        }
        case "documents": {
          if (Array.isArray(data.message?.sources)) {
            documents = data.message?.sources;
          }
          break;
        }
        case "finalMessage": {
          finalMessage = data.message;
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error("Failed to parse chat stream payload", error);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      handleChunk(chunk);
      boundary = buffer.indexOf("\n");
    }
  }

  buffer += decoder.decode();

  let trailingBoundary = buffer.indexOf("\n");
  while (trailingBoundary !== -1) {
    const chunk = buffer.slice(0, trailingBoundary).trim();
    buffer = buffer.slice(trailingBoundary + 1);
    handleChunk(chunk);
    trailingBoundary = buffer.indexOf("\n");
  }

  const remainingChunk = buffer.trim();
  if (remainingChunk.length > 0) {
    handleChunk(remainingChunk);
  }

  if (!finalMessage) {
    throw new Error("Chat stream ended without a final payload.");
  }

  const payload = toChatCompletionPayload(finalMessage, documents);
  callbacks.onComplete?.(payload);
  return payload;
};

export const useChatMutation = (callbacks: ChatStreamCallbacks = {}) =>
  useMutation<ChatCompletionPayload, Error, ChatRequest>({
    mutationKey: ["chat"],
    mutationFn: async ({
      tenantId,
      userId,
      conversationId,
      message,
      signal,
      stream = true,
      configName,
      devParams,
      model,
    }: ChatRequest): Promise<ChatCompletionPayload> => {
      const response = await fetch(
        buildApiUrl(
          `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}/chat`,
        ),
        {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            ...(stream ? { Accept: "application/x-ndjson" } : {}),
          },
          body: JSON.stringify({
            message,
            conversationId,
            userId,
            tenant: tenantId,
            stream,
            configName: configName ?? undefined,
            devParams,
            model,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Chat request failed with status ${response.status} ${response.statusText}`,
        );
      }

      if (stream) {
        return parseHttpStream(response, callbacks);
      }

      const json = (await response.json()) as StreamEvent & {
        message?: ApiMessage;
      };

      if (json.type !== "finalMessage" || !json.message) {
        throw new Error("Unexpected non-streaming chat response.");
      }

      const payload = toChatCompletionPayload(json.message);
      callbacks.onComplete?.(payload);
      return payload;
    },
    onError: (error) => {
      callbacks.onError?.(error);
    },
  });
