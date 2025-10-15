import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Source } from "@/types/chat";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Response } from "@/components/ai-elements/response";

interface SourceDialogProps {
  open: boolean;
  sources: Source[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (direction: "previous" | "next") => void;
}

export function SourceDialog({
  open,
  sources,
  activeIndex,
  onClose,
  onNavigate,
}: SourceDialogProps) {
  const activeSource = sources[activeIndex];
  const hasMultipleSources = sources.length > 1;
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < sources.length - 1;
  
  const [highlightedPartIndex, setHighlightedPartIndex] = useState<number | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Reset highlighting when modal closes
  useEffect(() => {
    if (!open) {
      setHighlightedPartIndex(null);
    }
  }, [open]);

  // Scroll to highlighted part when it changes
  useEffect(() => {
    if (highlightedPartIndex !== null && highlightRef.current) {
      // Small delay to ensure the content is rendered
      setTimeout(() => {
        const markElement = highlightRef.current?.querySelector("mark");
        if (markElement) {
          markElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [highlightedPartIndex]);

  // Reset highlighting when source changes
  const resetHighlight = () => setHighlightedPartIndex(null);

  // Check if the relevant part is found in the text
  const isRelevantPartNotFound = highlightedPartIndex !== null && 
    activeSource?.relevantParts?.[highlightedPartIndex] &&
    !activeSource.text.includes(activeSource.relevantParts[highlightedPartIndex]);

  // Helper function to add markdown highlighting to the relevant part
  const getTextWithMarkdownHighlight = (text: string) => {
    if (highlightedPartIndex === null || !activeSource?.relevantParts) {
      return text;
    }

    const partToHighlight = activeSource.relevantParts[highlightedPartIndex];
    if (!partToHighlight) {
      return text;
    }

    const index = text.indexOf(partToHighlight);
    if (index === -1) {
      return text;
    }

    // Add HTML mark tag for highlighting (markdown allows HTML)
    // Using light yellow background that works well in both light and dark modes
    return (
      text.substring(0, index) +
      "<mark class='bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded'>" +
      partToHighlight +
      "</mark>" +
      text.substring(index + partToHighlight.length)
    );
  };

  return (
    <Dialog open={open} onOpenChange={(dialogOpen) => !dialogOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-0">
          {hasMultipleSources && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -left-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg z-50"
                onClick={() => {
                  resetHighlight();
                  onNavigate("previous");
                }}
                disabled={!hasPrevious}
                aria-label="Previous source"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg z-50"
                onClick={() => {
                  resetHighlight();
                  onNavigate("next");
                }}
                disabled={!hasNext}
                aria-label="Next source"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </Button>
            </>
          )}
          <DialogHeader className="px-12 flex-shrink-0">
            <DialogTitle>{activeSource?.name ?? "Source details"}</DialogTitle>

          </DialogHeader>
          
          {activeSource?.relevantParts && activeSource.relevantParts.length > 0 && (
            <div className="px-12 py-2 flex-shrink-0">
              <div className="flex gap-2 flex-wrap">
                {activeSource.relevantParts.map((_, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={highlightedPartIndex === index ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setHighlightedPartIndex(highlightedPartIndex === index ? null : index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              {isRelevantPartNotFound && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  Relevant part is not found
                </p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-12 pb-4 min-h-0">
            <div ref={highlightRef}>
              <h4 className="font-medium text-sm mb-2">Full Text</h4>
              <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                <Response>{getTextWithMarkdownHighlight(activeSource?.text ?? "")}</Response>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
