export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      apps: {
        Row: {
          id: string
          name: string
          bundle_identifier: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          bundle_identifier: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          bundle_identifier?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: number
          app_id: string
          received_at: string
          ip_hash: string
          app_version: string | null
          os_version: string | null
          cpu_arch: string | null
          core_count: number | null
          language: string | null
          model_identifier: string | null
          ram_mb: number | null
        }
        Insert: {
          id?: number
          app_id: string
          received_at?: string
          ip_hash: string
          app_version?: string | null
          os_version?: string | null
          cpu_arch?: string | null
          core_count?: number | null
          language?: string | null
          model_identifier?: string | null
          ram_mb?: number | null
        }
        Update: {
          id?: number
          app_id?: string
          received_at?: string
          ip_hash?: string
          app_version?: string | null
          os_version?: string | null
          cpu_arch?: string | null
          core_count?: number | null
          language?: string | null
          model_identifier?: string | null
          ram_mb?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_report_counts: {
        Args: {
          app_id_filter?: string | null
          start_date_filter?: string
          end_date_filter?: string
        }
        Returns: { report_day: string; report_count: number }[]
      }
      get_latest_app_version: {
        // Added new function
        Args: {
          app_id_filter?: string | null
          start_date_filter?: string
          end_date_filter?: string
        }
        Returns: string | null // The function returns TEXT which can be string or null
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
