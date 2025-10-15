import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PendingFeedback } from "@/types/chat";

interface FeedbackOption {
  value: string;
  label: string;
}

interface FeedbackDialogProps {
  pendingFeedback: PendingFeedback | null;
  options: readonly FeedbackOption[];
  onClose: () => void;
  onSelectReason: (value: string) => void;
  onExplanationChange: (value: string) => void;
  onSubmit: () => void;
}

export function FeedbackDialog({
  pendingFeedback,
  options,
  onClose,
  onSelectReason,
  onExplanationChange,
  onSubmit,
}: FeedbackDialogProps) {
  const selectedReason = pendingFeedback?.selectedReason ?? "";
  const explanation = pendingFeedback?.customExplanation ?? "";

  const selectedOption = options.find(
    (option) => option.value === selectedReason
  );
  const requiresExplanation = selectedOption?.value === "other";
  const canSubmit =
    !!pendingFeedback &&
    !!pendingFeedback.selectedReason &&
    (!requiresExplanation || explanation.trim().length > 0);

  return (
    <Dialog open={!!pendingFeedback} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share a bit more?</DialogTitle>
          <DialogDescription>
            Pick the label that best fits why this response missed the mark.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup
            value={selectedReason}
            onValueChange={onSelectReason}
            className="grid gap-2"
          >
            {options.map((option) => {
              const id = `feedback-${option.value}`;
              const isSelected = selectedReason === option.value;

              return (
                <Label
                  key={option.value}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/60"
                  )}
                >
                  <RadioGroupItem value={option.value} id={id} />
                  <span className="flex-1">{option.label}</span>
                </Label>
              );
            })}
          </RadioGroup>

          {requiresExplanation && (
            <Textarea
              value={explanation}
              onChange={(event) => onExplanationChange(event.target.value)}
              placeholder="Tell us a bit more..."
              autoFocus
              className="min-h-[120px]"
            />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
