import {
  Conversation,
  ConversationContent,
  type ConversationProps,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { Loader } from '@/components/ai-elements/loader';
import type { ChatMessage, Source } from '@/types/chat';
import { useEffect, type RefObject } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';

interface ChatMessagesProps {
  messages: ChatMessage[];
  statusUpdate: string;
  isStreaming: boolean;
  streamingMessage: string;
  error: string | null;
  onDismissError?: () => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSelectSource: (source: Source, sources: Source[]) => void;
  onFeedback: (
    messageId: string,
    feedback: 'up' | 'down' | null,
    reason?: string
  ) => void;
  onNegativeFeedbackClick: (message: ChatMessage) => void;
  onGenerateQuestions: (message: ChatMessage) => void;
  onFollowUpSelect: (messageId: string, question: string) => void;
  isGeneratingQuestions: boolean;
  activeQuestionMessageId: string | null;
  isSourcesVisible: (messageId: string) => boolean;
  isSourcesLoading: (messageId: string) => boolean;
  getSourcesError: (messageId: string) => string | null;
  onToggleSources: (message: ChatMessage) => void;
  stickToBottomContextRef?: ConversationProps['contextRef'];
  onStickToBottomEscapeChange?: (escaped: boolean) => void;
}

export function ChatMessages({
  messages,
  statusUpdate,
  isStreaming,
  streamingMessage,
  error,
  onDismissError,
  messagesEndRef,
  onSelectSource,
  onFeedback,
  onNegativeFeedbackClick,
  onGenerateQuestions,
  onFollowUpSelect,
  isGeneratingQuestions,
  activeQuestionMessageId,
  isSourcesVisible,
  isSourcesLoading,
  getSourcesError,
  onToggleSources,
  stickToBottomContextRef,
  onStickToBottomEscapeChange,
}: ChatMessagesProps) {
  return (
    <Conversation className="flex-1" contextRef={stickToBottomContextRef}>
      <StickStateObserver onEscapeChange={onStickToBottomEscapeChange} />
      <ConversationContent className="max-w-3xl mx-auto w-full">
        {messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          const isGeneratingForMessage =
            isGeneratingQuestions &&
            activeQuestionMessageId === message.id;
          const sourcesVisible = isSourcesVisible(message.id);
          const sourcesLoading = isSourcesLoading(message.id);
          const sourcesList = message.sources;
          const sourcesError = getSourcesError(message.id);
          const hasLoadedSources =
            message.sources !== undefined || sourcesError !== null;
          const hasSources = (sourcesList?.length ?? 0) > 0;

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent
                variant="flat"
                className={cn(
                  'max-w-none',
                  isAssistant ? 'w-full' : 'max-w-[80%]'
                )}
              >
                {isAssistant ? (
                  <Response className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content}
                  </Response>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content}
                  </div>
                )}

                {isAssistant && (
                  <div className="flex items-center gap-1 mt-3 pt-2 border-t">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onFeedback(
                              message.id,
                              message.feedback === 'up' ? null : 'up'
                            )
                          }
                          className={cn(
                            'h-8 px-2',
                            message.feedback === 'up' && 'bg-accent'
                          )}
                          aria-label={
                            message.feedback === 'up'
                              ? 'Remove positive feedback'
                              : 'Give positive feedback'
                          }
                        >
                          <ThumbsUpIcon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        This was helpful
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNegativeFeedbackClick(message)}
                          className={cn(
                            'h-8 px-2',
                            message.feedback === 'down' && 'bg-accent'
                          )}
                          aria-label={
                            message.feedback === 'down'
                              ? 'Remove negative feedback'
                              : 'Give negative feedback'
                          }
                        >
                          <ThumbsDownIcon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {message.feedback === 'down'
                          ? 'Remove or edit feedback'
                          : 'This missed the mark'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => onGenerateQuestions(message)}
                          disabled={isGeneratingForMessage}
                          aria-label="Generate follow-up questions"
                        >
                          {isGeneratingForMessage ? (
                            <Loader size={12} />
                          ) : (
                            <HelpCircleIcon className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Generate questions
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => onToggleSources(message)}
                          disabled={sourcesLoading}
                          aria-expanded={sourcesVisible}
                          aria-label={
                            sourcesVisible ? 'Hide sources' : 'Show sources'
                          }
                        >
                          {sourcesLoading ? (
                            <Loader size={12} />
                          ) : (
                            <ChevronDownIcon
                              className={cn(
                                'h-3 w-3 transition-transform',
                                sourcesVisible ? 'rotate-0' : '-rotate-90'
                              )}
                            />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {sourcesVisible ? 'Hide sources' : 'Show sources'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {isAssistant && sourcesVisible && (
                  <div className="mt-4 space-y-2">
                    {sourcesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader size={12} />
                        Loading sources...
                      </div>
                    ) : sourcesError ? (
                      <p className="text-sm text-destructive">
                        Failed to load sources: {sourcesError}
                      </p>
                    ) : hasLoadedSources ? (
                      hasSources ? (
                        <>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            Sources ({sourcesList?.length ?? 0})
                          </h4>
                          <Carousel
                            opts={{
                              align: 'start',
                              loop: false,
                            }}
                            className="w-full"
                          >
                            <CarouselContent>
                              {sourcesList?.map((source) => (
                                <CarouselItem
                                  key={source.id}
                                  className="basis-full sm:basis-1/3 md:basis-1/4 lg:basis-[22%]"
                                >
                                  <Card
                                    className="cursor-pointer hover:bg-accent/50 transition-colors h-full max-w-[240px] mx-auto flex flex-col"
                                  onClick={() =>
                                    onSelectSource(
                                      source,
                                      sourcesList ?? []
                                    )
                                  }
                                >
                                  <CardContent className="p-3 flex-1 flex flex-col">
                                    <h5 className="font-medium text-sm line-clamp-2">
                                      {source.name}
                                    </h5>
                                  </CardContent>
                                </Card>
                              </CarouselItem>
                            ))}
                            </CarouselContent>
                          {(sourcesList?.length ?? 0) > 3 && (
                            <>
                              <CarouselPrevious className="left-0" />
                              <CarouselNext className="right-0" />
                            </>
                          )}
                        </Carousel>
                      </>
                      ) : (
                      <p className="text-sm text-muted-foreground">
                        No sources available for this response.
                      </p>
                      )
                    ) : null}
                  </div>
                )}

                {isAssistant && message.suggestedQuestions?.length ? (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Suggested follow-ups
                    </h4>
                    <ul className="space-y-1">
                      {message.suggestedQuestions.map((question) => (
                        <li key={question}>
                          <button
                            type="button"
                            onClick={() => onFollowUpSelect(message.id, question)}
                            className="w-full rounded-md border bg-muted/40 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            {question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </MessageContent>
            </Message>
          );
        })}

        {statusUpdate && (
          <Message from="assistant">
            <MessageContent variant="flat" className="w-full">
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                <Loader size={14} />
                {statusUpdate}
              </div>
            </MessageContent>
          </Message>
        )}

        {isStreaming && streamingMessage.length > 0 && (
          <Message from="assistant">
            <MessageContent variant="flat" className="w-full max-w-none space-y-4">
              <Response className="prose prose-sm dark:prose-invert max-w-none">
                {streamingMessage}
              </Response>
              <span className="inline-block w-1 h-4 bg-foreground ml-1 animate-pulse" />
            </MessageContent>
          </Message>
        )}

        {error && (
          <Message from="assistant">
            <MessageContent variant="flat" className="w-full max-w-none">
              <Alert variant="destructive" className="flex items-start gap-3">
                <AlertTriangleIcon className="h-4 w-4 mt-0.5" />
                <div className="flex-1">
                  <AlertTitle className="text-sm">Something went wrong</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </div>
                {onDismissError && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 -mr-2 text-xs"
                    onClick={onDismissError}
                  >
                    Dismiss
                  </Button>
                )}
              </Alert>
            </MessageContent>
          </Message>
        )}

        <div ref={messagesEndRef} />
      </ConversationContent>
    </Conversation>
  );
}

function StickStateObserver({
  onEscapeChange,
}: {
  onEscapeChange?: (escaped: boolean) => void;
}) {
  const { escapedFromLock } = useStickToBottomContext();

  useEffect(() => {
    onEscapeChange?.(escapedFromLock);
  }, [escapedFromLock, onEscapeChange]);

  return null;
}
