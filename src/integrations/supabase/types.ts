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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_sessions: {
        Row: {
          access_type: string
          app_version: string | null
          business_id: string | null
          country_code: string | null
          device_fingerprint_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_point: string | null
          id: string
          ip_hash: string
          is_active: boolean | null
          is_new_device: boolean | null
          is_new_location: boolean | null
          language: string | null
          region: string | null
          risk_level: string | null
          session_token_hash: string
          session_trust_score: number | null
          started_at: string | null
          timezone: string | null
          user_id: string | null
        }
        Insert: {
          access_type?: string
          app_version?: string | null
          business_id?: string | null
          country_code?: string | null
          device_fingerprint_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          ip_hash: string
          is_active?: boolean | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          language?: string | null
          region?: string | null
          risk_level?: string | null
          session_token_hash: string
          session_trust_score?: number | null
          started_at?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          app_version?: string | null
          business_id?: string | null
          country_code?: string | null
          device_fingerprint_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          ip_hash?: string
          is_active?: boolean | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          language?: string | null
          region?: string | null
          risk_level?: string | null
          session_token_hash?: string
          session_trust_score?: number | null
          started_at?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_sessions_device_fingerprint_id_fkey"
            columns: ["device_fingerprint_id"]
            isOneToOne: false
            referencedRelation: "device_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
      active_discounts: {
        Row: {
          approval_request_id: string | null
          approved_by: string
          branch_id: string | null
          business_id: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          notes: string | null
          reason: string
          started_at: string
          stopped_at: string | null
          stopped_by: string | null
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          approved_by: string
          branch_id?: string | null
          business_id: string
          created_at?: string
          discount_percent: number
          id?: string
          is_active?: boolean
          notes?: string | null
          reason: string
          started_at?: string
          stopped_at?: string | null
          stopped_by?: string | null
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          approved_by?: string
          branch_id?: string | null
          business_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          reason?: string
          started_at?: string
          stopped_at?: string | null
          stopped_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_discounts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_discounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_discounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_discounts_stopped_by_fkey"
            columns: ["stopped_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          branch_id: string | null
          business_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          staff_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          business_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          staff_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          business_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          staff_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_features: {
        Row: {
          applicable_plans: Database["public"]["Enums"]["subscription_plan"][]
          billing_period: string
          created_at: string
          currency: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_active: boolean
          price_per_unit: number
          price_quarterly: number | null
          price_yearly: number | null
          updated_at: string
        }
        Insert: {
          applicable_plans?: Database["public"]["Enums"]["subscription_plan"][]
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_active?: boolean
          price_per_unit?: number
          price_quarterly?: number | null
          price_yearly?: number | null
          updated_at?: string
        }
        Update: {
          applicable_plans?: Database["public"]["Enums"]["subscription_plan"][]
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_active?: boolean
          price_per_unit?: number
          price_quarterly?: number | null
          price_yearly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          action: string
          created_at: string
          domain: string | null
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          resource: string | null
          role: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          domain?: string | null
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          resource?: string | null
          role?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          domain?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          resource?: string | null
          role?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_name: string
          admin_user_id: string
          after_value: string | null
          before_value: string | null
          created_at: string
          entity_id: string
          entity_name: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          ip_address: string
          reason: string | null
          role: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          action: string
          admin_name: string
          admin_user_id: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity_id: string
          entity_name: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          ip_address: string
          reason?: string | null
          role: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          action?: string
          admin_name?: string
          admin_user_id?: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity_id?: string
          entity_name?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          ip_address?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: []
      }
      admin_mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          is_enforced: boolean
          last_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_enforced?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_enforced?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["super_admin_permission"]
          role: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["super_admin_permission"]
          role: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["super_admin_permission"]
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          phone: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          domain: Database["public"]["Enums"]["auth_domain"]
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: Database["public"]["Enums"]["auth_domain"]
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: Database["public"]["Enums"]["auth_domain"]
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          mfa_verified: boolean | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          mfa_verified?: boolean | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          mfa_verified?: boolean | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      after_hours_alerts: {
        Row: {
          activity_time: string
          alert_type: string
          branch_id: string | null
          business_id: string
          created_at: string
          description: string
          id: string
          is_reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string | null
        }
        Insert: {
          activity_time: string
          alert_type: string
          branch_id?: string | null
          business_id: string
          created_at?: string
          description: string
          id?: string
          is_reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string | null
        }
        Update: {
          activity_time?: string
          alert_type?: string
          branch_id?: string | null
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          is_reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "after_hours_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "after_hours_alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "after_hours_alerts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          condition_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notify_channel: string
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          condition_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notify_channel?: string
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          condition_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notify_channel?: string
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          amount: number | null
          approved_by: string | null
          business_id: string
          created_at: string
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          request_type: string
          requested_by: string
          resolved_at: string | null
          status: string
          threshold_amount: number | null
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          request_type: string
          requested_by: string
          resolved_at?: string | null
          status?: string
          threshold_amount?: number | null
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          request_type?: string
          requested_by?: string
          resolved_at?: string | null
          status?: string
          threshold_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          business_id: string
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          staff_id: string
          status: string
        }
        Insert: {
          business_id: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          staff_id: string
          status?: string
        }
        Update: {
          business_id?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempts: number
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json | null
          result: Json | null
          scheduled_for: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          payload?: Json | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          payload?: Json | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_settings: {
        Row: {
          allow_barcode_printing: boolean
          allow_manufacturer_barcode: boolean
          barcode_type: string
          business_id: string
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_barcode_printing?: boolean
          allow_manufacturer_barcode?: boolean
          barcode_type?: string
          business_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_barcode_printing?: boolean
          allow_manufacturer_barcode?: boolean
          barcode_type?: string
          business_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcode_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      barcodes: {
        Row: {
          barcode_type: string
          barcode_value: string
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          product_id: string
          source: string
        }
        Insert: {
          barcode_type?: string
          barcode_value: string
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          source?: string
        }
        Update: {
          barcode_type?: string
          barcode_value?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcodes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_access_logs: {
        Row: {
          action: string
          branch_id: string | null
          business_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          previous_branch_id: string | null
          staff_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          branch_id?: string | null
          business_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          previous_branch_id?: string | null
          staff_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          branch_id?: string | null
          business_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          previous_branch_id?: string | null
          staff_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_access_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_access_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_access_logs_previous_branch_id_fkey"
            columns: ["previous_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_access_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_product_prices: {
        Row: {
          branch_id: string
          business_id: string
          cost_price: number | null
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          cost_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          selling_price: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          cost_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_product_prices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_prices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_stock: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string
          id: string
          low_stock_threshold: number
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          is_main: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      brm_assignments: {
        Row: {
          assigned_by: string | null
          brm_id: string
          business_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          assigned_by?: string | null
          brm_id: string
          business_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          assigned_by?: string | null
          brm_id?: string
          business_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brm_assignments_brm_id_fkey"
            columns: ["brm_id"]
            isOneToOne: false
            referencedRelation: "brms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brm_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      brm_conversations: {
        Row: {
          brm_id: string
          business_id: string
          created_at: string
          id: string
          last_message_at: string | null
          unread_brm: number | null
          unread_client: number | null
          updated_at: string
        }
        Insert: {
          brm_id: string
          business_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          unread_brm?: number | null
          unread_client?: number | null
          updated_at?: string
        }
        Update: {
          brm_id?: string
          business_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          unread_brm?: number | null
          unread_client?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brm_conversations_brm_id_fkey"
            columns: ["brm_id"]
            isOneToOne: false
            referencedRelation: "brms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brm_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      brm_incentive_settings: {
        Row: {
          amount: number
          description: string | null
          id: string
          incentive_type: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          description?: string | null
          id?: string
          incentive_type: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          id?: string
          incentive_type?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      brm_incentives: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          brm_id: string
          business_id: string
          created_at: string
          id: string
          incentive_amount: number
          incentive_type: Database["public"]["Enums"]["brm_incentive_type"]
          paid_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["brm_incentive_status"]
          subscription_id: string | null
          triggered_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          brm_id: string
          business_id: string
          created_at?: string
          id?: string
          incentive_amount?: number
          incentive_type: Database["public"]["Enums"]["brm_incentive_type"]
          paid_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["brm_incentive_status"]
          subscription_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          brm_id?: string
          business_id?: string
          created_at?: string
          id?: string
          incentive_amount?: number
          incentive_type?: Database["public"]["Enums"]["brm_incentive_type"]
          paid_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["brm_incentive_status"]
          subscription_id?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brm_incentives_brm_id_fkey"
            columns: ["brm_id"]
            isOneToOne: false
            referencedRelation: "brms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brm_incentives_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      brm_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_type: Database["public"]["Enums"]["brm_message_sender"]
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_type: Database["public"]["Enums"]["brm_message_sender"]
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["brm_message_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "brm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "brm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      brms: {
        Row: {
          assigned_at: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          staff_id: string
          status: Database["public"]["Enums"]["brm_status"]
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["brm_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["brm_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      business_addons: {
        Row: {
          addon_feature_id: string
          amount_paid: number
          auto_renew: boolean | null
          billing_cycle: string | null
          billing_period: string | null
          branch_id: string | null
          business_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          currency: string | null
          end_date: string | null
          id: string
          independent_expiry_reason: string | null
          independent_expiry_set_at: string | null
          independent_expiry_set_by: string | null
          is_aligned_with_plan: boolean | null
          last_renewed_at: string | null
          payment_reference: string | null
          price_at_purchase: number | null
          quantity: number
          renewal_reminder_sent: boolean | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          addon_feature_id: string
          amount_paid?: number
          auto_renew?: boolean | null
          billing_cycle?: string | null
          billing_period?: string | null
          branch_id?: string | null
          business_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          id?: string
          independent_expiry_reason?: string | null
          independent_expiry_set_at?: string | null
          independent_expiry_set_by?: string | null
          is_aligned_with_plan?: boolean | null
          last_renewed_at?: string | null
          payment_reference?: string | null
          price_at_purchase?: number | null
          quantity?: number
          renewal_reminder_sent?: boolean | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          addon_feature_id?: string
          amount_paid?: number
          auto_renew?: boolean | null
          billing_cycle?: string | null
          billing_period?: string | null
          branch_id?: string | null
          business_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          id?: string
          independent_expiry_reason?: string | null
          independent_expiry_set_at?: string | null
          independent_expiry_set_by?: string | null
          is_aligned_with_plan?: boolean | null
          last_renewed_at?: string | null
          payment_reference?: string | null
          price_at_purchase?: number | null
          quantity?: number
          renewal_reminder_sent?: boolean | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_addons_addon_feature_id_fkey"
            columns: ["addon_feature_id"]
            isOneToOne: false
            referencedRelation: "addon_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_addons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_addons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          branch_id: string | null
          business_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notifications: {
        Row: {
          business_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plan_overrides: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          overridden_by: string | null
          override_limits: Json | null
          reason: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          overridden_by?: string | null
          override_limits?: Json | null
          reason?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          overridden_by?: string | null
          override_limits?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_plan_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_restrictions: {
        Row: {
          business_id: string
          can_create_branch: boolean
          can_create_staff: boolean
          can_login: boolean
          can_view_reports: boolean
          id: string
          restricted_at: string
          restricted_by: string | null
          restriction_reason: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          can_create_branch?: boolean
          can_create_staff?: boolean
          can_login?: boolean
          can_view_reports?: boolean
          id?: string
          restricted_at?: string
          restricted_by?: string | null
          restriction_reason?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          can_create_branch?: boolean
          can_create_staff?: boolean
          can_login?: boolean
          can_view_reports?: boolean
          id?: string
          restricted_at?: string
          restricted_by?: string | null
          restriction_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          active_staff: number
          address: string | null
          brm_id: string | null
          category: string
          created_at: string
          currency: string
          current_plan: Database["public"]["Enums"]["bvbooks_plan"] | null
          failed_payments: number
          feature_gas_module: boolean
          id: string
          inactive_staff: number
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_login: string | null
          last_transaction: string | null
          legal_name: string
          lifetime_revenue: number
          login_count_7days: number
          logo_url: string | null
          onboarding_status:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          outstanding_invoices: number
          owner_email: string
          owner_name: string
          owner_user_id: string | null
          phone: string | null
          plan_expires_at: string | null
          plan_started_at: string | null
          registration_date: string
          revenue_this_month: number
          setup_completed: boolean
          subscription_expiry: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          total_branches: number
          total_staff: number
          trading_name: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          active_staff?: number
          address?: string | null
          brm_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          current_plan?: Database["public"]["Enums"]["bvbooks_plan"] | null
          failed_payments?: number
          feature_gas_module?: boolean
          id?: string
          inactive_staff?: number
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_login?: string | null
          last_transaction?: string | null
          legal_name: string
          lifetime_revenue?: number
          login_count_7days?: number
          logo_url?: string | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          outstanding_invoices?: number
          owner_email: string
          owner_name: string
          owner_user_id?: string | null
          phone?: string | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
          registration_date?: string
          revenue_this_month?: number
          setup_completed?: boolean
          subscription_expiry?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          total_branches?: number
          total_staff?: number
          trading_name: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          active_staff?: number
          address?: string | null
          brm_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          current_plan?: Database["public"]["Enums"]["bvbooks_plan"] | null
          failed_payments?: number
          feature_gas_module?: boolean
          id?: string
          inactive_staff?: number
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_login?: string | null
          last_transaction?: string | null
          legal_name?: string
          lifetime_revenue?: number
          login_count_7days?: number
          logo_url?: string | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          outstanding_invoices?: number
          owner_email?: string
          owner_name?: string
          owner_user_id?: string | null
          phone?: string | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
          registration_date?: string
          revenue_this_month?: number
          setup_completed?: boolean
          subscription_expiry?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          total_branches?: number
          total_staff?: number
          trading_name?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_brm_id_fkey"
            columns: ["brm_id"]
            isOneToOne: false
            referencedRelation: "brms"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          item_count: number
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_count?: number
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_count?: number
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_login_logs: {
        Row: {
          business_id: string
          country_code: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          login_status: string
          staff_id: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_name: string
          user_type: string
        }
        Insert: {
          business_id: string
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_status?: string
          staff_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_type: string
        }
        Update: {
          business_id?: string
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_status?: string
          staff_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_login_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_login_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          sale_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          sale_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          sale_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_groups: {
        Row: {
          business_id: string
          created_at: string | null
          credit_limit: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          credit_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          credit_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_groups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          credit_balance: number | null
          email: string | null
          group_id: string | null
          id: string
          is_active: boolean
          last_purchase_at: string | null
          name: string
          notes: string | null
          phone: string | null
          reward_points: number | null
          reward_points_value: number | null
          total_orders: number
          total_purchases: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          last_purchase_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          reward_points?: number | null
          reward_points_value?: number | null
          total_orders?: number
          total_purchases?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          last_purchase_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          reward_points?: number | null
          reward_points_value?: number | null
          total_orders?: number
          total_purchases?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "customer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pump_sales: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          business_id: string
          cash_collected: number
          closing_meter: number
          created_at: string
          expected_revenue: number | null
          id: string
          liters_sold: number | null
          notes: string | null
          opening_meter: number
          pos_collected: number
          price_per_liter: number
          pump_id: string
          sale_date: string
          staff_id: string
          status: string
          submitted_at: string | null
          total_collected: number | null
          transfer_collected: number
          updated_at: string
          variance: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          business_id: string
          cash_collected?: number
          closing_meter: number
          created_at?: string
          expected_revenue?: number | null
          id?: string
          liters_sold?: number | null
          notes?: string | null
          opening_meter: number
          pos_collected?: number
          price_per_liter: number
          pump_id: string
          sale_date?: string
          staff_id: string
          status?: string
          submitted_at?: string | null
          total_collected?: number | null
          transfer_collected?: number
          updated_at?: string
          variance?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          business_id?: string
          cash_collected?: number
          closing_meter?: number
          created_at?: string
          expected_revenue?: number | null
          id?: string
          liters_sold?: number | null
          notes?: string | null
          opening_meter?: number
          pos_collected?: number
          price_per_liter?: number
          pump_id?: string
          sale_date?: string
          staff_id?: string
          status?: string
          submitted_at?: string | null
          total_collected?: number | null
          transfer_collected?: number
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_pump_sales_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pump_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pump_sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pump_sales_pump_id_fkey"
            columns: ["pump_id"]
            isOneToOne: false
            referencedRelation: "pumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pump_sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sync_status: {
        Row: {
          business_id: string | null
          cashier_id: string | null
          created_at: string | null
          expected_sales: number | null
          id: string
          last_sync: string | null
          sale_date: string
          status: string | null
          synced_sales: number | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          expected_sales?: number | null
          id?: string
          last_sync?: string | null
          sale_date: string
          status?: string | null
          synced_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          expected_sales?: number | null
          id?: string
          last_sync?: string | null
          sale_date?: string
          status?: string | null
          synced_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sync_status_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      day_locks: {
        Row: {
          business_id: string | null
          cashier_id: string | null
          created_at: string | null
          id: string
          locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          sale_date: string
          unlock_reason: string | null
        }
        Insert: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          sale_date: string
          unlock_reason?: string | null
        }
        Update: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          sale_date?: string
          unlock_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_locks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_departments_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      device_fingerprints: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          device_category: string | null
          device_type: string | null
          fingerprint_hash: string
          first_seen_at: string | null
          id: string
          is_trusted: boolean | null
          last_seen_at: string | null
          metadata: Json | null
          os_name: string | null
          os_version: string | null
          times_seen: number | null
          trust_score: number | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          device_category?: string | null
          device_type?: string | null
          fingerprint_hash: string
          first_seen_at?: string | null
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string | null
          metadata?: Json | null
          os_name?: string | null
          os_version?: string | null
          times_seen?: number | null
          trust_score?: number | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          device_category?: string | null
          device_type?: string | null
          fingerprint_hash?: string
          first_seen_at?: string | null
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string | null
          metadata?: Json | null
          os_name?: string | null
          os_version?: string | null
          times_seen?: number | null
          trust_score?: number | null
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          app_version: string | null
          browser_name: string | null
          browser_version: string | null
          business_id: string | null
          city: string | null
          country_code: string | null
          created_at: string
          device_category: string | null
          device_fingerprint_hash: string | null
          device_type: string | null
          first_seen_at: string
          id: string
          ip_hash: string | null
          is_new_device: boolean | null
          is_new_location: boolean | null
          language: string | null
          last_seen_at: string
          os_name: string | null
          os_version: string | null
          region: string | null
          risk_factors: Json | null
          risk_level: string | null
          screen_resolution: string | null
          session_count: number | null
          session_token_hash: string
          timezone: string | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          browser_name?: string | null
          browser_version?: string | null
          business_id?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_category?: string | null
          device_fingerprint_hash?: string | null
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          language?: string | null
          last_seen_at?: string
          os_name?: string | null
          os_version?: string | null
          region?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          screen_resolution?: string | null
          session_count?: number | null
          session_token_hash: string
          timezone?: string | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          browser_name?: string | null
          browser_version?: string | null
          business_id?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_category?: string | null
          device_fingerprint_hash?: string | null
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          is_new_device?: boolean | null
          is_new_location?: boolean | null
          language?: string | null
          last_seen_at?: string
          os_name?: string | null
          os_version?: string | null
          region?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          screen_resolution?: string | null
          session_count?: number | null
          session_token_hash?: string
          timezone?: string | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          business_id: string | null
          cashier_id: string | null
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          id: string
          last_seen: string | null
        }
        Insert: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_seen?: string | null
        }
        Update: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_seen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      error_events: {
        Row: {
          business_id: string | null
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack_trace: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          function_name: string | null
          id: string
          request_context: Json | null
          response_time_ms: number | null
          severity: Database["public"]["Enums"]["error_severity"]
          source: Database["public"]["Enums"]["error_source"]
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          function_name?: string | null
          id?: string
          request_context?: Json | null
          response_time_ms?: number | null
          severity?: Database["public"]["Enums"]["error_severity"]
          source?: Database["public"]["Enums"]["error_source"]
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          function_name?: string | null
          id?: string
          request_context?: Json | null
          response_time_ms?: number | null
          severity?: Database["public"]["Enums"]["error_severity"]
          source?: Database["public"]["Enums"]["error_source"]
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          business_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          business_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          business_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_changelog: {
        Row: {
          action: string
          business_id: string | null
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          feature_key: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          feature_key: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_changelog_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          business_id: string
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          alert_type: string
          business_id: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          alert_type?: string
          business_id?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "fraud_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          rule_key: string
          rule_name: string
          rule_type: string
          score_impact: number
          severity: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_key: string
          rule_name: string
          rule_type?: string
          score_impact?: number
          severity?: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_key?: string
          rule_name?: string
          rule_type?: string
          score_impact?: number
          severity?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      help_article_feedback: {
        Row: {
          article_id: string
          business_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          article_id: string
          business_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          article_id?: string
          business_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          not_helpful_count: number | null
          related_screens: string[] | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          not_helpful_count?: number | null
          related_screens?: string[] | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          not_helpful_count?: number | null
          related_screens?: string[] | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_search_analytics: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          results_count: number | null
          search_query: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          results_count?: number | null
          search_query: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          results_count?: number | null
          search_query?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_search_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          invitation_id: string
          is_primary: boolean
          role_template_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitation_id: string
          is_primary?: boolean
          role_template_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitation_id?: string
          is_primary?: boolean
          role_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_branch_assignments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "staff_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_branch_assignments_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_access_rules: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
          rule_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
          rule_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
          rule_type?: string
        }
        Relationships: []
      }
      ip_location_cache: {
        Row: {
          city: string | null
          country_code: string | null
          first_seen_at: string | null
          id: string
          ip_hash: string
          is_datacenter: boolean | null
          is_proxy: boolean | null
          is_vpn: boolean | null
          last_seen_at: string | null
          lookup_count: number | null
          region: string | null
          threat_score: number | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash: string
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_vpn?: boolean | null
          last_seen_at?: string | null
          lookup_count?: number | null
          region?: string | null
          threat_score?: number | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash?: string
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_vpn?: boolean | null
          last_seen_at?: string | null
          lookup_count?: number | null
          region?: string | null
          threat_score?: number | null
        }
        Relationships: []
      }
      job_logs: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          error_details: Json | null
          id: string
          job_id: string
          message: string | null
          status: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          job_id: string
          message?: string | null
          status: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          job_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          locked_until: string | null
          max_attempts: number
          payload: Json
          priority: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: []
      }
      knowledge_base_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string
          content: string
          created_at: string
          helpful_count: number
          id: string
          is_published: boolean
          not_helpful_count: number
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          content: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_published?: boolean
          not_helpful_count?: number
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          content?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_published?: boolean
          not_helpful_count?: number
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      known_devices: {
        Row: {
          created_at: string
          device_fingerprint_hash: string
          device_name: string | null
          first_seen_at: string
          id: string
          is_trusted: boolean | null
          last_seen_at: string
          session_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint_hash: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          session_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint_hash?: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          session_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      known_locations: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          first_seen_at: string
          id: string
          ip_hash: string
          is_trusted: boolean | null
          last_seen_at: string
          region: string | null
          session_count: number | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_hash: string
          is_trusted?: boolean | null
          last_seen_at?: string
          region?: string | null
          session_count?: number | null
          user_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_hash?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          region?: string | null
          session_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          days: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          days: number
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          days?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          business_id: string
          created_at: string
          description: string | null
          id: string
          reference: string
          source: string
          transaction_id: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          reference: string
          source?: string
          transaction_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          reference?: string
          source?: string
          transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_type?: string
          created_at?: string
          id?: string
          identifier: string
          identifier_type: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      low_stock_alert_states: {
        Row: {
          alert_suppressed: boolean
          branch_id: string | null
          business_id: string
          created_at: string
          id: string
          is_below_threshold: boolean
          last_alert_sent_at: string | null
          last_stock_quantity: number | null
          product_id: string
          suppressed_until: string | null
          threshold_quantity: number | null
          updated_at: string
        }
        Insert: {
          alert_suppressed?: boolean
          branch_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_below_threshold?: boolean
          last_alert_sent_at?: string | null
          last_stock_quantity?: number | null
          product_id: string
          suppressed_until?: string | null
          threshold_quantity?: number | null
          updated_at?: string
        }
        Update: {
          alert_suppressed?: boolean
          branch_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_below_threshold?: boolean
          last_alert_sent_at?: string | null
          last_stock_quantity?: number | null
          product_id?: string
          suppressed_until?: string | null
          threshold_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alert_states_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_alert_states_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_alert_states_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          abbreviation: string
          active: boolean
          business_id: string | null
          category: string | null
          created_at: string
          id: string
          is_base: boolean
          is_system: boolean
          name: string
        }
        Insert: {
          abbreviation: string
          active?: boolean
          business_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_base?: boolean
          is_system?: boolean
          name: string
        }
        Update: {
          abbreviation?: string
          active?: boolean
          business_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_base?: boolean
          is_system?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_units_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_audit_logs: {
        Row: {
          branch_id: string | null
          business_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          content_preview: string | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          event_id: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          queued_at: string
          recipient_email: string | null
          recipient_role: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          subject: string | null
          trigger_source: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          channel: Database["public"]["Enums"]["notification_channel"]
          content_preview?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          queued_at?: string
          recipient_email?: string | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          subject?: string | null
          trigger_source: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          content_preview?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type_key"]
          queued_at?: string
          recipient_email?: string | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          subject?: string | null
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_audit_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_defaults: {
        Row: {
          applicable_roles: string[] | null
          created_at: string
          default_email_enabled: boolean
          default_in_app_enabled: boolean
          default_push_enabled: boolean
          default_settings: Json
          description: string | null
          id: string
          is_available: boolean
          is_critical: boolean
          is_enforced: boolean
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          updated_at: string
        }
        Insert: {
          applicable_roles?: string[] | null
          created_at?: string
          default_email_enabled?: boolean
          default_in_app_enabled?: boolean
          default_push_enabled?: boolean
          default_settings?: Json
          description?: string | null
          id?: string
          is_available?: boolean
          is_critical?: boolean
          is_enforced?: boolean
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          updated_at?: string
        }
        Update: {
          applicable_roles?: string[] | null
          created_at?: string
          default_email_enabled?: boolean
          default_in_app_enabled?: boolean
          default_push_enabled?: boolean
          default_settings?: Json
          description?: string | null
          id?: string
          is_available?: boolean
          is_critical?: boolean
          is_enforced?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type_key"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          dedup_expires_at: string | null
          dedup_key: string | null
          event_data: Json
          event_source: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          processed_at: string | null
          retry_count: number
          status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          dedup_expires_at?: string | null
          dedup_key?: string | null
          event_data?: Json
          event_source: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          processed_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          dedup_expires_at?: string | null
          dedup_key?: string | null
          event_data?: Json
          event_source?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          notification_type?: Database["public"]["Enums"]["notification_type_key"]
          processed_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          business_id: string
          created_at: string
          daily_sales_summary_email: string | null
          daily_sales_summary_enabled: boolean
          id: string
          low_stock_alerts_email: string | null
          low_stock_alerts_enabled: boolean
          new_order_notifications: boolean
          updated_at: string
          weekly_sales_summary_email: string | null
          weekly_sales_summary_enabled: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          daily_sales_summary_email?: string | null
          daily_sales_summary_enabled?: boolean
          id?: string
          low_stock_alerts_email?: string | null
          low_stock_alerts_enabled?: boolean
          new_order_notifications?: boolean
          updated_at?: string
          weekly_sales_summary_email?: string | null
          weekly_sales_summary_enabled?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          daily_sales_summary_email?: string | null
          daily_sales_summary_enabled?: boolean
          id?: string
          low_stock_alerts_email?: string | null
          low_stock_alerts_enabled?: boolean
          new_order_notifications?: boolean
          updated_at?: string
          weekly_sales_summary_email?: string | null
          weekly_sales_summary_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sales_queue: {
        Row: {
          business_id: string | null
          cashier_id: string | null
          created_at: string | null
          device_id: string | null
          error_message: string | null
          id: string
          payload: Json
          status: string | null
          synced_at: string | null
        }
        Insert: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          status?: string | null
          synced_at?: string | null
        }
        Update: {
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          status?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_sales_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sales_queue_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_required: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_mismatches: {
        Row: {
          business_id: string
          created_at: string
          error_message: string | null
          expected_cycle: string | null
          expected_plan: string | null
          id: string
          payment_amount: number
          payment_date: string
          payment_reference: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          error_message?: string | null
          expected_cycle?: string | null
          expected_plan?: string | null
          id?: string
          payment_amount: number
          payment_date?: string
          payment_reference: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          error_message?: string | null
          expected_cycle?: string | null
          expected_plan?: string | null
          id?: string
          payment_amount?: number
          payment_date?: string
          payment_reference?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_mismatches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          failure_reason: string | null
          gateway_reference: string | null
          gateway_response: Json | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          payment_type: string
          processed: boolean
          processed_at: string | null
          reference: string
          source: string
          status: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_type?: string
          processed?: boolean
          processed_at?: string | null
          reference: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_type?: string
          processed?: boolean
          processed_at?: string | null
          reference?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          allowances: number
          basic_salary: number
          business_id: string
          created_at: string
          deductions: number
          id: string
          net_salary: number
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          business_id: string
          created_at?: string
          deductions?: number
          id?: string
          net_salary?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start: string
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowances?: number
          basic_salary?: number
          business_id?: string
          created_at?: string
          deductions?: number
          id?: string
          net_salary?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_checks: {
        Row: {
          checked_at: string
          endpoint_name: string
          endpoint_url: string
          error_message: string | null
          id: string
          is_healthy: boolean
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          endpoint_name: string
          endpoint_url: string
          error_message?: string | null
          id?: string
          is_healthy?: boolean
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          endpoint_name?: string
          endpoint_url?: string
          error_message?: string | null
          id?: string
          is_healthy?: boolean
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          new_role: string | null
          old_role: string | null
          permission: Database["public"]["Enums"]["permission_key"] | null
          staff_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          new_role?: string | null
          old_role?: string | null
          permission?: Database["public"]["Enums"]["permission_key"] | null
          staff_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          new_role?: string | null
          old_role?: string | null
          permission?: Database["public"]["Enums"]["permission_key"] | null
          staff_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_definitions: {
        Row: {
          created_at: string
          deprecated_maps_to: string | null
          description: string | null
          display_name: string
          display_order: number
          group_key: string | null
          id: string
          is_deprecated: boolean
          is_enterprise_only: boolean
          permission_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deprecated_maps_to?: string | null
          description?: string | null
          display_name: string
          display_order?: number
          group_key?: string | null
          id?: string
          is_deprecated?: boolean
          is_enterprise_only?: boolean
          permission_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deprecated_maps_to?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          group_key?: string | null
          id?: string
          is_deprecated?: boolean
          is_enterprise_only?: boolean
          permission_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_definitions_group_key_fkey"
            columns: ["group_key"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["group_key"]
          },
        ]
      }
      permission_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          group_key: string
          group_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          group_key: string
          group_name: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          group_key?: string
          group_name?: string
          id?: string
        }
        Relationships: []
      }
      plan_cost_estimates: {
        Row: {
          estimated_cost_per_subscriber: number
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          estimated_cost_per_subscriber?: number
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          estimated_cost_per_subscriber?: number
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          limits: Json | null
          plan: Database["public"]["Enums"]["bvbooks_plan"]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          limits?: Json | null
          plan: Database["public"]["Enums"]["bvbooks_plan"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          limits?: Json | null
          plan?: Database["public"]["Enums"]["bvbooks_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          max_branches: number
          max_products: number | null
          max_staff: number
          monthly_price: number | null
          plan: Database["public"]["Enums"]["bvbooks_plan"]
          trial_days: number | null
          updated_at: string
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          max_branches?: number
          max_products?: number | null
          max_staff?: number
          monthly_price?: number | null
          plan: Database["public"]["Enums"]["bvbooks_plan"]
          trial_days?: number | null
          updated_at?: string
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          max_branches?: number
          max_products?: number | null
          max_staff?: number
          monthly_price?: number | null
          plan?: Database["public"]["Enums"]["bvbooks_plan"]
          trial_days?: number | null
          updated_at?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      plan_transitions: {
        Row: {
          created_at: string
          direction: string
          from_plan: Database["public"]["Enums"]["subscription_plan"]
          id: string
          is_allowed: boolean
          requires_payment: boolean
          to_plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Insert: {
          created_at?: string
          direction: string
          from_plan: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          is_allowed?: boolean
          requires_payment?: boolean
          to_plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Update: {
          created_at?: string
          direction?: string
          from_plan?: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          is_allowed?: boolean
          requires_payment?: boolean
          to_plan?: Database["public"]["Enums"]["subscription_plan"]
        }
        Relationships: []
      }
      platform_costs: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          created_by: string | null
          description: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_features: {
        Row: {
          applicable_plans: Database["public"]["Enums"]["subscription_plan"][]
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applicable_plans?: Database["public"]["Enums"]["subscription_plan"][]
          category?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applicable_plans?: Database["public"]["Enums"]["subscription_plan"][]
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_sync_logs: {
        Row: {
          business_id: string | null
          business_name: string | null
          completed_at: string | null
          created_at: string
          domain: string
          drift_count: number | null
          drift_details: Json | null
          error_message: string | null
          fix_results: Json | null
          fixes_applied: number | null
          id: string
          mode: string
          performed_by: string
          performed_by_email: string
          started_at: string
          status: string
          sync_id: string
        }
        Insert: {
          business_id?: string | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          domain: string
          drift_count?: number | null
          drift_details?: Json | null
          error_message?: string | null
          fix_results?: Json | null
          fixes_applied?: number | null
          id?: string
          mode?: string
          performed_by: string
          performed_by_email: string
          started_at?: string
          status?: string
          sync_id: string
        }
        Update: {
          business_id?: string | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          domain?: string
          drift_count?: number | null
          drift_details?: Json | null
          error_message?: string | null
          fix_results?: Json | null
          fixes_applied?: number | null
          id?: string
          mode?: string
          performed_by?: string
          performed_by_email?: string
          started_at?: string
          status?: string
          sync_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sync_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allows_decimal_quantity: boolean
          allows_price_based_sale: boolean
          barcode: string | null
          business_id: string
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          quantity_type: string
          selling_price: number
          sku: string | null
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          allows_decimal_quantity?: boolean
          allows_price_based_sale?: boolean
          barcode?: string | null
          business_id: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          quantity_type?: string
          selling_price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          allows_decimal_quantity?: boolean
          allows_price_based_sale?: boolean
          barcode?: string | null
          business_id?: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          quantity_type?: string
          selling_price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pumps: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string
          current_meter_reading: number
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          is_active: boolean
          name: string
          price_per_liter: number
          unit: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string
          current_meter_reading?: number
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_active?: boolean
          name: string
          price_per_liter?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string
          current_meter_reading?: number
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_active?: boolean
          name?: string
          price_per_liter?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pumps_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pumps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string
          received_date: string | null
          status: string
          subtotal: number
          supplier_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      reconciliations: {
        Row: {
          actual_amount: number
          branch_id: string | null
          business_id: string
          cashier_id: string
          created_at: string
          difference: number
          expected_amount: number
          id: string
          payment_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sale_date: string
          status: Database["public"]["Enums"]["reconciliation_status"]
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          branch_id?: string | null
          business_id: string
          cashier_id: string
          created_at?: string
          difference?: number
          expected_amount?: number
          id?: string
          payment_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_date: string
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          branch_id?: string | null
          business_id?: string
          cashier_id?: string
          created_at?: string
          difference?: number
          expected_amount?: number
          id?: string
          payment_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_settings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_discount_percent: number
          min_points_to_redeem: number
          naira_per_point: number | null
          points_expiry_months: number | null
          points_per_naira: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_discount_percent?: number
          min_points_to_redeem?: number
          naira_per_point?: number | null
          points_expiry_months?: number | null
          points_per_naira?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_discount_percent?: number
          min_points_to_redeem?: number
          naira_per_point?: number | null
          points_expiry_months?: number | null
          points_per_naira?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          activity_risk: number
          ai_summary: string | null
          business_id: string
          compliance_risk: number
          created_at: string | null
          fraud_indicators: Json | null
          id: string
          last_calculated_at: string | null
          overall_score: number
          payment_risk: number
          updated_at: string | null
        }
        Insert: {
          activity_risk?: number
          ai_summary?: string | null
          business_id: string
          compliance_risk?: number
          created_at?: string | null
          fraud_indicators?: Json | null
          id?: string
          last_calculated_at?: string | null
          overall_score?: number
          payment_risk?: number
          updated_at?: string | null
        }
        Update: {
          activity_risk?: number
          ai_summary?: string | null
          business_id?: string
          compliance_risk?: number
          created_at?: string | null
          fraud_indicators?: Json | null
          id?: string
          last_calculated_at?: string | null
          overall_score?: number
          payment_risk?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          discount_limit: number | null
          id: string
          is_active: boolean
          is_locked: boolean
          is_system: boolean
          name: string
          permissions: Database["public"]["Enums"]["permission_key"][]
          refund_limit: number | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          discount_limit?: number | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_system?: boolean
          name: string
          permissions?: Database["public"]["Enums"]["permission_key"][]
          refund_limit?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          discount_limit?: number | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_system?: boolean
          name?: string
          permissions?: Database["public"]["Enums"]["permission_key"][]
          refund_limit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_idempotency_keys: {
        Row: {
          business_id: string
          created_at: string
          idempotency_key: string
          sale_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          idempotency_key: string
          sale_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          idempotency_key?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_idempotency_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number | null
          created_at: string
          discount: number
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          device_id: string | null
          discount_amount: number
          discount_approved_by: string | null
          discount_reason: string | null
          discount_type: string | null
          id: string
          invoice_number: string
          notes: string | null
          offline_signature: string | null
          payment_method: string
          payment_status: string
          rewards_redeemed_value: number | null
          subtotal: number
          sync_status: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_id?: string | null
          discount_amount?: number
          discount_approved_by?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          offline_signature?: string | null
          payment_method?: string
          payment_status?: string
          rewards_redeemed_value?: number | null
          subtotal?: number
          sync_status?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          device_id?: string | null
          discount_amount?: number
          discount_approved_by?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          offline_signature?: string | null
          payment_method?: string
          payment_status?: string
          rewards_redeemed_value?: number | null
          subtotal?: number
          sync_status?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_ledger: {
        Row: {
          amount: number
          business_id: string | null
          cashier_id: string | null
          created_at: string | null
          id: string
          payment_type: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          payment_type: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          payment_type?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          is_reviewed: boolean | null
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          title: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          is_reviewed?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          title: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          is_reviewed?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          title?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_intelligence: {
        Row: {
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          expires_at: string | null
          id: string
          intelligence_type: string
          is_actionable: boolean | null
          is_reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          signals: Json | null
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          expires_at?: string | null
          id?: string
          intelligence_type: string
          is_actionable?: boolean | null
          is_reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          signals?: Json | null
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          expires_at?: string | null
          id?: string
          intelligence_type?: string
          is_actionable?: boolean | null
          is_reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          signals?: Json | null
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      security_signals: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          device_session_id: string | null
          id: string
          ip_hash: string | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          signal_category: string
          signal_type: string
          title: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          device_session_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          signal_category: string
          signal_type: string
          title: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          device_session_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          signal_category?: string
          signal_type?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_signals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_signals_device_session_id_fkey"
            columns: ["device_session_id"]
            isOneToOne: false
            referencedRelation: "device_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          branch_id: string | null
          business_id: string
          cashier_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_type: string
          reference: string | null
          settlement_date: string
          source: Database["public"]["Enums"]["settlement_source"]
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          business_id: string
          cashier_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_type: string
          reference?: string | null
          settlement_date?: string
          source: Database["public"]["Enums"]["settlement_source"]
        }
        Update: {
          amount?: number
          branch_id?: string | null
          business_id?: string
          cashier_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          reference?: string | null
          settlement_date?: string
          source?: Database["public"]["Enums"]["settlement_source"]
        }
        Relationships: [
          {
            foreignKeyName: "settlements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          branch_id: string | null
          business_id: string
          created_at: string
          department_id: string | null
          email: string | null
          employee_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          role: string
          salary: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          business_id: string
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          business_id?: string
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          role_template_id: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          role_template_id?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          role_template_id?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branch_assignments_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branch_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          invited_by: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          email: string
          expires_at: string
          full_name: string
          id?: string
          invitation_token: string
          invited_by?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_key"]
          staff_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["permission_key"]
          staff_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_key"]
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_risk_scores: {
        Row: {
          after_hours_count: number
          business_id: string
          cash_shortage_count: number
          created_at: string
          discount_count: number
          id: string
          last_calculated_at: string
          notes: string | null
          period_end: string
          period_start: string
          refund_count: number
          risk_level: string
          risk_score: number
          staff_id: string
          updated_at: string
          void_count: number
        }
        Insert: {
          after_hours_count?: number
          business_id: string
          cash_shortage_count?: number
          created_at?: string
          discount_count?: number
          id?: string
          last_calculated_at?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          refund_count?: number
          risk_level?: string
          risk_score?: number
          staff_id: string
          updated_at?: string
          void_count?: number
        }
        Update: {
          after_hours_count?: number
          business_id?: string
          cash_shortage_count?: number
          created_at?: string
          discount_count?: number
          id?: string
          last_calculated_at?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          refund_count?: number
          risk_level?: string
          risk_score?: number
          staff_id?: string
          updated_at?: string
          void_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_risk_scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_risk_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          movement_type: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reconciliation_items: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          physical_quantity: number | null
          product_id: string
          reconciliation_id: string
          status: string
          system_quantity: number
          variance: number | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          physical_quantity?: number | null
          product_id: string
          reconciliation_id: string
          status?: string
          system_quantity: number
          variance?: number | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          physical_quantity?: number | null
          product_id?: string
          reconciliation_id?: string
          status?: string
          system_quantity?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reconciliation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "stock_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reconciliations: {
        Row: {
          branch_id: string
          business_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          items_counted: number | null
          items_with_variance: number | null
          notes: string | null
          started_by: string
          status: string
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items_counted?: number | null
          items_with_variance?: number | null
          notes?: string | null
          started_by: string
          status?: string
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items_counted?: number | null
          items_with_variance?: number | null
          notes?: string | null
          started_by?: string
          status?: string
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string | null
          business_id: string
          change_reason: string | null
          changed_by: string | null
          created_at: string
          currency: string
          end_date: string | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          previous_plan: Database["public"]["Enums"]["subscription_plan"] | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string | null
          business_id: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          previous_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          business_id?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          previous_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_internal: boolean | null
          kb_article_ids: string[] | null
          message: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_type: Database["public"]["Enums"]["chat_sender_type"]
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          kb_article_ids?: string[] | null
          message: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: Database["public"]["Enums"]["chat_sender_type"]
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          kb_article_ids?: string[] | null
          message?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: Database["public"]["Enums"]["chat_sender_type"]
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_admin_id: string | null
          assigned_admin_name: string | null
          business_id: string
          client_email: string
          client_name: string
          client_user_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          escalated_at: string | null
          escalation_reason: string | null
          id: string
          last_message_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          ticket_id: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          assigned_admin_name?: string | null
          business_id: string
          client_email: string
          client_name: string
          client_user_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          ticket_id?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          assigned_admin_name?: string | null
          business_id?: string
          client_email?: string
          client_name?: string
          client_user_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          ticket_id?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          category: string
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          submitted_by_email: string
          submitted_by_name: string
          submitted_by_user_id: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          submitted_by_email: string
          submitted_by_name: string
          submitted_by_user_id?: string | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          submitted_by_email?: string
          submitted_by_name?: string
          submitted_by_user_id?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          business_id: string | null
          created_at: string | null
          device_id: string | null
          error_message: string | null
          id: string
          records_received: number | null
          records_sent: number | null
          status: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          records_received?: number | null
          records_sent?: number | null
          status?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          records_received?: number | null
          records_sent?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          starts_at: string
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          starts_at?: string
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          responder_id: string | null
          responder_name: string
          responder_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          responder_id?: string | null
          responder_name: string
          responder_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          responder_id?: string | null
          responder_name?: string
          responder_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_device_associations: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          device_fingerprint_id: string
          first_associated_at: string | null
          id: string
          is_blocked: boolean | null
          is_primary: boolean | null
          last_used_at: string | null
          times_used: number | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          device_fingerprint_id: string
          first_associated_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_primary?: boolean | null
          last_used_at?: string | null
          times_used?: number | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          device_fingerprint_id?: string
          first_associated_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_primary?: boolean | null
          last_used_at?: string | null
          times_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_device_associations_device_fingerprint_id_fkey"
            columns: ["device_fingerprint_id"]
            isOneToOne: false
            referencedRelation: "device_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_last_seen_versions: {
        Row: {
          id: string
          last_seen_at: string
          last_seen_version: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          last_seen_version: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          last_seen_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_location_history: {
        Row: {
          access_count: number | null
          country_code: string | null
          first_seen_at: string | null
          id: string
          ip_hash: string
          is_trusted_location: boolean | null
          last_seen_at: string | null
          region: string | null
          user_id: string
        }
        Insert: {
          access_count?: number | null
          country_code?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash: string
          is_trusted_location?: boolean | null
          last_seen_at?: string | null
          region?: string | null
          user_id: string
        }
        Update: {
          access_count?: number | null
          country_code?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash?: string
          is_trusted_location?: boolean | null
          last_seen_at?: string | null
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          branch_ids: string[] | null
          business_id: string
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          is_enabled: boolean
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          push_enabled: boolean
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_ids?: string[] | null
          business_id: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          is_enabled?: boolean
          notification_type: Database["public"]["Enums"]["notification_type_key"]
          push_enabled?: boolean
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_ids?: string[] | null
          business_id?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          is_enabled?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type_key"]
          push_enabled?: boolean
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      version_audit_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["version_audit_action"]
          admin_email: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          version_id: string | null
          version_number: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["version_audit_action"]
          admin_email: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          version_id?: string | null
          version_number: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["version_audit_action"]
          admin_email?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          version_id?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_audit_logs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      versions: {
        Row: {
          changes: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          release_date: string | null
          release_notes: string | null
          release_type: Database["public"]["Enums"]["release_type"]
          status: Database["public"]["Enums"]["version_status"]
          summary: string | null
          title: string
          updated_at: string
          version_number: string
        }
        Insert: {
          changes?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          release_date?: string | null
          release_notes?: string | null
          release_type: Database["public"]["Enums"]["release_type"]
          status?: Database["public"]["Enums"]["version_status"]
          summary?: string | null
          title: string
          updated_at?: string
          version_number: string
        }
        Update: {
          changes?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          release_date?: string | null
          release_notes?: string | null
          release_type?: Database["public"]["Enums"]["release_type"]
          status?: Database["public"]["Enums"]["version_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          version_number?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          business_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_credited_at: string | null
          last_debited_at: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_credited_at?: string | null
          last_debited_at?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_credited_at?: string | null
          last_debited_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          received_at: string
          reference: string | null
          signature_valid: boolean
          source: string
        }
        Insert: {
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          reference?: string | null
          signature_valid?: boolean
          source?: string
        }
        Update: {
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          reference?: string | null
          signature_valid?: boolean
          source?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          reference: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          reference: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          reference?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_sales_summary: {
        Row: {
          branch_id: string | null
          business_id: string | null
          cashier_count: number | null
          entry_count: number | null
          grand_total: number | null
          pending_count: number | null
          sale_date: string | null
          shortage_count: number | null
          submitted_count: number | null
          total_cash: number | null
          total_expected: number | null
          total_liters: number | null
          total_pos: number | null
          total_transfer: number | null
          total_variance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_pump_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pump_sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      atomic_credit_wallet: {
        Args: {
          _amount: number
          _business_id: string
          _description?: string
          _reference: string
          _source?: string
          _transaction_id: string
        }
        Returns: Json
      }
      atomic_decrement_stock: {
        Args: {
          p_branch_id?: string
          p_business_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: boolean
      }
      auto_expire_subscriptions: { Args: never; Returns: undefined }
      calculate_reconciliation: {
        Args: {
          _business_id: string
          _cashier_id: string
          _payment_type: string
          _sale_date: string
        }
        Returns: Database["public"]["Enums"]["reconciliation_status"]
      }
      can_access: {
        Args: {
          _business_id: string
          _permission: Database["public"]["Enums"]["permission_key"]
        }
        Returns: boolean
      }
      can_access_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_branch_for_rls: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_business: { Args: { _business_id: string }; Returns: boolean }
      can_add_staff_to_branch: {
        Args: { _branch_id: string }
        Returns: boolean
      }
      check_addon_access: {
        Args: { _addon_feature_key: string; _business_id: string }
        Returns: Json
      }
      check_has_admin_role: {
        Args: {
          check_user_id: string
          required_role: Database["public"]["Enums"]["admin_role"]
        }
        Returns: boolean
      }
      check_is_admin: { Args: { check_user_id: string }; Returns: boolean }
      check_owns_business: { Args: { _business_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          _identifier: string
          _identifier_type: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: Json
      }
      check_user_needs_update: {
        Args: { _user_id: string }
        Returns: {
          current_version: string
          last_seen_version: string
          needs_update: boolean
          version_info: Json
        }[]
      }
      claim_background_jobs: {
        Args: { batch_size?: number }
        Returns: {
          attempts: number
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json | null
          result: Json | null
          scheduled_for: string
          started_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "background_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_next_job: {
        Args: never
        Returns: {
          attempts: number
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          payload: Json
        }[]
      }
      cleanup_old_error_logs: {
        Args: { _days_to_keep?: number }
        Returns: number
      }
      cleanup_old_login_attempts: { Args: never; Returns: number }
      cleanup_old_performance_checks: { Args: never; Returns: undefined }
      complete_business_setup: {
        Args: { _business_id: string }
        Returns: undefined
      }
      complete_job: {
        Args: { p_job_id: string; p_result?: Json }
        Returns: undefined
      }
      copy_system_role_templates_to_business: {
        Args: { p_business_id: string }
        Returns: undefined
      }
      create_sale_atomic: {
        Args: {
          p_branch_id?: string
          p_business_id: string
          p_created_by?: string
          p_customer_id?: string
          p_discount_amount?: number
          p_discount_approved_by?: string
          p_discount_reason?: string
          p_discount_type?: string
          p_items?: Json
          p_notes?: string
          p_payment_method?: string
          p_payment_status?: string
          p_rewards_redeemed_value?: number
          p_subtotal?: number
          p_tax_amount?: number
          p_total_amount?: number
        }
        Returns: Json
      }
      deduct_customer_rewards: {
        Args: { p_amount: number; p_customer_id: string }
        Returns: boolean
      }
      end_access_session: {
        Args: { _session_token_hash: string }
        Returns: undefined
      }
      end_admin_session: { Args: { _user_id: string }; Returns: undefined }
      enforce_subscription_access: {
        Args: { _business_id: string; _feature_key?: string }
        Returns: Json
      }
      enqueue_job: {
        Args: {
          p_job_type: Database["public"]["Enums"]["job_type"]
          p_payload?: Json
          p_priority?: number
          p_scheduled_for?: string
        }
        Returns: string
      }
      fail_job: {
        Args: { p_error: string; p_job_id: string }
        Returns: undefined
      }
      generate_brm_staff_id: { Args: never; Returns: string }
      get_active_version: {
        Args: never
        Returns: {
          changes: Json
          id: string
          release_date: string
          release_notes: string
          release_type: Database["public"]["Enums"]["release_type"]
          summary: string
          title: string
          version_number: string
        }[]
      }
      get_addon_effective_expiry: {
        Args: { _addon_id: string }
        Returns: string
      }
      get_admin_permissions: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["super_admin_permission"][]
      }
      get_branch_permissions: {
        Args: { _branch_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["permission_key"][]
      }
      get_branch_staff_capacity: {
        Args: { _branch_id: string }
        Returns: {
          addon_staff: number
          base_staff: number
          current_staff: number
          total_capacity: number
        }[]
      }
      get_brm_id: { Args: never; Returns: string }
      get_business_addon_statuses: {
        Args: { _business_id: string }
        Returns: {
          addon_id: string
          billing_cycle: string
          branch_id: string
          branch_name: string
          computed_status: string
          currency: string
          effective_end_date: string
          end_date: string
          feature_key: string
          feature_name: string
          is_aligned: boolean
          price: number
          start_date: string
          status: string
        }[]
      }
      get_feature_limits: {
        Args: { _business_id: string; _feature_key: string }
        Returns: Json
      }
      get_latest_version_number: { Args: never; Returns: string }
      get_owned_business_id: { Args: never; Returns: string }
      get_owner_brm_id: { Args: never; Returns: string }
      get_performance_summary: { Args: never; Returns: Json }
      get_plan_branch_limit: { Args: { _business_id: string }; Returns: number }
      get_plan_staff_limit: { Args: { _business_id: string }; Returns: number }
      get_plan_staff_limit_for_branch: {
        Args: { _branch_id: string; _business_id: string }
        Returns: number
      }
      get_security_summary: { Args: never; Returns: Json }
      get_staff_accessible_branches: {
        Args: { _user_id: string }
        Returns: {
          branch_id: string
          branch_name: string
          expires_at: string
          is_primary: boolean
          permissions: Database["public"]["Enums"]["permission_key"][]
          role_name: string
          role_template_id: string
        }[]
      }
      get_staff_business_id: { Args: never; Returns: string }
      get_staff_id_for_business: {
        Args: { _business_id: string }
        Returns: string
      }
      get_staff_permissions: {
        Args: { _staff_id: string }
        Returns: Database["public"]["Enums"]["permission_key"][]
      }
      get_staff_role_for_rls: { Args: { _user_id: string }; Returns: string }
      get_user_accessible_business_id: { Args: never; Returns: string }
      get_user_admin_role: {
        Args: { check_user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_user_business_id: { Args: never; Returns: string }
      get_user_domain: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["auth_domain"]
      }
      grant_permission: {
        Args: {
          _granted_by?: string
          _permission: Database["public"]["Enums"]["permission_key"]
          _staff_id: string
        }
        Returns: undefined
      }
      has_active_subscription: {
        Args: { _business_id: string }
        Returns: boolean
      }
      has_admin_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_branch_permission: {
        Args: {
          _branch_id: string
          _permission: Database["public"]["Enums"]["permission_key"]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission:
        | {
            Args: {
              _business_id: string
              _permission: Database["public"]["Enums"]["permission_key"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _permission: Database["public"]["Enums"]["permission_key"]
              _user_id: string
            }
            Returns: boolean
          }
      has_super_admin_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["super_admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_business_revenue: {
        Args: { _amount: number; _business_id: string }
        Returns: undefined
      }
      invalidate_user_sessions: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_brm: { Args: { _user_id: string }; Returns: boolean }
      is_brm_for_business: { Args: { _business_id: string }; Returns: boolean }
      is_brm_of_business: {
        Args: { check_business_id: string }
        Returns: boolean
      }
      is_business_owner: { Args: { _business_id: string }; Returns: boolean }
      is_day_locked: {
        Args: { _business_id: string; _cashier_id: string; _sale_date: string }
        Returns: boolean
      }
      is_feature_enabled: {
        Args: { _business_id: string; _feature_key: string }
        Returns: boolean
      }
      is_super_admin_domain: { Args: { _user_id: string }; Returns: boolean }
      log_error: {
        Args: {
          _error_code?: string
          _error_message: string
          _function_name: string
          _request_context?: Json
          _response_time_ms?: number
          _severity: Database["public"]["Enums"]["error_severity"]
          _source: Database["public"]["Enums"]["error_source"]
        }
        Returns: string
      }
      log_security_alert: {
        Args: {
          _alert_type: string
          _description?: string
          _ip_address?: string
          _metadata?: Json
          _severity: string
          _title: string
          _user_id?: string
        }
        Returns: string
      }
      log_version_action: {
        Args: {
          _action_type: Database["public"]["Enums"]["version_audit_action"]
          _admin_email: string
          _admin_id: string
          _details?: Json
          _ip_address?: string
          _user_agent?: string
          _version_id: string
          _version_number: string
        }
        Returns: string
      }
      publish_version: {
        Args: { _admin_email: string; _admin_id: string; _version_id: string }
        Returns: boolean
      }
      record_access_session: {
        Args: {
          _access_type?: string
          _app_version?: string
          _business_id?: string
          _country_code?: string
          _device_fingerprint_hash?: string
          _device_metadata?: Json
          _entry_point?: string
          _ip_hash?: string
          _language?: string
          _region?: string
          _session_token_hash: string
          _timezone?: string
          _user_id?: string
        }
        Returns: string
      }
      record_admin_session: {
        Args: {
          _ip_address?: string
          _session_token: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      record_client_login: {
        Args: {
          _business_id: string
          _device_type?: string
          _staff_id?: string
          _user_email?: string
          _user_name?: string
          _user_type?: string
        }
        Returns: undefined
      }
      record_login_attempt: {
        Args: {
          _attempt_type: string
          _identifier: string
          _identifier_type: string
          _ip_address?: string
          _user_agent?: string
        }
        Returns: undefined
      }
      record_stock_movement: {
        Args: {
          p_branch_id: string
          p_business_id: string
          p_movement_type: string
          p_new_quantity: number
          p_notes?: string
          p_previous_quantity: number
          p_product_id: string
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: undefined
      }
      revoke_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["permission_key"]
          _staff_id: string
        }
        Returns: undefined
      }
      rollback_version: {
        Args: {
          _admin_email: string
          _admin_id: string
          _reason?: string
          _target_version_id: string
        }
        Returns: boolean
      }
      run_daily_reconciliation: {
        Args: { _business_id: string; _date?: string }
        Returns: number
      }
      set_addon_independent_expiry: {
        Args: {
          _addon_id: string
          _admin_user_id: string
          _new_end_date: string
          _reason: string
        }
        Returns: undefined
      }
      set_staff_permissions: {
        Args: {
          _permissions: Database["public"]["Enums"]["permission_key"][]
          _staff_id: string
        }
        Returns: undefined
      }
      stamp_business_login: {
        Args: { _business_id: string }
        Returns: undefined
      }
      trigger_scheduled_notifications: {
        Args: { notification_type?: string }
        Returns: undefined
      }
      update_sync_status: {
        Args: {
          _business_id: string
          _cashier_id: string
          _increment_synced?: number
          _sale_date: string
        }
        Returns: undefined
      }
      update_user_last_seen_version: {
        Args: { _user_id: string; _version_number: string }
        Returns: undefined
      }
      validate_offline_transaction: {
        Args: {
          _branch_id: string
          _device_id: string
          _signature: string
          _timestamp: string
          _transaction_id: string
        }
        Returns: Json
      }
      validate_super_admin_access: {
        Args: {
          _email: string
          _ip_address?: string
          _resource: string
          _user_agent?: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status:
        | "active"
        | "suspended"
        | "deactivated"
        | "closed_pending_deletion"
        | "deleted"
      admin_role: "super_admin" | "finance_admin" | "support_admin"
      auth_domain: "super_admin" | "client"
      brm_incentive_status: "pending" | "approved" | "paid" | "rejected"
      brm_incentive_type:
        | "signup"
        | "renewal"
        | "upgrade_bonus"
        | "renewal_bonus"
      brm_message_sender: "brm" | "client_admin"
      brm_status: "active" | "inactive" | "suspended"
      bvbooks_plan: "free" | "professional" | "enterprise"
      chat_sender_type: "client_admin" | "super_admin" | "ai"
      conversation_status:
        | "ai_only"
        | "escalated"
        | "human_active"
        | "closed"
        | "ticket_created"
      cost_category:
        | "payment_processing"
        | "infrastructure"
        | "communication"
        | "support"
        | "other"
      entity_type:
        | "business"
        | "subscription"
        | "staff"
        | "restriction"
        | "auth"
      error_severity: "info" | "warning" | "error" | "critical"
      error_source: "edge_function" | "database" | "webhook" | "frontend"
      fuel_type: "pms" | "ago" | "dpk" | "lpg"
      job_log_event: "enqueued" | "started" | "completed" | "failed" | "retried"
      job_status: "pending" | "processing" | "completed" | "failed"
      job_type:
        | "report_generation"
        | "inventory_recalculation"
        | "daily_summary"
      kyc_status: "pending" | "verified" | "rejected"
      notification_channel: "in_app" | "email" | "push"
      notification_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "failed"
        | "retrying"
      notification_type: "info" | "warning" | "success" | "error"
      notification_type_key:
        | "low_stock_alert"
        | "daily_sales_summary"
        | "weekly_sales_report"
        | "new_sale_notification"
        | "approval_request"
        | "approval_resolved"
        | "after_hours_alert"
        | "system_announcement"
        | "monthly_sales_report"
      onboarding_status: "new" | "active" | "at_risk" | "setup_complete"
      permission_key:
        | "pos.access"
        | "pos.sale.create"
        | "pos.sale.cancel"
        | "pos.sale.refund"
        | "pos.discount.apply"
        | "pos.discount.override"
        | "inventory.view"
        | "inventory.item.create"
        | "inventory.item.edit"
        | "inventory.item.delete"
        | "inventory.adjust.create"
        | "inventory.adjust.approve"
        | "inventory.price.view_cost"
        | "inventory.price.edit"
        | "sales.view"
        | "sales.view.all"
        | "sales.edit"
        | "sales.delete"
        | "reports.view.summary"
        | "reports.view.financial"
        | "reports.view.inventory"
        | "reports.export"
        | "staff.view"
        | "staff.manage"
        | "staff.suspend"
        | "staff.permissions.manage"
        | "crm.view"
        | "crm.manage"
        | "crm.credit.manage"
        | "expenses.view"
        | "expenses.create"
        | "expenses.approve"
        | "accounting.view"
        | "accounting.manage"
        | "settings.view"
        | "settings.manage"
        | "settings.branches.manage"
        | "audit.view"
        | "approval.refund"
        | "approval.stock_adjustment"
        | "approval.discount"
        | "dashboard.profit.view"
        | "dashboard.alerts.view"
        | "dashboard.team_activity.view"
        | "dashboard.top_selling.view"
        | "dashboard.staff_risk.view"
        | "dashboard.branch_performance.view"
        | "dashboard.after_hours.view"
        | "gas.sales.entry"
        | "gas.sales.view_own"
        | "gas.summary.view"
        | "gas.pumps.manage"
        | "accounting.settlements.view"
        | "accounting.settlements.manage"
        | "accounting.reconciliations.view"
        | "accounting.overview.view"
        | "accounting.reconciliations.manage"
        | "pos.rewards.redeem"
        | "settings.rewards.manage"
        | "approval.discount.stop"
        | "settings.addons.view"
        | "settings.addons.manage"
        | "sales.performance.view"
        | "sales.reports.view"
        | "sales.data.export"
        | "stock.catalog.view"
        | "stock.catalog.manage"
        | "stock.categories.view"
        | "stock.categories.manage"
        | "stock.levels.view"
        | "stock.adjust"
        | "stock.adjustments.history"
        | "stock.suppliers.manage"
        | "stock.orders.view"
        | "stock.orders.create"
        | "stock.orders.approve"
        | "customers.overview.view"
        | "customers.activity.view"
        | "customers.groups.manage"
        | "customers.rewards.view"
        | "customers.rewards.manage"
        | "operations.expenses.record"
        | "operations.expenses.view"
        | "operations.expenses.approve"
        | "operations.approvals.view"
        | "operations.alerts.receive"
        | "operations.alerts.resolve"
        | "insights.reports.view"
        | "insights.financial.view"
        | "insights.settlements.view"
        | "insights.reconciliations.view"
        | "insights.reports.export"
        | "people.team.view"
        | "people.team.manage"
        | "people.roles.assign"
        | "people.departments.view"
        | "people.departments.manage"
        | "people.attendance.view"
        | "people.attendance.manage"
        | "people.payroll.view"
        | "people.payroll.manage"
        | "people.leave.view"
        | "people.leave.approve"
        | "settings.business.view"
        | "settings.business.manage"
        | "settings.activity.view"
        | "settings.activity.export"
        | "settings.help.access"
        | "support.help_center.view"
        | "support.chat.access"
        | "support.brm.contact"
      reconciliation_status: "balanced" | "shortage" | "excess" | "pending"
      release_type: "major" | "minor" | "patch"
      settlement_source: "pos_terminal" | "bank" | "cash_count" | "manual"
      subscription_plan: "free" | "professional" | "enterprise"
      super_admin_permission:
        | "view_clients"
        | "suspend_client"
        | "view_financials"
        | "initiate_refund"
        | "export_reports"
        | "view_audit_logs"
        | "manage_admins"
      version_audit_action:
        | "create"
        | "edit"
        | "publish"
        | "rollback"
        | "activate"
        | "deactivate"
      version_status: "draft" | "published"
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
      account_status: [
        "active",
        "suspended",
        "deactivated",
        "closed_pending_deletion",
        "deleted",
      ],
      admin_role: ["super_admin", "finance_admin", "support_admin"],
      auth_domain: ["super_admin", "client"],
      brm_incentive_status: ["pending", "approved", "paid", "rejected"],
      brm_incentive_type: [
        "signup",
        "renewal",
        "upgrade_bonus",
        "renewal_bonus",
      ],
      brm_message_sender: ["brm", "client_admin"],
      brm_status: ["active", "inactive", "suspended"],
      bvbooks_plan: ["free", "professional", "enterprise"],
      chat_sender_type: ["client_admin", "super_admin", "ai"],
      conversation_status: [
        "ai_only",
        "escalated",
        "human_active",
        "closed",
        "ticket_created",
      ],
      cost_category: [
        "payment_processing",
        "infrastructure",
        "communication",
        "support",
        "other",
      ],
      entity_type: ["business", "subscription", "staff", "restriction", "auth"],
      error_severity: ["info", "warning", "error", "critical"],
      error_source: ["edge_function", "database", "webhook", "frontend"],
      fuel_type: ["pms", "ago", "dpk", "lpg"],
      job_log_event: ["enqueued", "started", "completed", "failed", "retried"],
      job_status: ["pending", "processing", "completed", "failed"],
      job_type: [
        "report_generation",
        "inventory_recalculation",
        "daily_summary",
      ],
      kyc_status: ["pending", "verified", "rejected"],
      notification_channel: ["in_app", "email", "push"],
      notification_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "failed",
        "retrying",
      ],
      notification_type: ["info", "warning", "success", "error"],
      notification_type_key: [
        "low_stock_alert",
        "daily_sales_summary",
        "weekly_sales_report",
        "new_sale_notification",
        "approval_request",
        "approval_resolved",
        "after_hours_alert",
        "system_announcement",
        "monthly_sales_report",
      ],
      onboarding_status: ["new", "active", "at_risk", "setup_complete"],
      permission_key: [
        "pos.access",
        "pos.sale.create",
        "pos.sale.cancel",
        "pos.sale.refund",
        "pos.discount.apply",
        "pos.discount.override",
        "inventory.view",
        "inventory.item.create",
        "inventory.item.edit",
        "inventory.item.delete",
        "inventory.adjust.create",
        "inventory.adjust.approve",
        "inventory.price.view_cost",
        "inventory.price.edit",
        "sales.view",
        "sales.view.all",
        "sales.edit",
        "sales.delete",
        "reports.view.summary",
        "reports.view.financial",
        "reports.view.inventory",
        "reports.export",
        "staff.view",
        "staff.manage",
        "staff.suspend",
        "staff.permissions.manage",
        "crm.view",
        "crm.manage",
        "crm.credit.manage",
        "expenses.view",
        "expenses.create",
        "expenses.approve",
        "accounting.view",
        "accounting.manage",
        "settings.view",
        "settings.manage",
        "settings.branches.manage",
        "audit.view",
        "approval.refund",
        "approval.stock_adjustment",
        "approval.discount",
        "dashboard.profit.view",
        "dashboard.alerts.view",
        "dashboard.team_activity.view",
        "dashboard.top_selling.view",
        "dashboard.staff_risk.view",
        "dashboard.branch_performance.view",
        "dashboard.after_hours.view",
        "gas.sales.entry",
        "gas.sales.view_own",
        "gas.summary.view",
        "gas.pumps.manage",
        "accounting.settlements.view",
        "accounting.settlements.manage",
        "accounting.reconciliations.view",
        "accounting.overview.view",
        "accounting.reconciliations.manage",
        "pos.rewards.redeem",
        "settings.rewards.manage",
        "approval.discount.stop",
        "settings.addons.view",
        "settings.addons.manage",
        "sales.performance.view",
        "sales.reports.view",
        "sales.data.export",
        "stock.catalog.view",
        "stock.catalog.manage",
        "stock.categories.view",
        "stock.categories.manage",
        "stock.levels.view",
        "stock.adjust",
        "stock.adjustments.history",
        "stock.suppliers.manage",
        "stock.orders.view",
        "stock.orders.create",
        "stock.orders.approve",
        "customers.overview.view",
        "customers.activity.view",
        "customers.groups.manage",
        "customers.rewards.view",
        "customers.rewards.manage",
        "operations.expenses.record",
        "operations.expenses.view",
        "operations.expenses.approve",
        "operations.approvals.view",
        "operations.alerts.receive",
        "operations.alerts.resolve",
        "insights.reports.view",
        "insights.financial.view",
        "insights.settlements.view",
        "insights.reconciliations.view",
        "insights.reports.export",
        "people.team.view",
        "people.team.manage",
        "people.roles.assign",
        "people.departments.view",
        "people.departments.manage",
        "people.attendance.view",
        "people.attendance.manage",
        "people.payroll.view",
        "people.payroll.manage",
        "people.leave.view",
        "people.leave.approve",
        "settings.business.view",
        "settings.business.manage",
        "settings.activity.view",
        "settings.activity.export",
        "settings.help.access",
        "support.help_center.view",
        "support.chat.access",
        "support.brm.contact",
      ],
      reconciliation_status: ["balanced", "shortage", "excess", "pending"],
      release_type: ["major", "minor", "patch"],
      settlement_source: ["pos_terminal", "bank", "cash_count", "manual"],
      subscription_plan: ["free", "professional", "enterprise"],
      super_admin_permission: [
        "view_clients",
        "suspend_client",
        "view_financials",
        "initiate_refund",
        "export_reports",
        "view_audit_logs",
        "manage_admins",
      ],
      version_audit_action: [
        "create",
        "edit",
        "publish",
        "rollback",
        "activate",
        "deactivate",
      ],
      version_status: ["draft", "published"],
    },
  },
} as const
