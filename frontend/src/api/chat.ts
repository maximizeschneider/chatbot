import { useMutation } from '@tanstack/react-query';
import type { Source } from '@/types/chat';
import { buildApiUrl } from './client';
import type { UserProfile } from './user-profile';

export type ChatRequest = {
  prompt: string;
  conversationId?: string;
  configName?: string;
  profile?: UserProfile;
  upn?: string;
  model?: string;
  stream?: boolean;
  signal?: AbortSignal;
};

export type ChatCompletionPayload = {
  message: string;
  sources?: Source[];
  metadata?: {
    conversationId?: string;
    configName?: string;
    profile?: string;
  };
};

export type ChatStreamCallbacks = {
  onStatusUpdate?: (status: string) => void;
  onToken?: (token: string) => void;
  onComplete?: (payload: ChatCompletionPayload) => void;
  onError?: (error: Error) => void;
};

const parseSSEStream = async (
  response: Response,
  callbacks: ChatStreamCallbacks
) => {
  if (!response.body) {
    throw new Error('Streaming is not supported by this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: ChatCompletionPayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (chunk.startsWith('data:')) {
        const payload = chunk.replace(/^data:\s*/, '');
        try {
          const data = JSON.parse(payload) as Record<string, unknown>;

          if (typeof data.statusUpdate === 'string') {
            callbacks.onStatusUpdate?.(data.statusUpdate);
          }

          if (typeof data.token === 'string') {
            callbacks.onToken?.(data.token);
          }

          if (data.error) {
            throw new Error(
              typeof data.error === 'string'
                ? data.error
                : 'Received error in chat stream.'
            );
          }

          if (data.final) {
            finalPayload = data.final as ChatCompletionPayload;
          }
        } catch (error) {
          console.error('Failed to parse chat stream payload', error);
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  if (buffer.trim().length > 0 && buffer.startsWith('data:')) {
    try {
      const data = JSON.parse(buffer.replace(/^data:\s*/, ''));
      if (data.final) {
        finalPayload = data.final as ChatCompletionPayload;
      }
    } catch (error) {
      console.error('Failed to parse trailing chat stream payload', error);
    }
  }

  if (!finalPayload) {
    throw new Error('Chat stream ended without a final payload.');
  }

  callbacks.onComplete?.(finalPayload);
  return finalPayload;
};

export const useChatMutation = (callbacks: ChatStreamCallbacks = {}) =>
  useMutation<ChatCompletionPayload, Error, ChatRequest>({
    mutationKey: ['chat'],
    mutationFn: async ({
      signal,
      stream = true,
      ...body
    }: ChatRequest): Promise<ChatCompletionPayload> => {
      const response = await fetch(buildApiUrl('/chat'), {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          stream,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Chat request failed with status ${response.status} ${response.statusText}`
        );
      }

      if (stream) {
        return parseSSEStream(response, callbacks);
      }

      const json = (await response.json()) as ChatCompletionPayload;
      callbacks.onComplete?.(json);
      return json;
    },
    onError: (error) => {
      callbacks.onError?.(error);
    },
  });
