import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { stepCountIs, streamText, tool } from "ai";
import {
  HARDCODED_SOURCES,
  appendMessage,
  findConversation,
  type Message,
} from "@/data/mock";
import { openai } from "@/lib/openai";

const someTool = tool({
  name: "some_tool",
  description: "A tool that does something",
  inputSchema: z.object({
    prompt: z.string(),
  }),
  execute: async () => {
    return "some_tool_response";
  },
});

const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const DevParamsSchema = z
  .object({
    evaluationActivated: z.boolean().optional(),
    testDataUserId: z.string().optional(),
  })
  .partial()
  .optional();

const ChatBodySchema = z.object({
  message: MessageSchema,
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  tenant: z.string().min(1),
  stream: z.boolean().optional().default(true),
  model: z.string().optional().default("gpt-4o-mini"),
  configName: z.string().optional(),
  devParams: DevParamsSchema,
});

const writeChunk = (
  res: Response,
  payload: Record<string, unknown>,
) => {
  res.write(`${JSON.stringify(payload)}\n`);
};

const sendStatusUpdate = (res: Response, content: string) => {
  writeChunk(res, {
    type: "statusUpdate",
    message: { content },
  });
};

const streamAssistantResponse = async (
  req: Request,
  res: Response,
  body: z.infer<typeof ChatBodySchema>,
) => {
  const { tenantId, userId, conversationId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
  };

  if (!tenantId || !userId || !conversationId) {
    res.status(400).json({
      error: "tenantId, userId, and conversationId are required route parameters.",
    });
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  await sendStatusUpdate(res, "Preparing request…");
  await new Promise((resolve) => setTimeout(resolve, 200));
  await sendStatusUpdate(res, "Gathering context…");
  await new Promise((resolve) => setTimeout(resolve, 200));
  await sendStatusUpdate(res, "Warming up the model…");
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const result = await streamText({
      model: openai(body.model),
      system: `You are a helpful assistant supporting enterprise users belonging to tenant ${tenantId}.`,
      prompt: body.message.content,
      stopWhen: stepCountIs(5),
      tools: { someTool },
    });

    let aggregatedContent = "";

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        aggregatedContent += part.text;
        writeChunk(res, {
          type: "messageChunk",
          message: {
            content: part.text,
          },
        });
      } else if (part.type === "error") {
        writeChunk(res, {
          type: "statusUpdate",
          message: { content: "Stream error encountered." },
        });
      }
    }

    const assistantMessage: Message = {
      _id: `msg-${randomUUID()}`,
      role: "assistant",
      content: aggregatedContent.length
        ? aggregatedContent
        : "I'm ready to help with anything else you need.",
      conversationId,
      tenantId,
      userId,
      createdAt: new Date().toISOString(),
      data: {
        type: "references",
        sources: HARDCODED_SOURCES,
      },
    };

    writeChunk(res, {
      type: "documents",
      message: {
        sources: HARDCODED_SOURCES,
      },
    });

    appendMessage(assistantMessage);

    writeChunk(res, {
      type: "finalMessage",
      message: assistantMessage,
    });

    res.end();
  } catch (error) {
    console.error(error);
    writeChunk(res, {
      type: "statusUpdate",
      message: { content: "The assistant failed to respond." },
    });
    res.end();
  }
};

const completeAssistantResponse = async (
  req: Request,
  res: Response,
  body: z.infer<typeof ChatBodySchema>,
) => {
  const { tenantId, userId, conversationId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
  };

  if (!tenantId || !userId || !conversationId) {
    res.status(400).json({
      error: "tenantId, userId, and conversationId are required route parameters.",
    });
    return;
  }

  try {
    const result = await streamText({
      model: openai(body.model),
      system: `You are a helpful assistant supporting enterprise users belonging to tenant ${tenantId}.`,
      prompt: body.message.content,
      stopWhen: stepCountIs(5),
      tools: { someTool },
    });

    const text = await result.text;
    const assistantMessage: Message = {
      _id: `msg-${randomUUID()}`,
      role: "assistant",
      content: text,
      conversationId,
      tenantId,
      userId,
      createdAt: new Date().toISOString(),
      data: {
        type: "references",
        sources: HARDCODED_SOURCES,
      },
    };

    appendMessage(assistantMessage);

    res.json({
      type: "finalMessage",
      message: assistantMessage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error while generating response.",
    });
  }
};

const handleChat = async (req: Request, res: Response) => {
  const { tenantId, userId, conversationId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
  };

  if (!tenantId || !userId || !conversationId) {
    return res.status(400).json({
      error:
        "tenantId, userId, and conversationId are required route parameters.",
    });
  }

  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const body = parsed.data;

  if (
    body.conversationId !== conversationId ||
    body.userId !== userId ||
    body.tenant !== tenantId
  ) {
    return res.status(400).json({
      error:
        "Conversation, user, and tenant identifiers in the body must align with the URL parameters.",
    });
  }

  const conversation = findConversation(tenantId, userId, conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const userMessageId = body.message.id ?? `msg-${randomUUID()}`;

  const userMessage: Message = {
    _id: userMessageId,
    role: body.message.role,
    content: body.message.content,
    conversationId,
    tenantId,
    userId,
    createdAt: new Date().toISOString(),
  };

  appendMessage(userMessage);

  if (body.stream) {
    void streamAssistantResponse(req, res, body);
    return;
  }

  await completeAssistantResponse(req, res, body);
};

export const chatRouter = Router({ mergeParams: true }).post("/", (req, res) =>
  void handleChat(req, res),
);
