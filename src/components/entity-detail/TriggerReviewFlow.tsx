import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

export const SCHEDULED_REASONS = [
  "Contract / relationship renewal",
  "Periodic risk-tier cadence (review due)",
];

export const EVENT_REASONS = [
  "New jurisdiction exposure",
  "Escalation request",
  "Allegation / whistleblowing",
  "Regulatory or enforcement action",
  "Other",
];

const EDD_REASONS: Record<string, string> = {
  "Allegation / whistleblowing":
    "This trigger type is a recognised high-risk indicator under MLR 2017 and SRA AML Standards 2023. Standard-scope reviews may not satisfy your documented risk assessment obligations. We recommend escalating scope to Enhanced Due Diligence.",
  "Regulatory or enforcement action":
    "Reviews triggered by a regulatory or enforcement action should be carefully scoped. If the action relates directly to this entity, its principals, or an associated jurisdiction, Enhanced Due Diligence is likely appropriate.",
};

interface TriggerReviewFlowProps {
  entityId: string;
  children?: React.ReactNode;
}

export function useTriggerReviewFlow(entityId: string) {
  const navigate = useNavigate();
  const [eddOpen, setEddOpen] = useState(false);
  const [eddReason, setEddReason] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");

  const handleReasonSelect = (reason: string) => {
    if (reason in EDD_REASONS) {
      setEddReason(reason);
      setEddOpen(true);
    } else if (reason === "Other") {
      setOtherText("");
      setOtherOpen(true);
    } else {
      navigate(`/commission?entity=${entityId}&reason=${encodeURIComponent(reason)}`);
    }
  };

  const handleEddEscalate = () => {
    setEddOpen(false);
    navigate(`/commission?entity=${entityId}&reason=${encodeURIComponent(eddReason)}&product=Enhanced+Due+Diligence`);
  };

  const handleEddContinue = () => {
    setEddOpen(false);
    navigate(`/commission?entity=${entityId}&reason=${encodeURIComponent(eddReason)}`);
  };

  const handleOtherSubmit = () => {
    setOtherOpen(false);
    navigate(`/commission?entity=${entityId}&reason=${encodeURIComponent(`Other: ${otherText}`)}`);
  };

  const modals = (
    <>
      {/* EDD recommendation modal */}
      <Dialog open={eddOpen} onOpenChange={setEddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Enhanced Due Diligence recommended
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {EDD_REASONS[eddReason] || ""}
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleEddEscalate}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Escalate to EDD — recommended
              </Button>
              <Button
                variant="ghost"
                onClick={handleEddContinue}
                className="w-full"
              >
                Continue with standard scope
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                If you continue with standard scope, your reason will be logged to the audit trail.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other reason free-text modal */}
      <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Describe the trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Describe the trigger for this review</Label>
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Minimum 20 characters required — this will be recorded in the audit trail"
                rows={3}
              />
              {otherText.length > 0 && otherText.length < 20 && (
                <p className="text-[11px] text-destructive">
                  {20 - otherText.length} more character{20 - otherText.length !== 1 ? "s" : ""} required
                </p>
              )}
            </div>
            <Button
              onClick={handleOtherSubmit}
              className="w-full"
              disabled={otherText.trim().length < 20}
            >
              Confirm & proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return { handleReasonSelect, modals };
}
