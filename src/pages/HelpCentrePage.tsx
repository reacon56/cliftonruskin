import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { LifeBuoy, Search, Send, Bot, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

/* ────── Portal content definitions ────── */

interface HelpArticle {
  title: string;
  body: string;
}

interface HelpSection {
  title: string;
  articles: HelpArticle[];
}

interface PortalHelp {
  assistantSubtitle: string;
  systemPrompt: string;
  sections: HelpSection[];
}

const INTERNAL_HELP: PortalHelp = {
  assistantSubtitle: "Your operational guide to the CR platform — case management, compliance workflow, and analyst tools.",
  systemPrompt: `You are the CR Internal Help Assistant for the Clifton Ruskin Assurance Portal. You assist CR analysts, directors, and operations staff with platform questions. You may discuss: case management workflow, the four-agent AI pipeline (Intake, Research, Drafting, Compliance Gate), entity register management, jurisdiction intelligence, LIA compliance workflow, risk tier configuration, the CR-JURIS-1.0 scoring model, workload management, report QA, the approvals flow, SLA management, and all CR internal operational features. You must not discuss: client billing details, client-specific case findings, third-party subject data, or any information that should only be visible in the client portal. Keep answers concise and operationally focused. When a process has regulatory implications (e.g. LIA, EDD scope), note the regulatory basis briefly.`,
  sections: [
    {
      title: "Getting Started",
      articles: [
        { title: "What is the CR Assurance Portal and how is it structured?", body: "The CR Assurance Portal is the central platform for managing due diligence cases, entity risk assessments, and compliance workflows. It comprises three portals: CR Internal (for analysts and operations staff), Client (for compliance officers and programme managers), and Third-Party (for entities submitting information as part of a review). Each portal is role-gated and shows only relevant functionality." },
        { title: "Understanding the three portals: CR Internal, Client, Third-Party", body: "CR Internal provides full operational access including case management, AI-assisted analysis, jurisdiction intelligence, and quality assurance. The Client portal enables commissioning reviews, viewing reports, monitoring alerts, and managing their assurance programme. The Third-Party portal allows invited entities to securely submit requested information." },
        { title: "Your role and permissions explained", body: "Your access level is determined by your assigned role. Key internal roles include Assurance Manager (full operational oversight), Assurance Officer (case work and research), Analyst (research and data gathering), Quality Reviewer (QA sign-off), and Ops Admin (platform configuration). Each role has specific permissions governing which actions you can perform." },
        { title: "How to navigate the platform", body: "Use the left sidebar to navigate between sections. The sidebar is organised into collapsible groups: Operations, Intelligence, Compliance, Programme, Commercial, and Admin. Your active section will auto-expand. Use the role switcher at the bottom of the sidebar if you have dual-role access." },
      ],
    },
    {
      title: "Case Management",
      articles: [
        { title: "How to create a new case", body: "Navigate to a specific entity and click 'New Case' to commission a fresh engagement. Select the appropriate product type, report tier, and any enhancement modules required. The case will enter the approvals workflow before work begins." },
        { title: "Understanding case status stages", body: "Cases progress through defined stages: Draft → Submitted → Quoted → Approved → In Progress → QA Review → Completed → Delivered. Each transition is logged in the audit trail. Some transitions require specific role permissions." },
        { title: "Assigning and managing cases in Workload View", body: "The Workload View provides a visual overview of all active cases across your team. Managers can assign officers, adjust priorities, and monitor SLA compliance. Use the Gantt and calendar views to manage capacity." },
        { title: "The four-agent AI pipeline: what each agent does", body: "The AI pipeline consists of four stages: Intake (scoping based on trigger type), Research (structured source gathering with 7-13 items depending on scope), Drafting (trigger-aware report generation), and Compliance Gate (automated rule checks before release). All outputs are advisory and require human review." },
        { title: "How to review and approve AI-drafted reports", body: "AI-drafted content appears in the case detail view with a clear 'AI-assisted' label. You must accept, edit, or reject each section. Accepted content is logged with your acknowledgement. Rejected content requires manual replacement." },
        { title: "Reports QA Queue — what it is and how to use it", body: "The QA Queue shows all cases awaiting quality review. Quality Reviewers and Assurance Leads can sign off reports, request amendments, or escalate concerns. Each QA action is recorded in the audit trail." },
        { title: "Emergency Note: when and how to use it", body: "The All-Stations Notice (Emergency Note) broadcasts an urgent message to all users associated with a case. Use it for time-sensitive issues such as new adverse findings during an active review, or regulatory changes affecting the entity." },
      ],
    },
    {
      title: "Entity Register & Reviews",
      articles: [
        { title: "Adding and editing entities", body: "Add entities via the entity register or bulk upload. Required fields include entity name, type, and jurisdiction. Additional fields such as registration number, beneficial ownership, and operating countries improve the quality of risk assessments." },
        { title: "Understanding risk tiers (Tier A / B / C)", body: "Risk tiers determine the depth and frequency of due diligence. Tier A (highest risk) requires enhanced scope and more frequent reviews. Tier B is standard scope. Tier C is simplified. Tiers are assigned based on the CR risk model incorporating jurisdiction, structural, association, and event risk factors." },
        { title: "Scheduled vs event-triggered reviews", body: "Scheduled reviews follow the cadence set by the entity's risk tier (e.g., annual for Tier A, biennial for Tier B). Event-triggered reviews are initiated when a specific event occurs — such as a new jurisdiction exposure, allegation, or regulatory action — regardless of the scheduled cadence." },
        { title: "Trigger Review: the six trigger types and when to use each", body: "The six trigger types are: Contract/relationship renewal, Periodic risk-tier cadence, New jurisdiction exposure, Escalation request, Allegation/whistleblowing, and Regulatory or enforcement action. Each type determines the scope, AI prompt configuration, and compliance gate rules applied to the review." },
        { title: "When to escalate to Enhanced Due Diligence (EDD)", body: "EDD is recommended when the trigger involves allegations, whistleblowing, or regulatory enforcement actions. The platform will prompt you with an EDD recommendation for these trigger types. EDD extends the research scope to 60-month adverse media, extended ownership analysis, and litigation searches." },
        { title: "The overdue review workflow", body: "When an entity passes its next review date without a completed review, it enters 'Overdue' status. An amber banner appears on the entity detail page. Each day without a completed review represents a gap in the documented compliance programme. Use the 'Trigger review now' button to initiate immediately." },
      ],
    },
    {
      title: "Compliance & GDPR",
      articles: [
        { title: "The LIA (Legitimate Interests Assessment) workflow", body: "Every case involving personal data processing requires a documented Legitimate Interests Assessment. The LIA workflow guides you through: identifying the legitimate interest, necessity testing, and balancing against data subject rights. Completed LIAs are versioned and linked to cases." },
        { title: "GDPR Article 5 data minimisation in practice", body: "The platform enforces data minimisation by requiring explicit confirmation that only necessary personal data is processed for each case. Data categories must be declared, and the minimisation confirmation is recorded in the audit trail." },
        { title: "The Data Protection tab on entity and case records", body: "The Data Protection tab shows the GDPR compliance status for the entity or case, including: lawful basis, data categories processed, LIA status, retention period, and any special category data flags." },
        { title: "DUAA 2025 — Article 22 and AI-assisted processing", body: "Under the Data Use and Access Act 2025, AI-assisted processing in due diligence must be documented with human oversight. The platform logs all AI outputs, human review decisions, and the specific model used, ensuring compliance with Article 22 requirements." },
        { title: "The Compliance Gate: what blocks a report from releasing", body: "The Compliance Gate applies automated rules before a report can be released. Blocking conditions include: allegation triggers without EDD scope, unaddressed allegation subject matter, Critical risk tier (requires Director sign-off), and scope insufficiency. Pending conditions include risk tier changes requiring analyst acknowledgement." },
      ],
    },
    {
      title: "Jurisdiction Intelligence",
      articles: [
        { title: "How the jurisdiction library works", body: "The Jurisdiction Library maintains risk profiles for every jurisdiction relevant to your entity register. Profiles include FATF status, CPI score, sanctions regime coverage, EU high-risk third country status, and the CR-JURIS-1.0 composite score." },
        { title: "CR-JURIS-1.0 scoring model explained", body: "CR-JURIS-1.0 is a composite jurisdiction risk scoring model that weights: FATF mutual evaluation outcomes, CPI score, sanctions programme coverage (OFAC, UKSL, EU FSF), EU AML high-risk third country listing, and governance indicators. The model produces a score from 0-100 with risk bands." },
        { title: "FATF, OFAC, EU FSF, UKSL — what each list means", body: "FATF maintains grey and black lists of jurisdictions with strategic AML/CFT deficiencies. OFAC is the US sanctions programme. EU FSF covers EU sanctions measures. UKSL is the UK Sanctions List. The platform ingests and cross-references all four datasets." },
        { title: "How jurisdiction risk affects entity risk tier", body: "An entity's jurisdiction exposure is a key input to its risk tier. If an entity operates in, is incorporated in, or has beneficial owners in high-risk jurisdictions, this elevates the overall risk assessment and may trigger a higher review cadence." },
      ],
    },
    {
      title: "Commercial & Programme",
      articles: [
        { title: "Quote-to-work-order (Q2WO) workflow", body: "The Q2WO workflow manages the commercial lifecycle of a case: scoping → quoting → client approval → work order creation. Managers can set price estimates, and clients approve or request changes before work begins." },
        { title: "Understanding client plan tiers and quotas", body: "Client plans define included entity counts, case quotas, and available enhancement modules. The platform tracks utilisation against plan limits and alerts when clients approach their quota." },
        { title: "Managing client renewals and upgrades", body: "Track client contract renewal dates, handle upgrade requests, and manage plan transitions through the Programme Settings and Commercial Dashboard." },
        { title: "The Programme ROI Dashboard", body: "The Programme ROI Dashboard shows clients the value of their assurance programme: risk coverage, review completion rates, jurisdiction exposure changes, and monitoring alert activity." },
      ],
    },
    {
      title: "Admin & Settings",
      articles: [
        { title: "User management and role permissions", body: "Manage team members and their role assignments through the Users & Roles page. Each role grants specific permissions. Changes to role assignments are logged in the audit trail." },
        { title: "Configuring review cadence policies", body: "Set the default review cadence for each risk tier through Programme Settings. Standard cadences are: Tier A — annual, Tier B — biennial, Tier C — triennial. Custom cadences can be configured per client." },
        { title: "Audit trail and export functions", body: "The Audit Log records every significant action on the platform with timestamp, user, action type, and affected record. Logs can be filtered, searched, and exported for regulatory reporting." },
      ],
    },
  ],
};

const CLIENT_HELP: PortalHelp = {
  assistantSubtitle: "Your guide to managing your assurance programme — commissioning reviews, reading reports, and staying compliant.",
  systemPrompt: `You are the Client Help Assistant for the Clifton Ruskin Assurance Portal. You assist compliance officers, COLPs, MLROs, and procurement managers in using the platform. You may discuss: how to commission a review, understanding report outputs, the entity register, monitoring alerts, the approvals workflow, plan and utilisation (quotas and overages), deliverables, the Programme ROI Dashboard, and general platform navigation. You must not discuss: CR internal operations, analyst workflow, AI agent pipeline internals, other clients' data, pricing negotiation, or anything outside the client's own programme. If asked about due diligence methodology or regulatory requirements, give a brief plain-English answer and suggest they speak to their CR account manager for detailed guidance. Keep answers clear, jargon-free, and action-oriented.`,
  sections: [
    {
      title: "Getting Started",
      articles: [
        { title: "Welcome to the Clifton Ruskin Assurance Portal", body: "The Clifton Ruskin Assurance Portal is your central hub for managing your due diligence and compliance programme. From here you can view your entities, commission reviews, track progress, receive monitoring alerts, and access your completed reports." },
        { title: "What your dashboard shows you", body: "Your dashboard provides an at-a-glance overview of your programme: active cases, pending approvals, recent deliverables, monitoring alerts, and key programme health indicators. Each tile links to the relevant section for more detail." },
        { title: "Understanding your assurance programme", body: "Your assurance programme is the structured approach to managing third-party and entity due diligence. It includes your entity register, review cadence policy, risk tier assignments, and monitoring configuration — all designed to meet your regulatory obligations." },
        { title: "Who to contact at Clifton Ruskin", body: "Your primary contact is your assigned CR Account Manager. For urgent matters, use the Support page or the contact details provided during onboarding. For platform questions, use this Help Centre or the AI Assistant above." },
      ],
    },
    {
      title: "Your Entity Register",
      articles: [
        { title: "What is the entity register?", body: "The entity register is your complete list of third parties, counterparties, and entities subject to your due diligence programme. Each entity has a profile including risk tier, jurisdiction exposure, review history, and current status." },
        { title: "Adding a new entity", body: "Click 'Add Entity' on the Entities page. Enter the entity name, type, and key details. You can also bulk-upload entities using a spreadsheet template. New entities will be assigned an initial risk tier based on available information." },
        { title: "Understanding risk tiers: what Tier A, B, and C mean", body: "Tier A entities are highest risk and receive the most thorough reviews on the shortest cadence. Tier B is standard risk with proportionate review depth. Tier C is lower risk with simplified reviews. Your risk tier policy determines which tier each entity falls into." },
        { title: "Viewing entity details and review history", body: "Click any entity to see its full profile: risk tier, jurisdiction exposure, review history, associated cases, monitoring status, and deliverables. The Review Cycle tab shows past and upcoming reviews." },
        { title: "What 'Overdue' means and what to do about it", body: "An entity marked 'Overdue' has passed its scheduled review date without a completed review. This represents a gap in your compliance programme. Click 'Trigger review now' on the entity page to commission an immediate review." },
      ],
    },
    {
      title: "Commissioning a Review",
      articles: [
        { title: "How to commission a new case (New Case button)", body: "Navigate to the entity you want reviewed and click 'New Case'. This creates a fresh engagement — typically for a new entity or a significant change in scope. Select the product type and any enhancement modules required." },
        { title: "How to trigger a review of an existing entity (Trigger Review)", body: "For existing entities, use 'Trigger Review' instead of 'New Case'. This creates a review linked to the entity's existing record and history. Select the appropriate trigger type to ensure the review is correctly scoped." },
        { title: "The six trigger types: when to use each one", body: "Contract/relationship renewal — use when renewing a commercial relationship. Periodic risk-tier cadence — use for scheduled reviews. New jurisdiction exposure — use when the entity expands into a new country. Escalation request — use to raise a specific concern. Allegation/whistleblowing — use when allegations arise. Regulatory or enforcement action — use when a regulatory event affects the entity." },
        { title: "When Enhanced Due Diligence is recommended", body: "The platform will recommend Enhanced Due Diligence (EDD) when you select 'Allegation / whistleblowing' or 'Regulatory or enforcement action' as your trigger type. EDD provides deeper research including extended adverse media searches and litigation checks." },
        { title: "Understanding the approvals workflow", body: "After commissioning, cases requiring approval (based on your organisation's settings) enter the approvals queue. Client Admins can approve, request changes, or reject. Approved cases proceed to the CR team for work." },
        { title: "Tracking the progress of a commissioned review", body: "Track your case from the Cases page or Dashboard. Status stages include: Submitted → Quoted → Approved → In Progress → QA Review → Completed → Delivered. You'll receive notifications at key milestones." },
      ],
    },
    {
      title: "Your Reports & Deliverables",
      articles: [
        { title: "Where to find your completed reports", body: "Completed reports appear on the Deliverables page and on the relevant entity's detail page. You can filter by date, entity, and report type." },
        { title: "How to read a Clifton Ruskin report", body: "CR reports follow a structured format: executive summary, risk assessment, key findings by research area, jurisdiction analysis, and recommendations. The risk conclusion uses a standardised tier system (Low/Medium/High/Critical)." },
        { title: "Downloading and sharing reports", body: "Download reports in PDF format from the Deliverables page. Reports can be shared with authorised colleagues within your organisation. Access is controlled by your organisation's user permissions." },
        { title: "Understanding risk conclusions and recommendations", body: "Risk conclusions reflect the assessed risk level based on available evidence. Recommendations suggest proportionate actions — such as enhanced monitoring, additional checks, or escalation. Conclusions are evidence-based, not opinions." },
      ],
    },
    {
      title: "Monitoring & Alerts",
      articles: [
        { title: "What the Monitoring feed shows", body: "The Monitoring feed displays real-time changes affecting your entities and their jurisdictions: sanctions list updates, FATF status changes, CPI score movements, and regulatory developments. Each alert links to the affected entity." },
        { title: "Understanding alert severity levels", body: "Alerts are categorised by type and impact. High-severity alerts (e.g., new sanctions listing) require immediate attention. Medium alerts (e.g., CPI score change) should be reviewed at the next opportunity. Low alerts are informational." },
        { title: "What to do when you receive a material-change alert", body: "When a material change is detected, review the alert details, assess whether it affects your risk assessment, and consider whether a triggered review is appropriate. Use the 'Trigger Review' function with the relevant trigger type." },
        { title: "Setting your review cadence policy", body: "Configure your default review cadence through Organisation Settings. Standard cadences are: Tier A — annual, Tier B — biennial, Tier C — triennial. Your CR Account Manager can help you set a cadence that meets your regulatory requirements." },
      ],
    },
    {
      title: "Plan & Utilisation",
      articles: [
        { title: "Understanding your plan tier and what is included", body: "Your plan tier determines the number of entities, cases, and enhancement modules included in your programme. View your current plan on the Budget & Spend page." },
        { title: "Entities and cases: what counts against your quota", body: "Each active (non-archived) entity counts against your entity quota. Each commissioned case counts against your case quota for the billing period. Enhancement modules count separately if they exceed your plan's included modules." },
        { title: "What happens when you approach your limit", body: "The platform displays utilisation warnings when you reach 80% and 90% of your quota. You can continue commissioning reviews beyond your quota — excess usage is billed as overage." },
        { title: "How to request a plan change", body: "Contact your CR Account Manager to discuss plan changes. You can also submit a request through the Support page. Plan changes take effect at the next billing cycle unless otherwise agreed." },
        { title: "Understanding overage charges", body: "Overage charges apply when usage exceeds your plan's included quota. Overages are billed at the per-unit rate specified in your agreement. View current overage on the Budget & Spend page." },
      ],
    },
    {
      title: "Compliance & Data Protection",
      articles: [
        { title: "What is a Legitimate Interests Assessment (LIA)?", body: "A LIA documents the legal basis for processing personal data during a due diligence review. It balances the legitimate interest in conducting the review against the data subject's privacy rights. CR completes a LIA for each case involving personal data." },
        { title: "Why Clifton Ruskin documents lawful basis per case", body: "Under UK GDPR, every instance of personal data processing requires a documented lawful basis. CR records the lawful basis (typically 'legitimate interests') for each case, along with the necessity assessment and balancing test, to ensure your programme is fully documented." },
        { title: "Your data protection obligations as a controller", body: "As the organisation commissioning due diligence, you are the data controller. Your obligations include: ensuring a lawful basis exists, maintaining records of processing, responding to data subject requests, and ensuring proportionate data handling." },
        { title: "GDPR and your due diligence programme", body: "Your due diligence programme processes personal data about third-party individuals (directors, beneficial owners, etc.). The platform helps you document compliance through: per-case LIAs, data category tracking, retention management, and audit trails." },
      ],
    },
  ],
};

const PARTNER_HELP: PortalHelp = {
  assistantSubtitle: "Help with your information submission and understanding the due diligence process.",
  systemPrompt: `You are the Third-Party Help Assistant for the Clifton Ruskin Assurance Portal. You assist companies and individuals who have been invited to submit information as part of a due diligence review. You may only discuss: how to complete an information submission, what documents are typically requested, how the submission process works, what happens after submission, and general questions about the portal login and navigation. You must never discuss: the requesting client's identity, the specific reasons for the due diligence review, case findings, risk assessments, other third parties, or any internal CR or client information. Keep answers reassuring, clear, and focused on helping the user complete their submission. If asked anything outside your permitted scope, respond: 'For questions about the due diligence process or the requesting organisation, please contact the team who invited you directly.'`,
  sections: [
    {
      title: "Getting Started",
      articles: [
        { title: "Why have I been invited to this portal?", body: "You have been invited because an organisation is conducting a standard due diligence review and needs to verify certain information about your company or yourself. This is a routine process — many organisations are required to conduct these reviews as part of their regulatory obligations." },
        { title: "What is Clifton Ruskin?", body: "Clifton Ruskin is a professional assurance firm that conducts due diligence reviews on behalf of regulated organisations. We have been engaged to carry out a review that involves your organisation, and this portal allows you to submit the requested information securely." },
        { title: "Is this portal secure? How is my data protected?", body: "Yes. The portal uses encryption in transit and at rest. Your data is stored securely and is only accessible to authorised personnel involved in your review. Clifton Ruskin operates under strict data protection policies compliant with UK GDPR." },
        { title: "How to log in and navigate the portal", body: "Use the credentials provided in your invitation email. After logging in, you'll see your task list showing what information has been requested. Click each task to view the requirements and upload your documents." },
      ],
    },
    {
      title: "Completing Your Submission",
      articles: [
        { title: "What information will I be asked to provide?", body: "Typical requests include: corporate registration documents, identification for key individuals, proof of address, ownership structure details, and financial statements. The specific requirements depend on the scope of the review and will be listed in your task." },
        { title: "What documents are typically required?", body: "Common documents include: certificate of incorporation, articles of association, register of directors and shareholders, passport copies for key individuals, utility bills or bank statements for address verification, and recent financial statements." },
        { title: "How to upload documents securely", body: "Click the upload area within each task to select files from your device. Supported formats include PDF, JPG, PNG, and common document formats. Maximum file size is 25MB per file. All uploads are encrypted." },
        { title: "Saving your progress and returning later", body: "Your progress is saved automatically. You can close the portal and return at any time using the same login credentials. Your uploaded documents and any entered information will be preserved." },
        { title: "Submitting your completed information pack", body: "Once you have completed all required fields and uploaded all requested documents, click the 'Submit' button on your task. You will receive a confirmation. After submission, the review team will assess your information." },
      ],
    },
    {
      title: "After Submission",
      articles: [
        { title: "What happens after I submit my information?", body: "After submission, the review team will assess the information you have provided. If everything is in order, no further action will be needed from you. You may be contacted if additional information or clarification is required." },
        { title: "How long does the process take?", body: "Processing times vary depending on the scope of the review. Most reviews are completed within a few weeks. You will be notified if the team needs anything further from you." },
        { title: "Will I be asked for additional information?", body: "In some cases, the review team may need to request additional documents or clarification. If so, a new task will appear in your portal and you will be notified by email." },
        { title: "How do I update information I have already submitted?", body: "If you need to update previously submitted information, contact the team who invited you. They can reopen your task to allow you to upload updated documents." },
      ],
    },
    {
      title: "Privacy & Data",
      articles: [
        { title: "How is my information used?", body: "Your information is used solely for the purpose of the due diligence review. It is not shared with third parties beyond the organisation that commissioned the review, and it is not used for marketing or any other purpose." },
        { title: "Who can see what I submit?", body: "Your submitted information is accessible only to the Clifton Ruskin review team handling your case and the organisation that commissioned the review. Access is controlled by strict role-based permissions." },
        { title: "How long is my data retained?", body: "Data retention periods are determined by the regulatory requirements applicable to the commissioning organisation. Typical retention is 5-7 years from the completion of the review. After the retention period, data is securely deleted." },
        { title: "How to make a data subject access request", body: "You have the right to request a copy of the personal data held about you. To make a data subject access request, contact Clifton Ruskin's data protection team using the contact details provided in your invitation email." },
      ],
    },
    {
      title: "Technical Help",
      articles: [
        { title: "Problems logging in", body: "If you cannot log in, check that you are using the email address to which your invitation was sent. Use the 'Reset password' link if needed. If problems persist, contact the team who invited you for assistance." },
        { title: "Upload errors and file size limits", body: "Maximum file size is 25MB per file. If you encounter upload errors, try a smaller file or a different format (PDF is recommended). Ensure your internet connection is stable during upload." },
        { title: "Supported file formats", body: "Supported formats include: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, and TIF. PDF is the preferred format for official documents." },
        { title: "Contact and support", body: "For technical issues with the portal, contact the team who invited you. They can escalate to the Clifton Ruskin support team if needed. Include a description of the issue and any error messages you see." },
      ],
    },
  ],
};

/* ────── Component ────── */

function usePortalContext(): "internal" | "client" | "partner" {
  const { isPartner, isInternal } = useAuth();
  try {
    // ViewModeContext is only available inside AppLayout
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { activeView } = useViewMode();
    return isPartner ? "partner" : activeView;
  } catch {
    return isPartner ? "partner" : isInternal ? "internal" : "client";
  }
}

export default function HelpCentrePage() {
  const portalContext = usePortalContext();

  const helpContent = portalContext === "internal" ? INTERNAL_HELP : portalContext === "partner" ? PARTNER_HELP : CLIENT_HELP;

  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Filter sections/articles by search
  const filteredSections = useMemo(() => {
    if (!search.trim()) return helpContent.sections;
    const q = search.toLowerCase();
    return helpContent.sections
      .map((section) => ({
        ...section,
        articles: section.articles.filter(
          (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.articles.length > 0);
  }, [search, helpContent.sections]);

  const handleAskAssistant = async () => {
    if (!question.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-assurance-assistant", {
        body: {
          help_centre: true,
          portalContext,
          systemPromptOverride: helpContent.systemPrompt,
          question: question.trim(),
        },
      });
      if (error) throw error;
      setAiResponse(data?.answer || data?.analysis?.executive_summary || "I wasn't able to generate a response. Please try rephrasing your question.");
    } catch (err: any) {
      setAiResponse("Sorry, the assistant is currently unavailable. Please try again shortly.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/15 border border-accent/30 mx-auto">
          <LifeBuoy className="text-accent" size={28} />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Help Centre</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">A plain-English guide to every part of the platform</p>
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help..."
            className="pl-9"
          />
        </div>
      </div>

      {/* AI Assistant Panel */}
      <Card className="border-accent/30 bg-card">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <Bot className="text-accent" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Ask the CR Assistant</h2>
              <p className="text-xs text-muted-foreground">{helpContent.assistantSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the platform..."
              className="min-h-[60px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAssistant();
                }
              }}
            />
            <Button
              onClick={handleAskAssistant}
              disabled={!question.trim() || aiLoading}
              size="icon"
              className="shrink-0 h-[60px] w-10 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
          {aiResponse && (
            <div className="rounded-md bg-muted/50 border border-border p-4 text-sm text-foreground whitespace-pre-wrap">
              {aiResponse}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No articles match your search. Try different keywords or ask the AI Assistant above.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section, sIdx) => (
            <Card key={section.title}>
              <CardContent className="pt-5 pb-2">
                <h3 className="text-sm font-semibold text-foreground mb-2">{section.title}</h3>
                <Accordion type="multiple">
                  {section.articles.map((article, aIdx) => (
                    <AccordionItem key={aIdx} value={`${sIdx}-${aIdx}`} className="border-border/50">
                      <AccordionTrigger className="text-[13px] font-medium text-foreground/80 hover:text-foreground py-3 hover:no-underline">
                        {article.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed">
                        {article.body}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
