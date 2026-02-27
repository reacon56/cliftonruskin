import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function CpiUploadPanel({ onComplete }: { onComplete?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>(String(currentYear));
  const [result, setResult] = useState<any>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a CSV file first");
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("cpi-ingest", {
        body: { csv: text, year: parseInt(year, 10) },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`CPI import complete: ${data?.records_processed ?? 0} scores, ${data?.records_changed ?? 0} changes`);
      onComplete?.();
    },
    onError: (e: any) => {
      toast.error(e.message);
      setResult({ success: false, error: e.message });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          CPI Score Upload
          <Badge variant="outline" className="text-[10px] ml-auto">Indicator Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Upload a Transparency International CPI CSV with columns: <code className="text-[10px] bg-muted px-1 rounded">country_code</code>, <code className="text-[10px] bg-muted px-1 rounded">score</code>, <code className="text-[10px] bg-muted px-1 rounded">year</code> (optional), <code className="text-[10px] bg-muted px-1 rounded">rank</code> (optional).
        </p>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <Label className="text-xs">CSV File</Label>
            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {file ? file.name : "Choose CSV…"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => upload.mutate()}
          disabled={!file || upload.isPending}
          className="w-full"
        >
          {upload.isPending ? "Importing…" : "Import CPI Scores"}
        </Button>

        {result && (
          <div className={`rounded-lg border p-3 text-xs ${result.success ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {result.success ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="font-medium">{result.success ? "Import Successful" : "Import Failed"}</span>
            </div>
            {result.success ? (
              <div className="text-muted-foreground space-y-0.5">
                <p>Processed: {result.records_processed} scores</p>
                <p>Changed: {result.records_changed} indicators</p>
              </div>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
