import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { stepCountIs, streamText } from 'ai';
import { openai } from '@/lib/openai';

const ChatBodySchema = z.object({
  prompt: z.string().min(1),
  stream: z.boolean().optional().default(true),
  model: z.string().optional().default('gpt-4o-mini'),
  conversationId: z.string().optional(),
  configName: z.string().optional(),
  profile: z.any().optional(),
  upn: z.string().optional(),
});

const HARDCODED_SOURCES = [
  {
    id: 'source-1',
    name: 'Product Documentation',
    text: '# Heading 1\nFirst, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.Our platform offers comprehensive analytics and real-time monitoring capabilities. Users can track key metrics, set up custom alerts, and generate detailed reports. The analytics dashboard provides visualization tools including charts, graphs, and customizable widgets.',
    relevantParts: [
      'Our platform offers comprehensive analytics and real-time monitoring capabilities.',
      'Users can track key metrics, set up custom alerts, and generate detailed reports.',
      'The analytics dashboard provides visualization tools including charts, graphs, and customizable widgets.'
    ]
  },
  {
    id: 'source-2', 
    name: 'Knowledge Base Article',
    text: 'First, obtain your API key from the dashboard. Then, make authenticated requests using the bearer token format. All API endpoints require authentication via the Authorization header.',
    relevantParts: [
      'First, obtain your API key from the dashboard.',
      'Make authenticated requests using the bearer token format.',
      'All API endpoints require authentication via the Authorization header.'
    ]
  },
  {
    id: 'source-3',
    name: 'Best Practices Guide',
    text: 'We recommend implementing caching strategies, batching requests when possible. Using webhooks for real-time updates rather than polling. Batching multiple operations into a single request improves efficiency.',
    relevantParts: [
      'We recommend implementing caching strategies, batching requests when possible.',
      'Using webhooks for real-time updates rather than polling.',
      'Batching multiple operations into a single request improves efficiency.'
    ]
  },
  {
    id: 'source-4',
    name: 'Best Practices Guide', 
    text: 'We recommend implementing caching strategies, batching requests when possible. Using webhooks for real-time updates rather than polling. Batching multiple operations into a single request improves efficiency.',
    relevantParts: [
      'We recommend implementing caching strategies, batching requests when possible.',
      'Using webhooks for real-time updates rather than polling.',
      'Batching multiple operations into a single request improves efficiency.'
    ]
  }
];

const handleStreamingChat = async (req: Request, res: Response) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    });
  }

  const { prompt, stream, model, conversationId, configName, profile } = parsed.data;

  const sharedSystemPrompt = `You are a helpful assistant. Provide thoughtful, well-structured answers that use the available context.
Active user profile: ${profile ?? 'Guest'}.
Conversation context id: ${conversationId ?? 'none supplied'}.`;

  if (!stream) {
    const result = await streamText({
      model: openai(model),
      system: sharedSystemPrompt,
      prompt,
      stopWhen: stepCountIs(5)
    });
    const text = await result.text;
    return res.json({
      message: text,
      sources: HARDCODED_SOURCES,
      metadata: { conversationId, configName, profile },
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendStatus = async (message: string) => {
    res.write(`data: ${JSON.stringify({ statusUpdate: message })}\n\n`);
  };

  await sendStatus('Preparing request…');
  await new Promise((r) => setTimeout(r, 400));
  await sendStatus('Gathering context…');
  await new Promise((r) => setTimeout(r, 400));
  await sendStatus('Warming up the model…');
  await new Promise((r) => setTimeout(r, 400));

  try {
    const result = await streamText({
      model: openai(model),
      system: sharedSystemPrompt,
      prompt,
      stopWhen: stepCountIs(5)
    });

    let accumulatedText = '';

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta': {
          accumulatedText += part.text;
          res.write(`data: ${JSON.stringify({ token: part.text })}\n\n`);
          break;
        }
        case 'error': {
          res.write(
            `data: ${JSON.stringify({
              error:
                typeof part.error === 'string'
                  ? part.error
                  : 'Model stream encountered an error.',
            })}\n\n`
          );
          break;
        }
        default:
          break;
      }
    }

    const finalPayload = {
      message: accumulatedText,
      sources: HARDCODED_SOURCES,
      metadata: {
        conversationId,
        configName,
        profile,
      },
    };

    res.write(`data: ${JSON.stringify({ final: finalPayload })}\n\n`);
    res.end();
  } catch (error) {
    console.error(error);
    res.write(
      `data: ${JSON.stringify({
        error: 'Internal server error while streaming chat response.',
      })}\n\n`
    );
    res.end();
  }
};

export const chatRouter = Router().post('/', (req, res) =>
  handleStreamingChat(req, res)
);
