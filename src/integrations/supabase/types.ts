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
      case_messages: {
        Row: {
          attachments: Json | null
          case_id: string
          created_at: string
          id: string
          message: string
          sender_user_id: string
        }
        Insert: {
          attachments?: Json | null
          case_id: string
          created_at?: string
          id?: string
          message: string
          sender_user_id: string
        }
        Update: {
          attachments?: Json | null
          case_id?: string
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
      cases: {
        Row: {
          approved_by: string | null
          assigned_to: string | null
          created_at: string
          data_categories: Json | null
          dp_review_required: boolean
          dp_risk_level: string | null
          due_date: string | null
          entity_id: string
          id: string
          lawful_basis: string | null
          lia_summary: string | null
          minimisation_confirmed: boolean
          org_id: string
          price_estimate: number | null
          priority: string
          processing_purpose: string | null
          processing_purpose_detail: string | null
          product_type: string
          requested_by: string | null
          requires_personal_data: boolean
          retention_months: number | null
          scope_notes: string | null
          sla_days: number | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          data_categories?: Json | null
          dp_review_required?: boolean
          dp_risk_level?: string | null
          due_date?: string | null
          entity_id: string
          id?: string
          lawful_basis?: string | null
          lia_summary?: string | null
          minimisation_confirmed?: boolean
          org_id: string
          price_estimate?: number | null
          priority?: string
          processing_purpose?: string | null
          processing_purpose_detail?: string | null
          product_type?: string
          requested_by?: string | null
          requires_personal_data?: boolean
          retention_months?: number | null
          scope_notes?: string | null
          sla_days?: number | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          data_categories?: Json | null
          dp_review_required?: boolean
          dp_risk_level?: string | null
          due_date?: string | null
          entity_id?: string
          id?: string
          lawful_basis?: string | null
          lia_summary?: string | null
          minimisation_confirmed?: boolean
          org_id?: string
          price_estimate?: number | null
          priority?: string
          processing_purpose?: string | null
          processing_purpose_detail?: string | null
          product_type?: string
          requested_by?: string | null
          requires_personal_data?: boolean
          retention_months?: number | null
          scope_notes?: string | null
          sla_days?: number | null
          status?: string
        }
        Relationships: [
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
      deliverables: {
        Row: {
          case_id: string
          created_at: string
          deliverable_type: string
          file_url: string | null
          id: string
          title: string
          version: number
        }
        Insert: {
          case_id: string
          created_at?: string
          deliverable_type: string
          file_url?: string | null
          id?: string
          title: string
          version?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          deliverable_type?: string
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
          head_office_address_line1: string | null
          head_office_address_line2: string | null
          head_office_city: string | null
          head_office_country: string | null
          head_office_postcode: string | null
          head_office_region: string | null
          hq_lat: number | null
          hq_lng: number | null
          id: string
          internal_contacts: Json | null
          last_review_date: string | null
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
          head_office_address_line1?: string | null
          head_office_address_line2?: string | null
          head_office_city?: string | null
          head_office_country?: string | null
          head_office_postcode?: string | null
          head_office_region?: string | null
          hq_lat?: number | null
          hq_lng?: number | null
          id?: string
          internal_contacts?: Json | null
          last_review_date?: string | null
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
          head_office_address_line1?: string | null
          head_office_address_line2?: string | null
          head_office_city?: string | null
          head_office_country?: string | null
          head_office_postcode?: string | null
          head_office_region?: string | null
          hq_lat?: number | null
          hq_lng?: number | null
          id?: string
          internal_contacts?: Json | null
          last_review_date?: string | null
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
            foreignKeyName: "entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
            foreignKeyName: "monitoring_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
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
          approval_price_threshold: number | null
          auto_suggest_benchmark: boolean
          auto_suggest_posture: boolean
          created_at: string
          id: string
          industry: string | null
          name: string
          risk_policy_default_id: string | null
        }
        Insert: {
          approval_price_threshold?: number | null
          auto_suggest_benchmark?: boolean
          auto_suggest_posture?: boolean
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          risk_policy_default_id?: string | null
        }
        Update: {
          approval_price_threshold?: number | null
          auto_suggest_benchmark?: boolean
          auto_suggest_posture?: boolean
          created_at?: string
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
      partner_tasks: {
        Row: {
          case_module_id: string
          country: string
          created_at: string
          created_by: string | null
          deadline: string | null
          id: string
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
          id?: string
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
          id?: string
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
        ]
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
      quotes: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          line_items: Json
          scope_notes: string | null
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          line_items?: Json
          scope_notes?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          line_items?: Json
          scope_notes?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "client_admin"
        | "client_requester"
        | "client_auditor"
        | "fvc_analyst"
        | "fvc_ops_admin"
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
      ],
    },
  },
} as const
