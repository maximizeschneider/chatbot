import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquareIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2Icon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConversationData } from "@/types/chat";
import type { ConfigOption } from "@/api/config";
import type { UserProfile } from "@/api/user-profile";

interface ChatSidebarProps {
  conversations: ConversationData[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  configOptions: ConfigOption[];
  selectedConfigName: string | null;
  userProfileOptions: UserProfile[];
  selectedProfile: UserProfile | null;
  isOpen: boolean;
  onToggle: () => void;
  onCreateConversation: () => void;
  onLoadMoreConversations: () => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectConfigName: (configName: string) => void;
  onSelectProfile: (profile: UserProfile | null) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  isLoadingConversations,
  configOptions,
  selectedConfigName,
  userProfileOptions,
  selectedProfile,
  isOpen,
  onToggle,
  onCreateConversation,
  onLoadMoreConversations,
  onSelectConversation,
  onSelectConfigName,
  onSelectProfile,
  onDeleteConversation,
}: ChatSidebarProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollArea = scrollAreaRef.current;
    const sentinel = loadMoreRef.current;

    if (!scrollArea || !sentinel) {
      return;
    }

    const viewport = scrollArea.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]"
    );

    if (!viewport) {
      return;
    }

    let hasRequested = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (!hasRequested) {
            hasRequested = true;
            onLoadMoreConversations();
          }
        } else {
          hasRequested = false;
        }
      },
      {
        root: viewport,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMoreConversations, conversations.length, isOpen]);

  // Collapsed sidebar view
  if (!isOpen) {
    return (
      <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggle}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Expand Sidebar</p>
          </TooltipContent>
        </Tooltip>
        
        <Separator className="w-8" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onCreateConversation}
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-lg shadow-sm"
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>New Conversation</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded sidebar view
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Chat Settings</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggle}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Collapse Sidebar</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Configuration
            </p>
            <Select
              value={selectedConfigName ?? undefined}
              onValueChange={(value) => {
                onSelectConfigName(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Loading..." />
              </SelectTrigger>
              <SelectContent>
                {configOptions.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              User Profile
            </p>
            <Select
              value={selectedProfile?.name ?? undefined}
              onValueChange={(value) => {
                onSelectProfile(userProfileOptions.find((p) => p.name === value) ?? null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Loading..." />
              </SelectTrigger>
              <SelectContent>
                {userProfileOptions.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={onCreateConversation}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <PlusIcon className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <Separator />

      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="p-2 space-y-1">
          {isLoadingConversations && conversations.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              return (
                <div
                  key={conversation.id}
                  className="flex items-center gap-1 rounded-lg w-full min-w-0"
                >
                  <Button
                    onClick={() => onSelectConversation(conversation.id)}
                    variant={isActive ? "secondary" : "ghost"}
                    className="flex-1 justify-start gap-2 text-left min-w-0 overflow-hidden"
                  >
                    <MessageSquareIcon className="h-4 w-4 shrink-0" />
                    <span className="block truncate">{conversation.title}</span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => onDeleteConversation(conversation.id)}
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete</TooltipContent>
                  </Tooltip>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No conversations yet
            </p>
          )}
          <div ref={loadMoreRef} aria-hidden className="h-1 w-full" />
        </div>
      </ScrollArea>
    </div>
  );
}
