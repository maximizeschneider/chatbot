import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquareIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2Icon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ConversationData } from '@/types/chat';
import type { ConfigOption } from '@/api/config';
import type { UserProfile } from '@/api/user-profile';

interface ChatSidebarProps {
  conversations: ConversationData[];
  activeConversationId: string;
  configOptions: ConfigOption[];
  selectedConfig: string | null;
  userProfileOptions: UserProfile[];
  selectedProfile: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectConfig: (config: string | null) => void;
  onSelectProfile: (profile: string | null) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  configOptions,
  selectedConfig,
  userProfileOptions,
  selectedProfile,
  isOpen,
  onToggle,
  onCreateConversation,
  onSelectConversation,
  onSelectConfig,
  onSelectProfile,
  onDeleteConversation,
}: ChatSidebarProps) {
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
              value={selectedConfig ?? undefined}
              onValueChange={(value) => {
                onSelectConfig(value);
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
              value={selectedProfile ?? undefined}
              onValueChange={(value) => {
                onSelectProfile(value);
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

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;

            return (
              <div
                key={conversation.id}
                className="flex items-center gap-1 rounded-lg"
              >
                <Button
                  onClick={() => onSelectConversation(conversation.id)}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="flex-1 justify-start gap-2 text-left"
                >
                  <MessageSquareIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conversation.title}</span>
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
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
