export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_output_log: {
        Row: {
          ai_disclaimer: string
          case_id: string
          created_at: string
          created_by: string | null
          function_name: string
          guardrail_replacements: Json
          guardrail_violations_found: number
          human_reviewed: boolean
          human_reviewed_at: string | null
          human_reviewed_by: string | null
          id: string
          model_used: string
          org_id: string
          raw_output: Json
          report_version: number | null
          sanitised_output: Json
        }
        Insert: {
          ai_disclaimer?: string
          case_id: string
          created_at?: string
          created_by?: string | null
          function_name: string
          guardrail_replacements?: Json
          guardrail_violations_found?: number
          human_reviewed?: boolean
          human_reviewed_at?: string | null
          human_reviewed_by?: string | null
          id?: string
          model_used?: string
          org_id: string
          raw_output?: Json
          report_version?: number | null
          sanitised_output?: Json
        }
        Update: {
          ai_disclaimer?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          function_name?: string
          guardrail_replacements?: Json
          guardrail_violations_found?: number
          human_reviewed?: boolean
          human_reviewed_at?: string | null
          human_reviewed_by?: string | null
          id?: string
          model_used?: string
          org_id?: string
          raw_output?: Json
          report_version?: number | null
          sanitised_output?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_output_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_output_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_event: {
        Row: {
          alert_type: Database["public"]["Enums"]["client_alert_type"]
          created_at: string
          details_json: Json | null
          detected_at: string
          effective_date: string | null
          id: string
          indicator_change_id: string | null
          jurisdiction_id: string
          source_url: string | null
          summary: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["client_alert_type"]
          created_at?: string
          details_json?: Json | null
          detected_at?: string
          effective_date?: string | null
          id?: string
          indicator_change_id?: string | null
          jurisdiction_id: string
          source_url?: string | null
          summary: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["client_alert_type"]
          created_at?: string
          details_json?: Json | null
          detected_at?: string
          effective_date?: string | null
          id?: string
          indicator_change_id?: string | null
          jurisdiction_id?: string
          source_url?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_event_indicator_change_id_fkey"
            columns: ["indicator_change_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction_indicator_change"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_event_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notification: {
        Row: {
          alert_event_id: string
          created_at: string
          id: string
          is_read: boolean
          org_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          alert_event_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          org_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          alert_event_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          org_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notification_alert_event_id_fkey"
            columns: ["alert_event_id"]
            isOneToOne: false
            referencedRelation: "alert_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notification_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_subscription: {
        Row: {
          alert_type: Database["public"]["Enums"]["client_alert_type"]
          all_linked_jurisdictions: boolean
          created_at: string
          enabled: boolean
          id: string
          jurisdiction_id: string | null
          org_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["client_alert_type"]
          all_linked_jurisdictions?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          jurisdiction_id?: string | null
          org_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["client_alert_type"]
          all_linked_jurisdictions?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          jurisdiction_id?: string | null
          org_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_subscription_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_subscription_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      all_stations_notices: {
        Row: {
          body: string
          case_id: string
          created_at: string
          id: string
          org_id: string
          sender_user_id: string
          subject: string
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          id?: string
          org_id: string
          sender_user_id: string
          subject: string
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          org_id?: string
          sender_user_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "all_stations_notices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_time_entries: {
        Row: {
          bucket: string
          case_id: string
          created_at: string
          entry_date: string
          id: string
          minutes: number
          note: string | null
          officer_id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          bucket: string
          case_id: string
          created_at?: string
          entry_date?: string
          id?: string
          minutes: number
          note?: string | null
          officer_id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          case_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          minutes?: number
          note?: string | null
          officer_id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyst_time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyst_time_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          object_id: string | null
          object_type: string
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id?: string | null
          object_type: string
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id?: string | null
          object_type?: string
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_approval_rules: {
        Row: {
          always_require_dossier: boolean
          always_require_dp_high: boolean
          always_require_partner_spend: boolean
          always_require_rush: boolean
          always_require_tier_a: boolean
          auto_approve_refresh_up_to: number | null
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          always_require_dossier?: boolean
          always_require_dp_high?: boolean
          always_require_partner_spend?: boolean
          always_require_rush?: boolean
          always_require_tier_a?: boolean
          auto_approve_refresh_up_to?: number | null
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          always_require_dossier?: boolean
          always_require_dp_high?: boolean
          always_require_partner_spend?: boolean
          always_require_rush?: boolean
          always_require_tier_a?: boolean
          auto_approve_refresh_up_to?: number | null
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_approval_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          case_id: string | null
          created_at: string
          entity_id: string | null
          event_type: string
          feature_key: string
          id: string
          metadata: Json | null
          org_id: string
          performed_by: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_type: string
          feature_key: string
          id?: string
          metadata?: Json | null
          org_id: string
          performed_by?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_type?: string
          feature_key?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_overrides: {
        Row: {
          budget_id: string
          case_id: string | null
          created_at: string
          id: string
          justification: string
          override_amount: number
          override_by: string
        }
        Insert: {
          budget_id: string
          case_id?: string | null
          created_at?: string
          id?: string
          justification: string
          override_amount?: number
          override_by: string
        }
        Update: {
          budget_id?: string
          case_id?: string | null
          created_at?: string
          id?: string
          justification?: string
          override_amount?: number
          override_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_overrides_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "programme_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_overrides_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_dp_declarations: {
        Row: {
          approval_reasons: Json | null
          case_id: string
          created_at: string
          data_categories: Json | null
          id: string
          master_lia_id: string | null
          minimisation_confirmed: boolean
          org_id: string
          purpose: string
          requires_approval: boolean
          retention_months: number | null
          sensitive_criminal_offence: boolean
          sensitive_special_category: boolean
        }
        Insert: {
          approval_reasons?: Json | null
          case_id: string
          created_at?: string
          data_categories?: Json | null
          id?: string
          master_lia_id?: string | null
          minimisation_confirmed?: boolean
          org_id: string
          purpose?: string
          requires_approval?: boolean
          retention_months?: number | null
          sensitive_criminal_offence?: boolean
          sensitive_special_category?: boolean
        }
        Update: {
          approval_reasons?: Json | null
          case_id?: string
          created_at?: string
          data_categories?: Json | null
          id?: string
          master_lia_id?: string | null
          minimisation_confirmed?: boolean
          org_id?: string
          purpose?: string
          requires_approval?: boolean
          retention_months?: number | null
          sensitive_criminal_offence?: boolean
          sensitive_special_category?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_dp_declarations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_dp_declarations_master_lia_id_fkey"
            columns: ["master_lia_id"]
            isOneToOne: false
            referencedRelation: "master_lia_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_dp_declarations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          attachments: Json | null
          case_id: string
          channel: string
          created_at: string
          id: string
          message: string
          sender_user_id: string
        }
        Insert: {
          attachments?: Json | null
          case_id: string
          channel?: string
          created_at?: string
          id?: string
          message: string
          sender_user_id: string
        }
        Update: {
          attachments?: Json | null
          case_id?: string
          channel?: string
          created_at?: string
          id?: string
          message?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_modules: {
        Row: {
          approved_by: string | null
          case_id: string
          created_at: string
          id: string
          module_type_id: string
          price_estimate: number | null
          requested_by: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          case_id: string
          created_at?: string
          id?: string
          module_type_id: string
          price_estimate?: number | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          case_id?: string
          created_at?: string
          id?: string
          module_type_id?: string
          price_estimate?: number | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_modules_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_modules_module_type_id_fkey"
            columns: ["module_type_id"]
            isOneToOne: false
            referencedRelation: "module_types"
            referencedColumns: ["id"]
          },
        ]
      }
      case_tasks: {
        Row: {
          attachments: Json | null
          case_id: string
          created_at: string
          created_by: string | null
          dependencies: string[] | null
          description: string | null
          due_date: string | null
          id: string
          linked_retrieval_logs: string[] | null
          owner_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          case_id: string
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_retrieval_logs?: string[] | null
          owner_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_retrieval_logs?: string[] | null
          owner_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          active_lia_id: string | null
          approved_by: string | null
          assigned_to: string | null
          case_type: string
          created_at: string
          data_categories: Json | null
          dp_review_required: boolean
          dp_risk_level: string | null
          due_date: string | null
          entity_id: string
          id: string
          internal_notes: string | null
          lawful_basis: string | null
          lia_summary: string | null
          minimisation_confirmed: boolean
          org_id: string
          price_estimate: number | null
          priority: string
          processing_purpose: string | null
          processing_purpose_detail: string | null
          product_type: string
          qa_owner: string | null
          report_tier: string
          requested_by: string | null
          requires_personal_data: boolean
          retention_months: number | null
          scope_change_flag: boolean
          scope_change_resolved: boolean
          scope_notes: string | null
          sla_days: number | null
          status: string
          structured_source_log: Json | null
        }
        Insert: {
          active_lia_id?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          case_type?: string
          created_at?: string
          data_categories?: Json | null
          dp_review_required?: boolean
          dp_risk_level?: string | null
          due_date?: string | null
          entity_id: string
          id?: string
          internal_notes?: string | null
          lawful_basis?: string | null
          lia_summary?: string | null
          minimisation_confirmed?: boolean
          org_id: string
          price_estimate?: number | null
          priority?: string
          processing_purpose?: string | null
          processing_purpose_detail?: string | null
          product_type?: string
          qa_owner?: string | null
          report_tier?: string
          requested_by?: string | null
          requires_personal_data?: boolean
          retention_months?: number | null
          scope_change_flag?: boolean
          scope_change_resolved?: boolean
          scope_notes?: string | null
          sla_days?: number | null
          status?: string
          structured_source_log?: Json | null
        }
        Update: {
          active_lia_id?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          case_type?: string
          created_at?: string
          data_categories?: Json | null
          dp_review_required?: boolean
          dp_risk_level?: string | null
          due_date?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          lawful_basis?: string | null
          lia_summary?: string | null
          minimisation_confirmed?: boolean
          org_id?: string
          price_estimate?: number | null
          priority?: string
          processing_purpose?: string | null
          processing_purpose_detail?: string | null
          product_type?: string
          qa_owner?: string | null
          report_tier?: string
          requested_by?: string | null
          requires_personal_data?: boolean
          retention_months?: number | null
          scope_change_flag?: boolean
          scope_change_resolved?: boolean
          scope_notes?: string | null
          sla_days?: number | null
          status?: string
          structured_source_log?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_active_lia_id_fkey"
            columns: ["active_lia_id"]
            isOneToOne: false
            referencedRelation: "master_lia_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_logs: {
        Row: {
          case_id: string | null
          confidence_level: string
          created_at: string
          entity_id: string
          id: string
          recommended_action: string | null
          summary: string
          what_changed: string | null
          why_it_matters: string | null
        }
        Insert: {
          case_id?: string | null
          confidence_level?: string
          created_at?: string
          entity_id: string
          id?: string
          recommended_action?: string | null
          summary: string
          what_changed?: string | null
          why_it_matters?: string | null
        }
        Update: {
          case_id?: string | null
          confidence_level?: string
          created_at?: string
          entity_id?: string
          id?: string
          recommended_action?: string | null
          summary?: string
          what_changed?: string | null
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_logs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      client_policy_outcome: {
        Row: {
          case_id: string | null
          computed_at: string
          engine_version: string
          entity_id: string | null
          id: string
          org_id: string
          outcome_json: Json
          ruleset_id: string
        }
        Insert: {
          case_id?: string | null
          computed_at?: string
          engine_version?: string
          entity_id?: string | null
          id?: string
          org_id: string
          outcome_json?: Json
          ruleset_id: string
        }
        Update: {
          case_id?: string | null
          computed_at?: string
          engine_version?: string
          entity_id?: string | null
          id?: string
          org_id?: string
          outcome_json?: Json
          ruleset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_policy_outcome_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_policy_outcome_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_policy_outcome_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_policy_outcome_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "client_policy_ruleset"
            referencedColumns: ["id"]
          },
        ]
      }
      client_policy_rule: {
        Row: {
          compare_value_json: Json
          created_at: string
          id: string
          if_indicator_type: string
          notes: string | null
          operator: Database["public"]["Enums"]["policy_operator"]
          priority: number
          ruleset_id: string
          then_outcome_json: Json
        }
        Insert: {
          compare_value_json?: Json
          created_at?: string
          id?: string
          if_indicator_type: string
          notes?: string | null
          operator?: Database["public"]["Enums"]["policy_operator"]
          priority?: number
          ruleset_id: string
          then_outcome_json?: Json
        }
        Update: {
          compare_value_json?: Json
          created_at?: string
          id?: string
          if_indicator_type?: string
          notes?: string | null
          operator?: Database["public"]["Enums"]["policy_operator"]
          priority?: number
          ruleset_id?: string
          then_outcome_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_policy_rule_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "client_policy_ruleset"
            referencedColumns: ["id"]
          },
        ]
      }
      client_policy_ruleset: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          org_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          org_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_policy_ruleset_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_posture_inputs: {
        Row: {
          attachment_url: string | null
          case_module_id: string
          confidence: string
          created_at: string
          id: string
          is_anonymised: boolean
          note_text: string | null
          reference_type: string
          source_category: string
        }
        Insert: {
          attachment_url?: string | null
          case_module_id: string
          confidence?: string
          created_at?: string
          id?: string
          is_anonymised?: boolean
          note_text?: string | null
          reference_type: string
          source_category?: string
        }
        Update: {
          attachment_url?: string | null
          case_module_id?: string
          confidence?: string
          created_at?: string
          id?: string
          is_anonymised?: boolean
          note_text?: string | null
          reference_type?: string
          source_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_posture_inputs_case_module_id_fkey"
            columns: ["case_module_id"]
            isOneToOne: false
            referencedRelation: "case_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      data_protection_reviews: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          reviewer_user_id: string | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_user_id?: string | null
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_protection_reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source: {
        Row: {
          base_url: string | null
          created_at: string
          description: string | null
          expected_format: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          name: string
          refresh_cadence: string
          source_type: string
          urls: string[]
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          description?: string | null
          expected_format?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          refresh_cadence?: string
          source_type?: string
          urls?: string[]
        }
        Update: {
          base_url?: string | null
          created_at?: string
          description?: string | null
          expected_format?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          refresh_cadence?: string
          source_type?: string
          urls?: string[]
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          case_id: string
          created_at: string
          deliverable_type: string
          expunged: boolean
          expunged_at: string | null
          expunged_by: string | null
          file_url: string | null
          id: string
          title: string
          version: number
        }
        Insert: {
          case_id: string
          created_at?: string
          deliverable_type: string
          expunged?: boolean
          expunged_at?: string | null
          expunged_by?: string | null
          file_url?: string | null
          id?: string
          title: string
          version?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          deliverable_type?: string
          expunged?: boolean
          expunged_at?: string | null
          expunged_by?: string | null
          file_url?: string | null
          id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          business_unit: string | null
          contract_renewal_date: string | null
          country: string | null
          created_at: string
          criticality: string
          data_access_level: string | null
          entity_type: string
          has_master_conflict: boolean
          head_office_address_line1: string | null
          head_office_address_line2: string | null
          head_office_city: string | null
          head_office_country: string | null
          head_office_postcode: string | null
          head_office_region: string | null
          hq_country_code: string | null
          hq_country_name: string | null
          hq_lat: number | null
          hq_lng: number | null
          id: string
          incorporation_country_code: string | null
          incorporation_country_name: string | null
          internal_contacts: Json | null
          last_review_date: string | null
          master_entity_id: string | null
          name: string
          next_review_date: string | null
          onboarded_date: string | null
          org_id: string
          owner_user_id: string | null
          payment_terms: string | null
          poc_email: string | null
          poc_name: string | null
          poc_phone: string | null
          registered_address_line1: string | null
          registered_address_line2: string | null
          registered_city: string | null
          registered_country: string | null
          registered_lat: number | null
          registered_lng: number | null
          registered_postcode: string | null
          registered_region: string | null
          registration_number: string | null
          risk_tier: string
          service_provided: string | null
          status: string
          website: string | null
        }
        Insert: {
          business_unit?: string | null
          contract_renewal_date?: string | null
          country?: string | null
          created_at?: string
          criticality?: string
          data_access_level?: string | null
          entity_type?: string
          has_master_conflict?: boolean
          head_office_address_line1?: string | null
          head_office_address_line2?: string | null
          head_office_city?: string | null
          head_office_country?: string | null
          head_office_postcode?: string | null
          head_office_region?: string | null
          hq_country_code?: string | null
          hq_country_name?: string | null
          hq_lat?: number | null
          hq_lng?: number | null
          id?: string
          incorporation_country_code?: string | null
          incorporation_country_name?: string | null
          internal_contacts?: Json | null
          last_review_date?: string | null
          master_entity_id?: string | null
          name: string
          next_review_date?: string | null
          onboarded_date?: string | null
          org_id: string
          owner_user_id?: string | null
          payment_terms?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          registered_address_line1?: string | null
          registered_address_line2?: string | null
          registered_city?: string | null
          registered_country?: string | null
          registered_lat?: number | null
          registered_lng?: number | null
          registered_postcode?: string | null
          registered_region?: string | null
          registration_number?: string | null
          risk_tier?: string
          service_provided?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          business_unit?: string | null
          contract_renewal_date?: string | null
          country?: string | null
          created_at?: string
          criticality?: string
          data_access_level?: string | null
          entity_type?: string
          has_master_conflict?: boolean
          head_office_address_line1?: string | null
          head_office_address_line2?: string | null
          head_office_city?: string | null
          head_office_country?: string | null
          head_office_postcode?: string | null
          head_office_region?: string | null
          hq_country_code?: string | null
          hq_country_name?: string | null
          hq_lat?: number | null
          hq_lng?: number | null
          id?: string
          incorporation_country_code?: string | null
          incorporation_country_name?: string | null
          internal_contacts?: Json | null
          last_review_date?: string | null
          master_entity_id?: string | null
          name?: string
          next_review_date?: string | null
          onboarded_date?: string | null
          org_id?: string
          owner_user_id?: string | null
          payment_terms?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          registered_address_line1?: string | null
          registered_address_line2?: string | null
          registered_city?: string | null
          registered_country?: string | null
          registered_lat?: number | null
          registered_lng?: number | null
          registered_postcode?: string | null
          registered_region?: string | null
          registration_number?: string | null
          risk_tier?: string
          service_provided?: string | null
          status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_master_entity_id_fkey"
            columns: ["master_entity_id"]
            isOneToOne: false
            referencedRelation: "master_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_change_log: {
        Row: {
          changed_by: string
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_change_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_import_logs: {
        Row: {
          created_at: string
          created_count: number
          error_count: number
          error_details: Json | null
          file_name: string
          id: string
          org_id: string
          skipped_count: number
          total_rows: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          created_count?: number
          error_count?: number
          error_details?: Json | null
          file_name: string
          id?: string
          org_id: string
          skipped_count?: number
          total_rows?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          created_count?: number
          error_count?: number
          error_details?: Json | null
          file_name?: string
          id?: string
          org_id?: string
          skipped_count?: number
          total_rows?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_import_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_operating_countries: {
        Row: {
          added_by: string | null
          confidence: string
          country_code: string
          country_name: string
          created_at: string
          entity_id: string
          id: string
          source: string
        }
        Insert: {
          added_by?: string | null
          confidence?: string
          country_code: string
          country_name: string
          created_at?: string
          entity_id: string
          id?: string
          source?: string
        }
        Update: {
          added_by?: string | null
          confidence?: string
          country_code?: string
          country_name?: string
          created_at?: string
          entity_id?: string
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_operating_countries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          confidence_level: string
          created_at: string
          effective_from_date: string | null
          effective_to_date: string | null
          id: string
          last_verified_date: string | null
          percentage: number | null
          relationship_type: string
          source_entity_id: string
          source_reference: string | null
          target_entity_id: string
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          effective_from_date?: string | null
          effective_to_date?: string | null
          id?: string
          last_verified_date?: string | null
          percentage?: number | null
          relationship_type?: string
          source_entity_id: string
          source_reference?: string | null
          target_entity_id: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          effective_from_date?: string | null
          effective_to_date?: string | null
          id?: string
          last_verified_date?: string | null
          percentage?: number | null
          relationship_type?: string
          source_entity_id?: string
          source_reference?: string | null
          target_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_risk_scores: {
        Row: {
          association_score: number
          calculated_at: string
          calculated_by: string | null
          confidence: string
          entity_id: string
          event_score: number
          id: string
          jurisdiction_score: number
          model_version: string
          overall_score: number
          reason_codes: Json
          risk_band: string
          structural_score: number
        }
        Insert: {
          association_score?: number
          calculated_at?: string
          calculated_by?: string | null
          confidence?: string
          entity_id: string
          event_score?: number
          id?: string
          jurisdiction_score?: number
          model_version?: string
          overall_score?: number
          reason_codes?: Json
          risk_band?: string
          structural_score?: number
        }
        Update: {
          association_score?: number
          calculated_at?: string
          calculated_by?: string | null
          confidence?: string
          entity_id?: string
          event_score?: number
          id?: string
          jurisdiction_score?: number
          model_version?: string
          overall_score?: number
          reason_codes?: Json
          risk_band?: string
          structural_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_risk_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      expunge_log: {
        Row: {
          case_id: string
          created_at: string
          deliverable_id: string
          deliverable_title: string | null
          entity_name: string | null
          expunged_by: string
          id: string
          org_id: string
          reason: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          deliverable_id: string
          deliverable_title?: string | null
          entity_name?: string | null
          expunged_by: string
          id?: string
          org_id: string
          reason?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          deliverable_id?: string
          deliverable_title?: string | null
          entity_name?: string | null
          expunged_by?: string
          id?: string
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expunge_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expunge_log_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expunge_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_activation_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          feature_key: string
          id: string
          new_value: boolean | null
          org_id: string
          previous_value: boolean | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          feature_key: string
          id?: string
          new_value?: boolean | null
          org_id: string
          previous_value?: boolean | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          new_value?: boolean | null
          org_id?: string
          previous_value?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_activation_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_error: {
        Row: {
          created_at: string
          error_detail: Json | null
          error_message: string
          id: string
          ingestion_run_id: string
        }
        Insert: {
          created_at?: string
          error_detail?: Json | null
          error_message: string
          id?: string
          ingestion_run_id: string
        }
        Update: {
          created_at?: string
          error_detail?: Json | null
          error_message?: string
          id?: string
          ingestion_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_error_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_run"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_run: {
        Row: {
          data_source_id: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          records_changed: number
          records_processed: number
          started_at: string
          status: string
        }
        Insert: {
          data_source_id?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          records_changed?: number
          records_processed?: number
          started_at?: string
          status?: string
        }
        Update: {
          data_source_id?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          records_changed?: number
          records_processed?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_run_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_source"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          last_refreshed_at: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jurisdiction_alert_subscriptions: {
        Row: {
          channel: string
          created_at: string
          id: string
          indicator_types: string[] | null
          is_active: boolean
          jurisdiction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          indicator_types?: string[] | null
          is_active?: boolean
          jurisdiction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          indicator_types?: string[] | null
          is_active?: boolean
          jurisdiction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_alert_subscriptions_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_alerts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          indicator_change_id: string | null
          indicator_type: string | null
          is_read: boolean
          jurisdiction_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          indicator_change_id?: string | null
          indicator_type?: string | null
          is_read?: boolean
          jurisdiction_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          indicator_change_id?: string | null
          indicator_type?: string | null
          is_read?: boolean
          jurisdiction_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_alerts_indicator_change_id_fkey"
            columns: ["indicator_change_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction_indicator_change"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisdiction_alerts_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_alias: {
        Row: {
          alias_name: string
          created_at: string
          id: string
          jurisdiction_id: string
          source_name: string
        }
        Insert: {
          alias_name: string
          created_at?: string
          id?: string
          jurisdiction_id: string
          source_name?: string
        }
        Update: {
          alias_name?: string
          created_at?: string
          id?: string
          jurisdiction_id?: string
          source_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_alias_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_benchmark_inputs: {
        Row: {
          abnormal_patterns: string | null
          case_module_id: string
          confidence: string
          created_at: string
          enforcement_reality_notes: string | null
          id: string
          indices_used: Json | null
          jurisdiction_country: string
          normal_patterns: string | null
          practical_guidance: string | null
          sector: string | null
        }
        Insert: {
          abnormal_patterns?: string | null
          case_module_id: string
          confidence?: string
          created_at?: string
          enforcement_reality_notes?: string | null
          id?: string
          indices_used?: Json | null
          jurisdiction_country: string
          normal_patterns?: string | null
          practical_guidance?: string | null
          sector?: string | null
        }
        Update: {
          abnormal_patterns?: string | null
          case_module_id?: string
          confidence?: string
          created_at?: string
          enforcement_reality_notes?: string | null
          id?: string
          indices_used?: Json | null
          jurisdiction_country?: string
          normal_patterns?: string | null
          practical_guidance?: string | null
          sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_benchmark_inputs_case_module_id_fkey"
            columns: ["case_module_id"]
            isOneToOne: false
            referencedRelation: "case_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_indicator: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id: string | null
          jurisdiction_id: string
          retrieved_at: string
          source_name: string
          source_snapshot_hash: string | null
          source_url: string | null
          updated_at: string
          value_json: Json
        }
        Insert: {
          created_at?: string
          effective_date: string
          id?: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id?: string | null
          jurisdiction_id: string
          retrieved_at?: string
          source_name: string
          source_snapshot_hash?: string | null
          source_url?: string | null
          updated_at?: string
          value_json?: Json
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          indicator_type?: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id?: string | null
          jurisdiction_id?: string
          retrieved_at?: string
          source_name?: string
          source_snapshot_hash?: string | null
          source_url?: string | null
          updated_at?: string
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_indicator_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisdiction_indicator_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_indicator_change: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          detected_at: string
          id: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id: string | null
          jurisdiction_id: string
          jurisdiction_indicator_id: string
          new_effective_date: string
          new_value_json: Json
          old_effective_date: string | null
          old_value_json: Json | null
          source_name: string
          source_snapshot_hash: string | null
          source_url: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          id?: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id?: string | null
          jurisdiction_id: string
          jurisdiction_indicator_id: string
          new_effective_date: string
          new_value_json: Json
          old_effective_date?: string | null
          old_value_json?: Json | null
          source_name: string
          source_snapshot_hash?: string | null
          source_url?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string
          id?: string
          indicator_type?: Database["public"]["Enums"]["indicator_type"]
          ingestion_run_id?: string | null
          jurisdiction_id?: string
          jurisdiction_indicator_id?: string
          new_effective_date?: string
          new_value_json?: Json
          old_effective_date?: string | null
          old_value_json?: Json | null
          source_name?: string
          source_snapshot_hash?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_indicator_change_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisdiction_indicator_change_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jurisdiction_indicator_change_jurisdiction_indicator_id_fkey"
            columns: ["jurisdiction_indicator_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction_indicator"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_profiles: {
        Row: {
          beneficial_ownership_transparency_level: string | null
          country_code: string
          country_name: string
          created_at: string
          created_by: string | null
          enforcement_environment_notes: string | null
          id: string
          incorporation_regime_summary: string | null
          public_registry_depth: string | null
          sanctions_exposure_notes: string | null
          source_availability_notes: string | null
          updated_at: string
        }
        Insert: {
          beneficial_ownership_transparency_level?: string | null
          country_code: string
          country_name: string
          created_at?: string
          created_by?: string | null
          enforcement_environment_notes?: string | null
          id?: string
          incorporation_regime_summary?: string | null
          public_registry_depth?: string | null
          sanctions_exposure_notes?: string | null
          source_availability_notes?: string | null
          updated_at?: string
        }
        Update: {
          beneficial_ownership_transparency_level?: string | null
          country_code?: string
          country_name?: string
          created_at?: string
          created_by?: string | null
          enforcement_environment_notes?: string | null
          id?: string
          incorporation_regime_summary?: string | null
          public_registry_depth?: string | null
          sanctions_exposure_notes?: string | null
          source_availability_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jurisdiction_updates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          factual_summary: string | null
          id: string
          internal_source_reference: string | null
          jurisdiction_id: string
          title: string
          update_date: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          factual_summary?: string | null
          id?: string
          internal_source_reference?: string | null
          jurisdiction_id: string
          title: string
          update_date?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          factual_summary?: string | null
          id?: string
          internal_source_reference?: string | null
          jurisdiction_id?: string
          title?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_updates_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_assessments: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          balancing_test_factors: Json | null
          case_id: string | null
          conditions: string | null
          created_at: string
          created_by_user_id: string
          criminal_offence_requested: boolean
          data_categories: Json | null
          data_subjects: Json | null
          id: string
          legitimate_interest: string | null
          necessity: string | null
          org_id: string
          outcome: string | null
          purpose: string | null
          retention_months: number | null
          review_date: string | null
          safeguards: string | null
          sources: Json | null
          special_category_requested: boolean
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          balancing_test_factors?: Json | null
          case_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by_user_id: string
          criminal_offence_requested?: boolean
          data_categories?: Json | null
          data_subjects?: Json | null
          id?: string
          legitimate_interest?: string | null
          necessity?: string | null
          org_id: string
          outcome?: string | null
          purpose?: string | null
          retention_months?: number | null
          review_date?: string | null
          safeguards?: string | null
          sources?: Json | null
          special_category_requested?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          balancing_test_factors?: Json | null
          case_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by_user_id?: string
          criminal_offence_requested?: boolean
          data_categories?: Json | null
          data_subjects?: Json | null
          id?: string
          legitimate_interest?: string | null
          necessity?: string | null
          org_id?: string
          outcome?: string | null
          purpose?: string | null
          retention_months?: number | null
          review_date?: string | null
          safeguards?: string | null
          sources?: Json | null
          special_category_requested?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lia_assessments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lia_assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_exports: {
        Row: {
          case_id: string | null
          created_at: string
          deliverable_id: string | null
          file_url: string | null
          id: string
          lia_id: string
          version: number
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          file_url?: string | null
          id?: string
          lia_id: string
          version?: number
        }
        Update: {
          case_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          file_url?: string | null
          id?: string
          lia_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lia_exports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lia_exports_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lia_exports_lia_id_fkey"
            columns: ["lia_id"]
            isOneToOne: false
            referencedRelation: "lia_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      market_lessons: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          governance_reflection: string | null
          id: string
          jurisdiction_country_code: string | null
          publication_date: string | null
          publication_name: string
          publication_url: string
          published: boolean
          summary_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          governance_reflection?: string | null
          id?: string
          jurisdiction_country_code?: string | null
          publication_date?: string | null
          publication_name?: string
          publication_url?: string
          published?: boolean
          summary_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          governance_reflection?: string | null
          id?: string
          jurisdiction_country_code?: string | null
          publication_date?: string | null
          publication_name?: string
          publication_url?: string
          published?: boolean
          summary_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_entities: {
        Row: {
          canonical_name: string
          canonical_registration_number: string | null
          created_at: string
          hq_address_line1: string | null
          hq_city: string | null
          hq_country: string | null
          hq_postcode: string | null
          id: string
          jurisdiction_incorporation: string | null
          notes_internal: string | null
          registered_address_line1: string | null
          registered_city: string | null
          registered_country: string | null
          registered_postcode: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          canonical_name: string
          canonical_registration_number?: string | null
          created_at?: string
          hq_address_line1?: string | null
          hq_city?: string | null
          hq_country?: string | null
          hq_postcode?: string | null
          id?: string
          jurisdiction_incorporation?: string | null
          notes_internal?: string | null
          registered_address_line1?: string | null
          registered_city?: string | null
          registered_country?: string | null
          registered_postcode?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          canonical_name?: string
          canonical_registration_number?: string | null
          created_at?: string
          hq_address_line1?: string | null
          hq_city?: string | null
          hq_country?: string | null
          hq_postcode?: string | null
          id?: string
          jurisdiction_incorporation?: string | null
          notes_internal?: string | null
          registered_address_line1?: string | null
          registered_city?: string | null
          registered_country?: string | null
          registered_postcode?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      master_lia_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          balancing_fields: Json | null
          conditions: string | null
          created_at: string
          document_url: string | null
          effective_date: string | null
          id: string
          lawful_basis: string
          legitimate_interest: string | null
          less_intrusive: string | null
          name: string
          necessity: string | null
          org_id: string
          outcome: string | null
          purpose_category: string
          retention_months: number | null
          safeguards: string | null
          scope_summary: string | null
          status: string
          superseded_by: string | null
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          balancing_fields?: Json | null
          conditions?: string | null
          created_at?: string
          document_url?: string | null
          effective_date?: string | null
          id?: string
          lawful_basis?: string
          legitimate_interest?: string | null
          less_intrusive?: string | null
          name: string
          necessity?: string | null
          org_id: string
          outcome?: string | null
          purpose_category?: string
          retention_months?: number | null
          safeguards?: string | null
          scope_summary?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          balancing_fields?: Json | null
          conditions?: string | null
          created_at?: string
          document_url?: string | null
          effective_date?: string | null
          id?: string
          lawful_basis?: string
          legitimate_interest?: string | null
          less_intrusive?: string | null
          name?: string
          necessity?: string | null
          org_id?: string
          outcome?: string | null
          purpose_category?: string
          retention_months?: number | null
          safeguards?: string | null
          scope_summary?: string | null
          status?: string
          superseded_by?: string | null
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "master_lia_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_lia_templates_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "master_lia_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      module_outputs: {
        Row: {
          case_module_id: string
          confidence_level: string
          created_at: string
          deliverable_id: string | null
          executive_summary: string | null
          id: string
          limitations: string | null
        }
        Insert: {
          case_module_id: string
          confidence_level?: string
          created_at?: string
          deliverable_id?: string | null
          executive_summary?: string | null
          id?: string
          limitations?: string | null
        }
        Update: {
          case_module_id?: string
          confidence_level?: string
          created_at?: string
          deliverable_id?: string | null
          executive_summary?: string | null
          id?: string
          limitations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_outputs_case_module_id_fkey"
            columns: ["case_module_id"]
            isOneToOne: false
            referencedRelation: "case_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_outputs_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      module_types: {
        Row: {
          code: string
          created_at: string
          default_enabled: boolean
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      monitoring_events: {
        Row: {
          case_id: string | null
          detected_at: string
          entity_id: string
          event_type: string
          headline: string
          id: string
          severity: string
          source_url: string | null
          status: string
        }
        Insert: {
          case_id?: string | null
          detected_at?: string
          entity_id: string
          event_type: string
          headline: string
          id?: string
          severity?: string
          source_url?: string | null
          status?: string
        }
        Update: {
          case_id?: string | null
          detected_at?: string
          entity_id?: string
          event_type?: string
          headline?: string
          id?: string
          severity?: string
          source_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      org_feature_flags: {
        Row: {
          billing_model: string | null
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          org_id: string
          overridden_at: string | null
          overridden_by: string | null
          tier_default: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          billing_model?: string | null
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          org_id: string
          overridden_at?: string | null
          overridden_by?: string | null
          tier_default?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          billing_model?: string | null
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          org_id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          tier_default?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_plan: {
        Row: {
          created_at: string
          entity_limit: number
          id: string
          included_notes_per_year: number
          included_notes_used_ytd: number
          org_id: string
          plan_name: string
          renewal_date: string | null
          report_retention_days: number
        }
        Insert: {
          created_at?: string
          entity_limit?: number
          id?: string
          included_notes_per_year?: number
          included_notes_used_ytd?: number
          org_id: string
          plan_name?: string
          renewal_date?: string | null
          report_retention_days?: number
        }
        Update: {
          created_at?: string
          entity_limit?: number
          id?: string
          included_notes_per_year?: number
          included_notes_used_ytd?: number
          org_id?: string
          plan_name?: string
          renewal_date?: string | null
          report_retention_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "organisation_plan_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          allow_pre_approval_start: boolean
          approval_price_threshold: number | null
          auto_suggest_benchmark: boolean
          auto_suggest_posture: boolean
          created_at: string
          feature_tier: string
          id: string
          industry: string | null
          name: string
          risk_policy_default_id: string | null
        }
        Insert: {
          allow_pre_approval_start?: boolean
          approval_price_threshold?: number | null
          auto_suggest_benchmark?: boolean
          auto_suggest_posture?: boolean
          created_at?: string
          feature_tier?: string
          id?: string
          industry?: string | null
          name: string
          risk_policy_default_id?: string | null
        }
        Update: {
          allow_pre_approval_start?: boolean
          approval_price_threshold?: number | null
          auto_suggest_benchmark?: boolean
          auto_suggest_posture?: boolean
          created_at?: string
          feature_tier?: string
          id?: string
          industry?: string | null
          name?: string
          risk_policy_default_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_risk_policy_default"
            columns: ["risk_policy_default_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      package_entitlements: {
        Row: {
          addon_entitlements: Json
          ai_brief_export_enabled: boolean
          allowed_report_tiers: string[]
          created_at: string
          dashboard_modules: Json
          id: string
          org_id: string
          package: string
          partner_escalation_enabled: boolean
          source_tier_access: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          addon_entitlements?: Json
          ai_brief_export_enabled?: boolean
          allowed_report_tiers?: string[]
          created_at?: string
          dashboard_modules?: Json
          id?: string
          org_id: string
          package?: string
          partner_escalation_enabled?: boolean
          source_tier_access?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          addon_entitlements?: Json
          ai_brief_export_enabled?: boolean
          allowed_report_tiers?: string[]
          created_at?: string
          dashboard_modules?: Json
          id?: string
          org_id?: string
          package?: string
          partner_escalation_enabled?: boolean
          source_tier_access?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_escalations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_cost: number | null
          brief: string | null
          case_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          entity_id: string | null
          estimated_cost: number | null
          id: string
          partner_id: string | null
          partner_task_id: string | null
          risk_recalculated: boolean
          scope_confirmation: string | null
          status: string
          trigger_source: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_cost?: number | null
          brief?: string | null
          case_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          entity_id?: string | null
          estimated_cost?: number | null
          id?: string
          partner_id?: string | null
          partner_task_id?: string | null
          risk_recalculated?: boolean
          scope_confirmation?: string | null
          status?: string
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_cost?: number | null
          brief?: string | null
          case_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          entity_id?: string | null
          estimated_cost?: number | null
          id?: string
          partner_id?: string | null
          partner_task_id?: string | null
          risk_recalculated?: boolean
          scope_confirmation?: string | null
          status?: string
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_escalations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_evidence: {
        Row: {
          captured_at: string | null
          client_shareable: boolean
          created_at: string
          evidence_type: string
          file_url: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          notes: string | null
          partner_task_id: string
        }
        Insert: {
          captured_at?: string | null
          client_shareable?: boolean
          created_at?: string
          evidence_type?: string
          file_url?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          notes?: string | null
          partner_task_id: string
        }
        Update: {
          captured_at?: string | null
          client_shareable?: boolean
          created_at?: string
          evidence_type?: string
          file_url?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          notes?: string | null
          partner_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_evidence_partner_task_id_fkey"
            columns: ["partner_task_id"]
            isOneToOne: false
            referencedRelation: "partner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_task_clarifications: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          message: string
          sender_role: string
          sender_user_id: string | null
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          message: string
          sender_role?: string
          sender_user_id?: string | null
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          message?: string
          sender_role?: string
          sender_user_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_task_clarifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "partner_task_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_task_clarifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "partner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_task_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_url: string | null
          geo_label: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          is_client_shareable: boolean
          is_completed: boolean
          label: string
          notes: string | null
          sort_order: number
          task_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          geo_label?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_client_shareable?: boolean
          is_completed?: boolean
          label: string
          notes?: string | null
          sort_order?: number
          task_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          geo_label?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_client_shareable?: boolean
          is_completed?: boolean
          label?: string
          notes?: string | null
          sort_order?: number
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_task_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "partner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tasks: {
        Row: {
          case_module_id: string
          country: string
          created_at: string
          created_by: string | null
          deadline: string | null
          entity_id: string | null
          id: string
          method_statement: string | null
          partner_id: string | null
          partner_user_id: string | null
          questions: Json
          response_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_module_id: string
          country: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          entity_id?: string | null
          id?: string
          method_statement?: string | null
          partner_id?: string | null
          partner_user_id?: string | null
          questions?: Json
          response_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_module_id?: string
          country?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          entity_id?: string | null
          id?: string
          method_statement?: string | null
          partner_id?: string | null
          partner_user_id?: string | null
          questions?: Json
          response_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tasks_case_module_id_fkey"
            columns: ["case_module_id"]
            isOneToOne: false
            referencedRelation: "case_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          capability_tags: Json | null
          compliance_document_url: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          dd_status: string
          id: string
          internal_rating: number | null
          jurisdictions_covered: string[]
          name: string
          notes_internal: string | null
          rate_card: Json | null
          rate_structure: string | null
          services_offered: string[]
          sla_terms: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          capability_tags?: Json | null
          compliance_document_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          dd_status?: string
          id?: string
          internal_rating?: number | null
          jurisdictions_covered?: string[]
          name: string
          notes_internal?: string | null
          rate_card?: Json | null
          rate_structure?: string | null
          services_offered?: string[]
          sla_terms?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          capability_tags?: Json | null
          compliance_document_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          dd_status?: string
          id?: string
          internal_rating?: number | null
          jurisdictions_covered?: string[]
          name?: string
          notes_internal?: string | null
          rate_card?: Json | null
          rate_structure?: string | null
          services_offered?: string[]
          sla_terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rules: {
        Row: {
          approval_required: boolean
          default_product: string
          id: string
          monitoring_level: string
          policy_id: string
          review_frequency_months: number
          risk_tier: string
        }
        Insert: {
          approval_required?: boolean
          default_product?: string
          id?: string
          monitoring_level?: string
          policy_id: string
          review_frequency_months?: number
          risk_tier: string
        }
        Update: {
          approval_required?: boolean
          default_product?: string
          id?: string
          monitoring_level?: string
          policy_id?: string
          review_frequency_months?: number
          risk_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string
          description: string
          enabled: boolean
          id: string
          included_in_packages: string[]
          internal_delivery_notes: string | null
          jurisdiction_pricing_modifier: Json | null
          pricing_unit: string
          product_name: string
          product_type: string
          sla_default_days: number | null
          updated_at: string
          vat_applicability: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          included_in_packages?: string[]
          internal_delivery_notes?: string | null
          jurisdiction_pricing_modifier?: Json | null
          pricing_unit?: string
          product_name: string
          product_type?: string
          sla_default_days?: number | null
          updated_at?: string
          vat_applicability?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          included_in_packages?: string[]
          internal_delivery_notes?: string | null
          jurisdiction_pricing_modifier?: Json | null
          pricing_unit?: string
          product_name?: string
          product_type?: string
          sla_default_days?: number | null
          updated_at?: string
          vat_applicability?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          org_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          org_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          org_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_audit_log: {
        Row: {
          changed_by: string
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_budgets: {
        Row: {
          cap_behaviour: string
          committed_spend: number
          created_at: string
          created_by: string | null
          criticality_caps: Json
          delivered_spend: number
          id: string
          jurisdiction_caps: Json
          notes: string | null
          org_id: string
          partner_spend: number
          period_end: string
          period_start: string
          period_type: string
          total_cap: number
          updated_at: string
        }
        Insert: {
          cap_behaviour?: string
          committed_spend?: number
          created_at?: string
          created_by?: string | null
          criticality_caps?: Json
          delivered_spend?: number
          id?: string
          jurisdiction_caps?: Json
          notes?: string | null
          org_id: string
          partner_spend?: number
          period_end: string
          period_start: string
          period_type?: string
          total_cap?: number
          updated_at?: string
        }
        Update: {
          cap_behaviour?: string
          committed_spend?: number
          created_at?: string
          created_by?: string | null
          criticality_caps?: Json
          delivered_spend?: number
          id?: string
          jurisdiction_caps?: Json
          notes?: string | null
          org_id?: string
          partner_spend?: number
          period_end?: string
          period_start?: string
          period_type?: string
          total_cap?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_settings: {
        Row: {
          addons: Json
          cadence_tier_a: number
          cadence_tier_b: number
          cadence_tier_c: number
          created_at: string
          id: string
          org_id: string
          report_tier_a: string
          report_tier_b: string
          report_tier_c: string
          updated_at: string
        }
        Insert: {
          addons?: Json
          cadence_tier_a?: number
          cadence_tier_b?: number
          cadence_tier_c?: number
          created_at?: string
          id?: string
          org_id: string
          report_tier_a?: string
          report_tier_b?: string
          report_tier_c?: string
          updated_at?: string
        }
        Update: {
          addons?: Json
          cadence_tier_a?: number
          cadence_tier_b?: number
          cadence_tier_c?: number
          created_at?: string
          id?: string
          org_id?: string
          report_tier_a?: string
          report_tier_b?: string
          report_tier_c?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          created_at: string
          description: string
          discount_pct: number
          id: string
          line_total: number
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          unit_price: number
          vat_applicability: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_pct?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          unit_price?: number
          vat_applicability?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_pct?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit_price?: number
          vat_applicability?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          case_id: string
          created_at: string
          created_by: string
          discount_pct: number
          discount_reason: string | null
          expires_at: string | null
          id: string
          locked: boolean
          org_id: string
          rate_card_id: string | null
          rate_card_version: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          scope_notes: string | null
          sent_at: string | null
          sla_days: number | null
          status: string
          subtotal: number
          total_price: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          created_at?: string
          created_by: string
          discount_pct?: number
          discount_reason?: string | null
          expires_at?: string | null
          id?: string
          locked?: boolean
          org_id: string
          rate_card_id?: string | null
          rate_card_version?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          scope_notes?: string | null
          sent_at?: string | null
          sla_days?: number | null
          status?: string
          subtotal?: number
          total_price?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          created_at?: string
          created_by?: string
          discount_pct?: number
          discount_reason?: string | null
          expires_at?: string | null
          id?: string
          locked?: boolean
          org_id?: string
          rate_card_id?: string | null
          rate_card_version?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          scope_notes?: string | null
          sent_at?: string | null
          sla_days?: number | null
          status?: string
          subtotal?: number
          total_price?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_card_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          override_price: number | null
          override_sla_days: number | null
          override_vat: string | null
          product_id: string
          rate_card_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          override_price?: number | null
          override_sla_days?: number | null
          override_vat?: string | null
          product_id: string
          rate_card_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          override_price?: number | null
          override_sla_days?: number | null
          override_vat?: string | null
          product_id?: string
          rate_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_card_items_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          client_group: string | null
          created_at: string
          created_by: string | null
          discount_pct: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          name: string
          notes: string | null
          org_id: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          client_group?: string | null
          created_at?: string
          created_by?: string | null
          discount_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_group?: string | null
          created_at?: string
          created_by?: string | null
          discount_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_amendments: {
        Row: {
          amended_by: string | null
          amended_sections: string[]
          amendment_reason: string
          case_id: string
          change_log: string | null
          client_notified: boolean
          client_notified_at: string | null
          created_at: string
          id: string
          new_version: number
          org_id: string
          prior_snapshot: Json
          prior_version: number
          report_draft_id: string
        }
        Insert: {
          amended_by?: string | null
          amended_sections?: string[]
          amendment_reason: string
          case_id: string
          change_log?: string | null
          client_notified?: boolean
          client_notified_at?: string | null
          created_at?: string
          id?: string
          new_version: number
          org_id: string
          prior_snapshot?: Json
          prior_version: number
          report_draft_id: string
        }
        Update: {
          amended_by?: string | null
          amended_sections?: string[]
          amendment_reason?: string
          case_id?: string
          change_log?: string | null
          client_notified?: boolean
          client_notified_at?: string | null
          created_at?: string
          id?: string
          new_version?: number
          org_id?: string
          prior_snapshot?: Json
          prior_version?: number
          report_draft_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_amendments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_amendments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_amendments_report_draft_id_fkey"
            columns: ["report_draft_id"]
            isOneToOne: false
            referencedRelation: "report_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      report_drafts: {
        Row: {
          ai_draft: Json
          ai_draft_dismissed: boolean
          ai_draft_reviewed: boolean
          amendment_history: Json
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          officer_commentary: Json
          officer_commentary_complete: boolean
          org_id: string
          pdf_deliverable_id: string | null
          pdf_generated: boolean
          pdf_generated_at: string | null
          qa_approval_status: string
          qa_approved_at: string | null
          qa_approved_by: string | null
          qa_comments: string | null
          report_version: number
          structured_data: Json
          structured_data_locked: boolean
          structured_data_locked_at: string | null
          structured_data_locked_by: string | null
          updated_at: string
        }
        Insert: {
          ai_draft?: Json
          ai_draft_dismissed?: boolean
          ai_draft_reviewed?: boolean
          amendment_history?: Json
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          officer_commentary?: Json
          officer_commentary_complete?: boolean
          org_id: string
          pdf_deliverable_id?: string | null
          pdf_generated?: boolean
          pdf_generated_at?: string | null
          qa_approval_status?: string
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_comments?: string | null
          report_version?: number
          structured_data?: Json
          structured_data_locked?: boolean
          structured_data_locked_at?: string | null
          structured_data_locked_by?: string | null
          updated_at?: string
        }
        Update: {
          ai_draft?: Json
          ai_draft_dismissed?: boolean
          ai_draft_reviewed?: boolean
          amendment_history?: Json
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          officer_commentary?: Json
          officer_commentary_complete?: boolean
          org_id?: string
          pdf_deliverable_id?: string | null
          pdf_generated?: boolean
          pdf_generated_at?: string | null
          qa_approval_status?: string
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_comments?: string | null
          report_version?: number
          structured_data?: Json
          structured_data_locked?: boolean
          structured_data_locked_at?: string | null
          structured_data_locked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_drafts_pdf_deliverable_id_fkey"
            columns: ["pdf_deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          access_type: string
          category: string
          cost_level: string
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          jurisdictions_covered: string[]
          linked_package: string
          permitted_use_notes: string | null
          source_name: string
          tier: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          category?: string
          cost_level?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          jurisdictions_covered?: string[]
          linked_package?: string
          permitted_use_notes?: string | null
          source_name: string
          tier?: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          category?: string
          cost_level?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          jurisdictions_covered?: string[]
          linked_package?: string
          permitted_use_notes?: string | null
          source_name?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      retrieval_logs: {
        Row: {
          case_id: string
          created_at: string
          entity_id: string
          id: string
          notes_internal: string | null
          officer_id: string
          outcome_status: string
          promoted_to: string | null
          purpose_of_search: string
          query_text: string | null
          source_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          entity_id: string
          id?: string
          notes_internal?: string | null
          officer_id: string
          outcome_status?: string
          promoted_to?: string | null
          purpose_of_search?: string
          query_text?: string | null
          source_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          entity_id?: string
          id?: string
          notes_internal?: string | null
          officer_id?: string
          outcome_status?: string
          promoted_to?: string | null
          purpose_of_search?: string
          query_text?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrieval_logs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrieval_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "research_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reminders: {
        Row: {
          entity_id: string
          id: string
          org_id: string
          recipient_email: string | null
          reminder_type: string
          sent_at: string
          sent_date: string
        }
        Insert: {
          entity_id: string
          id?: string
          org_id: string
          recipient_email?: string | null
          reminder_type: string
          sent_at?: string
          sent_date?: string
        }
        Update: {
          entity_id?: string
          id?: string
          org_id?: string
          recipient_email?: string | null
          reminder_type?: string
          sent_at?: string
          sent_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reminders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_model_configs: {
        Row: {
          association_weight: number
          band_high_max: number
          band_low_max: number
          band_medium_max: number
          created_at: string
          created_by: string | null
          event_weight: number
          id: string
          is_active: boolean
          jurisdiction_weight: number
          notes: string | null
          structural_weight: number
          version: string
        }
        Insert: {
          association_weight?: number
          band_high_max?: number
          band_low_max?: number
          band_medium_max?: number
          created_at?: string
          created_by?: string | null
          event_weight?: number
          id?: string
          is_active?: boolean
          jurisdiction_weight?: number
          notes?: string | null
          structural_weight?: number
          version?: string
        }
        Update: {
          association_weight?: number
          band_high_max?: number
          band_low_max?: number
          band_medium_max?: number
          created_at?: string
          created_by?: string | null
          event_weight?: number
          id?: string
          is_active?: boolean
          jurisdiction_weight?: number
          notes?: string | null
          structural_weight?: number
          version?: string
        }
        Relationships: []
      }
      risk_overrides: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          justification: string
          new_band: string
          overridden_by: string
          previous_band: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          justification: string
          new_band: string
          overridden_by: string
          previous_band: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          justification?: string
          new_band?: string
          overridden_by?: string
          previous_band?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_overrides_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_entity: {
        Row: {
          active: boolean
          addresses_json: Json | null
          country_json: Json | null
          created_at: string
          dob_json: Json | null
          entity_type: string
          first_seen_at: string
          id: string
          identifiers_json: Json | null
          ingestion_run_id: string | null
          last_seen_at: string
          list_name: string
          name: string
          programmes_json: Json | null
          raw_json: Json | null
          source: Database["public"]["Enums"]["sanctions_source"]
          source_record_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          addresses_json?: Json | null
          country_json?: Json | null
          created_at?: string
          dob_json?: Json | null
          entity_type?: string
          first_seen_at?: string
          id?: string
          identifiers_json?: Json | null
          ingestion_run_id?: string | null
          last_seen_at?: string
          list_name?: string
          name: string
          programmes_json?: Json | null
          raw_json?: Json | null
          source: Database["public"]["Enums"]["sanctions_source"]
          source_record_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          addresses_json?: Json | null
          country_json?: Json | null
          created_at?: string
          dob_json?: Json | null
          entity_type?: string
          first_seen_at?: string
          id?: string
          identifiers_json?: Json | null
          ingestion_run_id?: string | null
          last_seen_at?: string
          list_name?: string
          name?: string
          programmes_json?: Json | null
          raw_json?: Json | null
          source?: Database["public"]["Enums"]["sanctions_source"]
          source_record_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_entity_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_run"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_entity_change: {
        Row: {
          change_type: string
          detected_at: string
          id: string
          ingestion_run_id: string | null
          new_json: Json | null
          old_json: Json | null
          sanctions_entity_id: string
        }
        Insert: {
          change_type: string
          detected_at?: string
          id?: string
          ingestion_run_id?: string | null
          new_json?: Json | null
          old_json?: Json | null
          sanctions_entity_id: string
        }
        Update: {
          change_type?: string
          detected_at?: string
          id?: string
          ingestion_run_id?: string | null
          new_json?: Json | null
          old_json?: Json | null
          sanctions_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_entity_change_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_entity_change_sanctions_entity_id_fkey"
            columns: ["sanctions_entity_id"]
            isOneToOne: false
            referencedRelation: "sanctions_entity"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          filter_json: Json
          id: string
          name: string
          org_id: string
          page_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filter_json?: Json
          id?: string
          name: string
          org_id: string
          page_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filter_json?: Json
          id?: string
          name?: string
          org_id?: string
          page_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_deviation_overrides: {
        Row: {
          case_id: string
          created_at: string
          id: string
          matrix_version_id: string | null
          officer_id: string
          reason_for_deviation: string
          requirement_label: string
          requirement_rule_key: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_reason: string | null
          status: string
          supporting_notes: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          matrix_version_id?: string | null
          officer_id: string
          reason_for_deviation: string
          requirement_label: string
          requirement_rule_key: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_reason?: string | null
          status?: string
          supporting_notes?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          matrix_version_id?: string | null
          officer_id?: string
          reason_for_deviation?: string
          requirement_label?: string
          requirement_rule_key?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_reason?: string | null
          status?: string
          supporting_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_deviation_overrides_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_deviation_overrides_matrix_version_id_fkey"
            columns: ["matrix_version_id"]
            isOneToOne: false
            referencedRelation: "tier_matrix_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_matrix_versions: {
        Row: {
          change_log: string | null
          created_at: string
          created_by: string | null
          id: string
          status: string
          version_number: number
        }
        Insert: {
          change_log?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          version_number?: number
        }
        Update: {
          change_log?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          version_number?: number
        }
        Relationships: []
      }
      tier_requirements_matrix: {
        Row: {
          adverse_media_requires_contextual_analysis: boolean
          adverse_media_threshold: number
          ai_review_required: boolean
          created_at: string
          escalation_risk_band_threshold: string
          id: string
          matrix_version_id: string
          min_retrieval_logs: Json
          qa_checklist_items: Json
          report_tier: string
          required_commentary_sections: Json
          required_source_categories: Json
          sanctions_match_requires_manager_review: boolean
        }
        Insert: {
          adverse_media_requires_contextual_analysis?: boolean
          adverse_media_threshold?: number
          ai_review_required?: boolean
          created_at?: string
          escalation_risk_band_threshold?: string
          id?: string
          matrix_version_id: string
          min_retrieval_logs?: Json
          qa_checklist_items?: Json
          report_tier: string
          required_commentary_sections?: Json
          required_source_categories?: Json
          sanctions_match_requires_manager_review?: boolean
        }
        Update: {
          adverse_media_requires_contextual_analysis?: boolean
          adverse_media_threshold?: number
          ai_review_required?: boolean
          created_at?: string
          escalation_risk_band_threshold?: string
          id?: string
          matrix_version_id?: string
          min_retrieval_logs?: Json
          qa_checklist_items?: Json
          report_tier?: string
          required_commentary_sections?: Json
          required_source_categories?: Json
          sanctions_match_requires_manager_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tier_requirements_matrix_matrix_version_id_fkey"
            columns: ["matrix_version_id"]
            isOneToOne: false
            referencedRelation: "tier_matrix_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          org_id: string
          requested_by: string
          requested_feature: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id: string
          requested_by: string
          requested_feature: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          requested_by?: string
          requested_feature?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_officer: string | null
          case_id: string
          created_at: string
          delivery_date: string | null
          delivery_status: string
          external_invoice_reference: string | null
          id: string
          invoice_status: string
          notes: string | null
          org_id: string
          partner_cost: number
          qa_required: boolean
          quote_id: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          assigned_officer?: string | null
          case_id: string
          created_at?: string
          delivery_date?: string | null
          delivery_status?: string
          external_invoice_reference?: string | null
          id?: string
          invoice_status?: string
          notes?: string | null
          org_id: string
          partner_cost?: number
          qa_required?: boolean
          quote_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          assigned_officer?: string | null
          case_id?: string
          created_at?: string
          delivery_date?: string | null
          delivery_status?: string
          external_invoice_reference?: string | null
          id?: string
          invoice_status?: string
          notes?: string | null
          org_id?: string
          partner_cost?: number
          qa_required?: boolean
          quote_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_qc_signoff: { Args: { _user_id: string }; Returns: boolean }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal: { Args: { _user_id: string }; Returns: boolean }
      map_indicator_to_alert_type: {
        Args: { ind_type: string }
        Returns: Database["public"]["Enums"]["client_alert_type"]
      }
    }
    Enums: {
      app_role:
        | "client_admin"
        | "client_requester"
        | "client_auditor"
        | "fvc_analyst"
        | "fvc_ops_admin"
        | "partner"
        | "fvc_assurance_manager"
        | "fvc_assurance_officer"
        | "fvc_assurance_lead"
        | "fvc_quality_reviewer"
      client_alert_type:
        | "FATF_CHANGE"
        | "EU_HRTC_CHANGE"
        | "UK_SANCTIONS_CHANGE"
        | "EU_SANCTIONS_CHANGE"
        | "OFAC_SANCTIONS_CHANGE"
        | "CPI_CHANGE"
      indicator_type:
        | "FATF_STATUS"
        | "EU_AML_HRTC"
        | "SANCTIONS_UK_PROGRAMME"
        | "SANCTIONS_EU_PROGRAMME"
        | "SANCTIONS_US_OFAC_PROGRAMME"
        | "US_STATE_SPONSOR_TERRORISM"
        | "US_FINCEN_311"
        | "EU_TAX_NONCOOP"
        | "CPI_SCORE"
      policy_operator:
        | "EQUALS"
        | "NOT_EQUALS"
        | "IN"
        | "NOT_IN"
        | "GTE"
        | "LTE"
        | "GT"
        | "LT"
        | "EXISTS"
        | "NOT_EXISTS"
      sanctions_source: "UKSL" | "OFAC" | "EU_FSF"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "client_admin",
        "client_requester",
        "client_auditor",
        "fvc_analyst",
        "fvc_ops_admin",
        "partner",
        "fvc_assurance_manager",
        "fvc_assurance_officer",
        "fvc_assurance_lead",
        "fvc_quality_reviewer",
      ],
      client_alert_type: [
        "FATF_CHANGE",
        "EU_HRTC_CHANGE",
        "UK_SANCTIONS_CHANGE",
        "EU_SANCTIONS_CHANGE",
        "OFAC_SANCTIONS_CHANGE",
        "CPI_CHANGE",
      ],
      indicator_type: [
        "FATF_STATUS",
        "EU_AML_HRTC",
        "SANCTIONS_UK_PROGRAMME",
        "SANCTIONS_EU_PROGRAMME",
        "SANCTIONS_US_OFAC_PROGRAMME",
        "US_STATE_SPONSOR_TERRORISM",
        "US_FINCEN_311",
        "EU_TAX_NONCOOP",
        "CPI_SCORE",
      ],
      policy_operator: [
        "EQUALS",
        "NOT_EQUALS",
        "IN",
        "NOT_IN",
        "GTE",
        "LTE",
        "GT",
        "LT",
        "EXISTS",
        "NOT_EXISTS",
      ],
      sanctions_source: ["UKSL", "OFAC", "EU_FSF"],
    },
  },
} as const
