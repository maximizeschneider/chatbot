# Management UI Chat Page – Backend Contracts 🧩

This document captures every API the chat page in `apps/management-ui` talks to, what the requests look like, and how the responses are shaped. It also contains the shared `fetchData` helper used by the non-streaming calls.

---

## Runtime Chat Streaming

| Method | Route                                                                        | Purpose                             |
| ------ | ---------------------------------------------------------------------------- | ----------------------------------- |
| `POST` | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}/chat` | Start a streamed assistant response |

### Request Body

```json5
{
  "message": { "role": "user" | "assistant", "content": "..." },
  "conversationId": "<conversation-id>",
  "userId": "<entra-user-id>",
  "tenant": "<tenant-id>",
  "stream": true,
  "devParams": {
    "evaluationActivated": true?,
    "testDataUserId": "<test-profile-userId>?"
  },
  "configName": "<configuration-name>?"
}
```

- Headers: `Content-Type: application/json`, `Authorization: Bearer NONE`, cache-blocking directives.
- Optional props are included only when set in the UI (profile/config pickers).

### Response Stream

Server replies as NDJSON (`\n` delimited JSON objects):

- `{"type": "messageChunk", "message": { "content": "…", "data": {...}? }}` – incremental assistant text (plus optional data/imageSelection).
- `{"type": "statusUpdate", "message": { "content": "…status…" }}` – transient status banner.
- `{"type": "finalMessage", "message": Message }` – final assistant message object (replaces the placeholder).

---

## Conversations & Messages

| Method   | Route                                                                                       | Description                                            | Used By                                     |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `GET`    | `/api/v1/tenant/{tenantId}/user/{userId}/conversation`                                      | Returns `Conversation[]`                               | `useConversationManager.loadConversations`  |
| `POST`   | `/api/v1/tenant/{tenantId}/user/{userId}/conversation`                                      | Body `{ "title": string }`; returns new `Conversation` | `createConversationHandler` (sidebar “New”) |
| `GET`    | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}`                     | Single conversation                                    | Not directly hooked in chat view            |
| `DELETE` | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}`                     | Deletes conversation                                   | Sidebar trash icon                          |
| `GET`    | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}/message`             | Returns `Message[]`                                    | `selectConversation` (loads thread)         |
| `GET`    | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}/message/{messageId}` | Returns single `Message`                               | Used via deep link + feedback tooling       |

### Message Shape

Defined in `@repo/shared-types` (packages/shared-types/src/chat.ts):

```ts
type Message = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  conversationId: string;
  userId: string;
  tenantId: string;
  createdAt?: string;
  data?: { type: "image" | "excel" | "file" | "imageUrl"; ... };
  feedback?: { feedbackType: 1 | 0; reason: string; text: string; acknowledged: boolean };
  sources?: any
};
```

`useConversationManager` (apps/management-ui/src/hooks/useConversationManager.ts:19) sorts messages by `createdAt` before updating the selected conversation state.

---

## Question Generation

| Method | Route                                                                                                 | Notes                                        |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `GET`  | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}/message/{messageId}/questions` | Optional `?configName=<configuration>` query |

- Returns `string[]` suggestions used in `ChatMessage` quick-reply buttons (apps/management-ui/src/api/chat.ts:204).
- Buttons send the text back through the streaming endpoint with `handleSendMessage`.

---

## Feedback Actions

| Method | Route                                                                                                | Body                                                             | Response          |
| ------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| `POST` | `/api/v1/tenant/{tenantId}/user/{userId}/conversation/{conversationId}/message/{messageId}/feedback` | `CreateFeedbackRequestBody` (`feedbackType`, `reason?`, `text?`) | Updated `Message` |

---

## Configuration & Profile Selection

These power the dropdowns on the left and influence chat dev params:

| Method | Route                                                                   | Returns                                                      | Used In                                                                        |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `GET`  | `/api/v1/tenant/{tenantId}/configuration`                               | `ConfigurationSchemaType[]` (name, templateId, blocks, etc.) | `useConfigurations` hook (apps/management-ui/src/hooks/useConfigurations.ts:5) |
| `GET`  | `/api/v1/tenant/{tenantId}/test-profiles?userId=&skipSapApiResult=true` | `TestProfile[]` (id, userId, description, data)              | `useTestProfiles` hook (apps/management-ui/src/hooks/useTestProfiles.ts:4)     |

`useProfileSelection` (apps/management-ui/src/hooks/useProfileSelection.ts:8) turns the selected entries into:

- `devParams.testDataUserId`
- Optional `configName` (skips when `default`)

Both values flow into the streaming request.

---

## Session Bootstrap & Permissions

tenantId and userId should be placeholder for now
---

## Shared Fetch Helper

All non-streaming requests use `fetchData` to standardise JSON handling and logging:

```ts
// apps/management-ui/src/api/_fetchData.ts
export async function fetchData<T = any>(
  url: string,
  options: RequestInit = {},
  actionDescription: string = "Perform an API request",
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorBody = await response.text();
      try {
        errorBody = JSON.parse(errorBody);
      } catch {
        // keep text body as-is
      }

      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        method: options.method || "GET",
        headers: Object.fromEntries(response.headers),
        response: errorBody,
      };

      console.error(`HTTP Error with ${actionDescription}:`, errorDetails);
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to ${actionDescription}:`, {
      message: (error as Error).message,
      stack: (error as Error).stack,
      url,
      method: options.method || "GET",
      body: options.body || null,
    });
    throw error;
  }
}
```

This function:

- Forces JSON `Content-Type` (unless overridden).
- Logs structured diagnostics on HTTP errors and unexpected failures.
- Re-throws errors so React Query/mutation callers can surface toasts.

---

