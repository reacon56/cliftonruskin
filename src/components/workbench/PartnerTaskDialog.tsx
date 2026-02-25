import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseModuleId: string;
  defaultCountry: string;
  entityId?: string;
}

export default function PartnerTaskDialog({ open, onOpenChange, caseModuleId, defaultCountry, entityId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [deadline, setDeadline] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partners, setPartners] = useState<any[]>([]);
  const [questions, setQuestions] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  // Load available partners (internal users only)
  useState(() => {
    supabase.from("partners" as any).select("id, name, country").eq("active", true)
      .then(({ data }: any) => setPartners(data ?? []));
  });

  const addQuestion = () => setQuestions((prev) => [...prev, ""]);
  const updateQuestion = (idx: number, val: string) => setQuestions((prev) => prev.map((q, i) => i === idx ? val : q));
  const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!title.trim() || !country.trim()) {
      toast({ title: "Required fields", description: "Title and country are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Resolve partner user id from email if provided
    let partnerUserId: string | null = null;
    if (partnerEmail.trim()) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", partnerEmail.trim())
        .single();
      if (partnerProfile) {
        partnerUserId = partnerProfile.user_id;
      } else {
        toast({ title: "Partner not found", description: `No user found with email: ${partnerEmail}`, variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    const filteredQuestions = questions.filter((q) => q.trim());

    const { data: taskData, error } = await supabase.from("partner_tasks").insert({
      case_module_id: caseModuleId,
      title: title.trim(),
      country: country.trim(),
      deadline: deadline || null,
      questions: filteredQuestions,
      status: "sent",
      created_by: user?.id,
      partner_user_id: partnerUserId,
      partner_id: selectedPartnerId || null,
      entity_id: entityId || null,
    } as any).select("id").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Create checklist items from questions
    if (taskData && filteredQuestions.length > 0) {
      const items = filteredQuestions.map((q, i) => ({
        task_id: (taskData as any).id,
        sort_order: i,
        label: q,
      }));
      await supabase.from("partner_task_items" as any).insert(items);
    }

    toast({ title: "Task sent", description: "In-country input request has been created." });
    setTitle("");
    setCountry(defaultCountry);
    setDeadline("");
    setPartnerEmail("");
    setSelectedPartnerId("");
    setQuestions([""]);
    onOpenChange(false);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Globe size={18} className="text-accent" /> Request In-Country Input
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-xs text-muted-foreground">
            Create an internal task for a partner network contact. Client does not see partner identities.
          </p>
          <div className="space-y-1.5">
            <Label>Task Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Verify local trade references for Entity X" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Partner Organisation</Label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select partner…</option>
              {partners.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign to Partner User (email)</Label>
            <Input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@example.com (optional)"
            />
            <p className="text-[10px] text-muted-foreground">Leave blank to assign later.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Checklist Items</Label>
              <Button size="sm" variant="ghost" onClick={addQuestion} className="h-6 px-2 text-xs">
                <Plus size={11} className="mr-1" /> Add
              </Button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  placeholder={`Item ${i + 1}`}
                  className="text-sm"
                />
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)} className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !country.trim()}>
            {submitting ? "Sending…" : "Send Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
