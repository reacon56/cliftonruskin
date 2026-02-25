import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { HeadphonesIcon } from "lucide-react";

export default function SupportPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message sent", description: "Our team will respond within 1 business day." });
    setForm({ subject: "", message: "" });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <HeadphonesIcon size={32} className="mx-auto text-accent mb-3" />
        <h1 className="fvc-heading-1 text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-2">Get in touch with the Far View &amp; Chase team</p>
      </div>

      <form onSubmit={handleSubmit} className="fvc-card-elevated space-y-5">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full">Send Message</Button>
      </form>
    </div>
  );
}
