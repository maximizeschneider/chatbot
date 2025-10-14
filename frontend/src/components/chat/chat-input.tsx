import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2Icon, SendIcon } from 'lucide-react';

interface ChatInputProps {
  isStreaming: boolean;
  onSend: (text: string) => Promise<void> | void;
}

export function ChatInput({ isStreaming, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const maxHeight = 200;
    const minHeight = 44;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = nextHeight >= maxHeight ? 'auto' : 'hidden';
  }, [value]);

  const handleSubmit = async () => {
    const text = value.trim();
    if (!text || isStreaming) {
      return;
    }

    await onSend(text);
    setValue('');
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AI..."
          disabled={isStreaming}
          className={cn(
            'min-h-[44px] max-h-[200px] flex-1 border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0 resize-none leading-6 text-left'
          )}
          style={{ overflowY: 'hidden' }}
        />
        <Button
          type="submit"
          className="h-10 w-10 rounded-full"
          disabled={isStreaming || !value.trim()}
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-right">
        Press Enter to send. Shift+Enter for a new line.
      </p>
    </form>
  );
}
