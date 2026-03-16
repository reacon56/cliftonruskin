import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { countryCodeToFlag } from "@/lib/country-flag";

interface MarketLesson {
  id: string;
  title: string;
  category: string;
  publication_name: string;
  publication_url: string;
  publication_date: string | null;
  summary_text: string | null;
  governance_reflection: string | null;
  jurisdiction_country_code: string | null;
  published: boolean;
  created_at: string;
}

export default function RegulatoryBriefingsPage() {
  const { profile } = useAuth();

  const { data: briefings = [], isLoading } = useQuery({
    queryKey: ["regulatory-briefings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_lessons" as any)
        .select("*")
        .eq("published", true)
        .order("publication_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarketLesson[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Regulatory Briefings
        </h1>
        <div className="fvc-gold-rule mt-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          Published regulatory intelligence and governance observations from your CR team.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : briefings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground max-w-sm">
              No regulatory briefings published yet. Your CR team will publish relevant updates here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {briefings.map((b) => (
            <Card key={b.id} className="hover:border-primary/20 transition-colors duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {b.title}
                      </h3>
                      {b.jurisdiction_country_code && (
                        <span className="text-sm">{countryCodeToFlag(b.jurisdiction_country_code)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{b.publication_name}</span>
                      <span>·</span>
                      <span>
                        {b.publication_date
                          ? new Date(b.publication_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Date unknown"}
                      </span>
                      {b.category && (
                        <>
                          <span>·</span>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {b.category}
                          </Badge>
                        </>
                      )}
                    </div>

                    {b.summary_text && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {b.summary_text}
                      </p>
                    )}
                  </div>

                  {b.publication_url && (
                    <a
                      href={b.publication_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title="View source"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
