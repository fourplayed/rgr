export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      asset_count_combination_metadata: {
        Row: {
          combination_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          session_id: string;
        };
        Insert: {
          combination_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          session_id: string;
        };
        Update: {
          combination_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_count_combination_metadata_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'asset_count_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_count_combination_photos: {
        Row: {
          combination_id: string;
          created_at: string;
          id: string;
          photo_id: string;
          session_id: string;
        };
        Insert: {
          combination_id: string;
          created_at?: string;
          id?: string;
          photo_id: string;
          session_id: string;
        };
        Update: {
          combination_id?: string;
          created_at?: string;
          id?: string;
          photo_id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_count_combination_photos_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: true;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_count_combination_photos_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'asset_count_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_count_items: {
        Row: {
          asset_id: string;
          combination_id: string | null;
          combination_position: number | null;
          id: string;
          scanned_at: string;
          session_id: string;
        };
        Insert: {
          asset_id: string;
          combination_id?: string | null;
          combination_position?: number | null;
          id?: string;
          scanned_at?: string;
          session_id: string;
        };
        Update: {
          asset_id?: string;
          combination_id?: string | null;
          combination_position?: number | null;
          id?: string;
          scanned_at?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_count_items_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_count_items_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'asset_count_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_count_sessions: {
        Row: {
          completed_at: string | null;
          counted_by: string;
          created_at: string;
          depot_id: string;
          id: string;
          notes: string | null;
          started_at: string;
          status: string;
          total_assets_counted: number;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          counted_by: string;
          created_at?: string;
          depot_id: string;
          id?: string;
          notes?: string | null;
          started_at?: string;
          status?: string;
          total_assets_counted?: number;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          counted_by?: string;
          created_at?: string;
          depot_id?: string;
          id?: string;
          notes?: string | null;
          started_at?: string;
          status?: string;
          total_assets_counted?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_count_sessions_counted_by_fkey';
            columns: ['counted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_count_sessions_depot_id_fkey';
            columns: ['depot_id'];
            isOneToOne: false;
            referencedRelation: 'depots';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          asset_number: string;
          assigned_depot_id: string | null;
          assigned_driver_id: string | null;
          category: Database['public']['Enums']['asset_category'];
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          dot_lookup_at: string | null;
          dot_lookup_failures: number;
          dot_lookup_status: string | null;
          id: string;
          last_latitude: number | null;
          last_location_accuracy: number | null;
          last_location_updated_at: string | null;
          last_longitude: number | null;
          last_scanned_by: string | null;
          make: string | null;
          model: string | null;
          notes: string | null;
          qr_code_data: string | null;
          qr_generated_at: string | null;
          registration_expiry: string | null;
          registration_number: string | null;
          registration_overdue: boolean;
          status: Database['public']['Enums']['asset_status'];
          subtype: string | null;
          updated_at: string;
          vin: string | null;
          year_manufactured: number | null;
        };
        Insert: {
          asset_number: string;
          assigned_depot_id?: string | null;
          assigned_driver_id?: string | null;
          category: Database['public']['Enums']['asset_category'];
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          dot_lookup_at?: string | null;
          dot_lookup_failures?: number;
          dot_lookup_status?: string | null;
          id?: string;
          last_latitude?: number | null;
          last_location_accuracy?: number | null;
          last_location_updated_at?: string | null;
          last_longitude?: number | null;
          last_scanned_by?: string | null;
          make?: string | null;
          model?: string | null;
          notes?: string | null;
          qr_code_data?: string | null;
          qr_generated_at?: string | null;
          registration_expiry?: string | null;
          registration_number?: string | null;
          registration_overdue?: boolean;
          status?: Database['public']['Enums']['asset_status'];
          subtype?: string | null;
          updated_at?: string;
          vin?: string | null;
          year_manufactured?: number | null;
        };
        Update: {
          asset_number?: string;
          assigned_depot_id?: string | null;
          assigned_driver_id?: string | null;
          category?: Database['public']['Enums']['asset_category'];
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          dot_lookup_at?: string | null;
          dot_lookup_failures?: number;
          dot_lookup_status?: string | null;
          id?: string;
          last_latitude?: number | null;
          last_location_accuracy?: number | null;
          last_location_updated_at?: string | null;
          last_longitude?: number | null;
          last_scanned_by?: string | null;
          make?: string | null;
          model?: string | null;
          notes?: string | null;
          qr_code_data?: string | null;
          qr_generated_at?: string | null;
          registration_expiry?: string | null;
          registration_number?: string | null;
          registration_overdue?: boolean;
          status?: Database['public']['Enums']['asset_status'];
          subtype?: string | null;
          updated_at?: string;
          vin?: string | null;
          year_manufactured?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_assigned_depot_id_fkey';
            columns: ['assigned_depot_id'];
            isOneToOne: false;
            referencedRelation: 'depots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assets_assigned_driver_id_fkey';
            columns: ['assigned_driver_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assets_last_scanned_by_fkey';
            columns: ['last_scanned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          ip_address: unknown;
          new_values: Json | null;
          old_values: Json | null;
          record_id: string | null;
          table_name: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          new_values?: Json | null;
          old_values?: Json | null;
          record_id?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          new_values?: Json | null;
          old_values?: Json | null;
          record_id?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      defect_reports: {
        Row: {
          accepted_at: string | null;
          asset_id: string;
          created_at: string;
          description: string | null;
          dismissed_at: string | null;
          dismissed_reason: string | null;
          id: string;
          maintenance_record_id: string | null;
          notes: string | null;
          reported_by: string | null;
          resolved_at: string | null;
          scan_event_id: string | null;
          status: Database['public']['Enums']['defect_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          asset_id: string;
          created_at?: string;
          description?: string | null;
          dismissed_at?: string | null;
          dismissed_reason?: string | null;
          id?: string;
          maintenance_record_id?: string | null;
          notes?: string | null;
          reported_by?: string | null;
          resolved_at?: string | null;
          scan_event_id?: string | null;
          status?: Database['public']['Enums']['defect_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          asset_id?: string;
          created_at?: string;
          description?: string | null;
          dismissed_at?: string | null;
          dismissed_reason?: string | null;
          id?: string;
          maintenance_record_id?: string | null;
          notes?: string | null;
          reported_by?: string | null;
          resolved_at?: string | null;
          scan_event_id?: string | null;
          status?: Database['public']['Enums']['defect_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'defect_reports_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defect_reports_maintenance_record_id_fkey';
            columns: ['maintenance_record_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defect_reports_reported_by_fkey';
            columns: ['reported_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defect_reports_scan_event_id_fkey';
            columns: ['scan_event_id'];
            isOneToOne: false;
            referencedRelation: 'scan_events';
            referencedColumns: ['id'];
          },
        ];
      };
      depots: {
        Row: {
          address: string | null;
          code: string;
          color: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          latitude: number | null;
          longitude: number | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          code: string;
          color?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          code?: string;
          color?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      freight_analysis: {
        Row: {
          analyzed_by_user: string | null;
          asset_id: string | null;
          blocked_from_departure: boolean;
          confidence: number | null;
          created_at: string;
          description: string | null;
          estimated_weight_kg: number | null;
          hazard_count: number;
          id: string;
          load_distribution_score: number | null;
          max_severity: Database['public']['Enums']['hazard_severity'] | null;
          model_version: string | null;
          photo_id: string;
          primary_category: string | null;
          processing_duration_ms: number | null;
          raw_response: Json | null;
          requires_acknowledgment: boolean;
          restraint_count: number | null;
          secondary_categories: string[] | null;
          updated_at: string;
        };
        Insert: {
          analyzed_by_user?: string | null;
          asset_id?: string | null;
          blocked_from_departure?: boolean;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          estimated_weight_kg?: number | null;
          hazard_count?: number;
          id?: string;
          load_distribution_score?: number | null;
          max_severity?: Database['public']['Enums']['hazard_severity'] | null;
          model_version?: string | null;
          photo_id: string;
          primary_category?: string | null;
          processing_duration_ms?: number | null;
          raw_response?: Json | null;
          requires_acknowledgment?: boolean;
          restraint_count?: number | null;
          secondary_categories?: string[] | null;
          updated_at?: string;
        };
        Update: {
          analyzed_by_user?: string | null;
          asset_id?: string | null;
          blocked_from_departure?: boolean;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          estimated_weight_kg?: number | null;
          hazard_count?: number;
          id?: string;
          load_distribution_score?: number | null;
          max_severity?: Database['public']['Enums']['hazard_severity'] | null;
          model_version?: string | null;
          photo_id?: string;
          primary_category?: string | null;
          processing_duration_ms?: number | null;
          raw_response?: Json | null;
          requires_acknowledgment?: boolean;
          restraint_count?: number | null;
          secondary_categories?: string[] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'freight_analysis_analyzed_by_user_fkey';
            columns: ['analyzed_by_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'freight_analysis_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'freight_analysis_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
        ];
      };
      hazard_alerts: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          acknowledgment_type: string | null;
          asset_id: string | null;
          bounding_box: Json | null;
          confidence_score: number;
          created_at: string;
          description: string;
          evidence_points: string[] | null;
          freight_analysis_id: string;
          hazard_rule_id: string | null;
          hazard_type: string;
          id: string;
          location_in_image: string | null;
          manager_review_at: string | null;
          manager_review_by: string | null;
          photo_id: string;
          recommended_actions: string[] | null;
          review_notes: string | null;
          review_outcome: Database['public']['Enums']['review_outcome'] | null;
          scan_event_id: string | null;
          severity: Database['public']['Enums']['hazard_severity'];
          status: Database['public']['Enums']['hazard_status'];
          updated_at: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          acknowledgment_type?: string | null;
          asset_id?: string | null;
          bounding_box?: Json | null;
          confidence_score?: number;
          created_at?: string;
          description: string;
          evidence_points?: string[] | null;
          freight_analysis_id: string;
          hazard_rule_id?: string | null;
          hazard_type: string;
          id?: string;
          location_in_image?: string | null;
          manager_review_at?: string | null;
          manager_review_by?: string | null;
          photo_id: string;
          recommended_actions?: string[] | null;
          review_notes?: string | null;
          review_outcome?: Database['public']['Enums']['review_outcome'] | null;
          scan_event_id?: string | null;
          severity: Database['public']['Enums']['hazard_severity'];
          status?: Database['public']['Enums']['hazard_status'];
          updated_at?: string;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          acknowledgment_type?: string | null;
          asset_id?: string | null;
          bounding_box?: Json | null;
          confidence_score?: number;
          created_at?: string;
          description?: string;
          evidence_points?: string[] | null;
          freight_analysis_id?: string;
          hazard_rule_id?: string | null;
          hazard_type?: string;
          id?: string;
          location_in_image?: string | null;
          manager_review_at?: string | null;
          manager_review_by?: string | null;
          photo_id?: string;
          recommended_actions?: string[] | null;
          review_notes?: string | null;
          review_outcome?: Database['public']['Enums']['review_outcome'] | null;
          scan_event_id?: string | null;
          severity?: Database['public']['Enums']['hazard_severity'];
          status?: Database['public']['Enums']['hazard_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hazard_alerts_acknowledged_by_fkey';
            columns: ['acknowledged_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_alerts_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_alerts_freight_analysis_id_fkey';
            columns: ['freight_analysis_id'];
            isOneToOne: false;
            referencedRelation: 'freight_analysis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_alerts_manager_review_by_fkey';
            columns: ['manager_review_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_alerts_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hazard_alerts_scan_event_id_fkey';
            columns: ['scan_event_id'];
            isOneToOne: false;
            referencedRelation: 'scan_events';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_records: {
        Row: {
          actual_cost: number | null;
          asset_id: string;
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          estimated_cost: number | null;
          hazard_alert_id: string | null;
          id: string;
          maintenance_type: string | null;
          notes: string | null;
          parts_used: Json | null;
          priority: Database['public']['Enums']['maintenance_priority'];
          reported_by: string | null;
          scan_event_id: string | null;
          scheduled_date: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          actual_cost?: number | null;
          asset_id: string;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_cost?: number | null;
          hazard_alert_id?: string | null;
          id?: string;
          maintenance_type?: string | null;
          notes?: string | null;
          parts_used?: Json | null;
          priority?: Database['public']['Enums']['maintenance_priority'];
          reported_by?: string | null;
          scan_event_id?: string | null;
          scheduled_date?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['maintenance_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          actual_cost?: number | null;
          asset_id?: string;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_cost?: number | null;
          hazard_alert_id?: string | null;
          id?: string;
          maintenance_type?: string | null;
          notes?: string | null;
          parts_used?: Json | null;
          priority?: Database['public']['Enums']['maintenance_priority'];
          reported_by?: string | null;
          scan_event_id?: string | null;
          scheduled_date?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['maintenance_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_records_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_hazard_alert_id_fkey';
            columns: ['hazard_alert_id'];
            isOneToOne: false;
            referencedRelation: 'hazard_alerts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_reported_by_fkey';
            columns: ['reported_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_scan_event_id_fkey';
            columns: ['scan_event_id'];
            isOneToOne: false;
            referencedRelation: 'scan_events';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_log: {
        Row: {
          asset_id: string;
          created_at: string;
          error_message: string | null;
          id: string;
          notification_type: string;
          sent_at: string | null;
          status: string;
          target_date: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          notification_type: string;
          sent_at?: string | null;
          status?: string;
          target_date: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          notification_type?: string;
          sent_at?: string | null;
          status?: string;
          target_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_log_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      photos: {
        Row: {
          asset_id: string | null;
          created_at: string;
          file_size: number | null;
          filename: string | null;
          height: number | null;
          id: string;
          is_analyzed: boolean;
          latitude: number | null;
          location_description: string | null;
          longitude: number | null;
          mime_type: string | null;
          photo_type: Database['public']['Enums']['photo_type'];
          scan_event_id: string | null;
          storage_path: string;
          thumbnail_path: string | null;
          uploaded_by: string;
          width: number | null;
        };
        Insert: {
          asset_id?: string | null;
          created_at?: string;
          file_size?: number | null;
          filename?: string | null;
          height?: number | null;
          id?: string;
          is_analyzed?: boolean;
          latitude?: number | null;
          location_description?: string | null;
          longitude?: number | null;
          mime_type?: string | null;
          photo_type?: Database['public']['Enums']['photo_type'];
          scan_event_id?: string | null;
          storage_path: string;
          thumbnail_path?: string | null;
          uploaded_by: string;
          width?: number | null;
        };
        Update: {
          asset_id?: string | null;
          created_at?: string;
          file_size?: number | null;
          filename?: string | null;
          height?: number | null;
          id?: string;
          is_analyzed?: boolean;
          latitude?: number | null;
          location_description?: string | null;
          longitude?: number | null;
          mime_type?: string | null;
          photo_type?: Database['public']['Enums']['photo_type'];
          scan_event_id?: string | null;
          storage_path?: string;
          thumbnail_path?: string | null;
          uploaded_by?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_scan_event_id_fkey';
            columns: ['scan_event_id'];
            isOneToOne: false;
            referencedRelation: 'scan_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          depot: string | null;
          email: string;
          employee_id: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          last_login_at: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          depot?: string | null;
          email: string;
          employee_id?: string | null;
          full_name: string;
          id: string;
          is_active?: boolean;
          last_login_at?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          depot?: string | null;
          email?: string;
          employee_id?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          id?: string;
          platform: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          failures: number;
          first_failure_at: string;
          key: string;
          lockout_seconds: number;
          lockout_until: string | null;
        };
        Insert: {
          failures?: number;
          first_failure_at?: string;
          key: string;
          lockout_seconds?: number;
          lockout_until?: string | null;
        };
        Update: {
          failures?: number;
          first_failure_at?: string;
          key?: string;
          lockout_seconds?: number;
          lockout_until?: string | null;
        };
        Relationships: [];
      };
      rego_lookup_log: {
        Row: {
          asset_id: string | null;
          created_at: string;
          error_message: string | null;
          expiry_date: string | null;
          id: string;
          raw_response: string | null;
          registration_number: string;
          status: string;
        };
        Insert: {
          asset_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          expiry_date?: string | null;
          id?: string;
          raw_response?: string | null;
          registration_number: string;
          status: string;
        };
        Update: {
          asset_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          expiry_date?: string | null;
          id?: string;
          raw_response?: string | null;
          registration_number?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rego_lookup_log_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      scan_events: {
        Row: {
          accuracy: number | null;
          altitude: number | null;
          asset_id: string;
          created_at: string;
          device_info: Json | null;
          heading: number | null;
          id: string;
          latitude: number | null;
          location_description: string | null;
          longitude: number | null;
          raw_scan_data: string | null;
          scan_type: Database['public']['Enums']['scan_type'];
          scanned_by: string | null;
          speed: number | null;
        };
        Insert: {
          accuracy?: number | null;
          altitude?: number | null;
          asset_id: string;
          created_at?: string;
          device_info?: Json | null;
          heading?: number | null;
          id?: string;
          latitude?: number | null;
          location_description?: string | null;
          longitude?: number | null;
          raw_scan_data?: string | null;
          scan_type?: Database['public']['Enums']['scan_type'];
          scanned_by?: string | null;
          speed?: number | null;
        };
        Update: {
          accuracy?: number | null;
          altitude?: number | null;
          asset_id?: string;
          created_at?: string;
          device_info?: Json | null;
          heading?: number | null;
          id?: string;
          latitude?: number | null;
          location_description?: string | null;
          longitude?: number | null;
          raw_scan_data?: string | null;
          scan_type?: Database['public']['Enums']['scan_type'];
          scanned_by?: string | null;
          speed?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'scan_events_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scan_events_scanned_by_fkey';
            columns: ['scanned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_defect_report: {
        Args: { p_defect_report_id: string; p_maintenance_input: Json };
        Returns: Json;
      };
      auth_user_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      bulk_cancel_maintenance_tasks: {
        Args: { p_ids: string[] };
        Returns: {
          cancelled_id: string;
        }[];
      };
      cancel_maintenance_task: {
        Args: { p_maintenance_id: string };
        Returns: undefined;
      };
      hard_delete_assets: {
        Args: { p_ids: string[] };
        Returns: {
          deleted_id: string;
        }[];
      };
      get_asset_counts_by_status: {
        Args: never;
        Returns: {
          count: number;
          status: string;
        }[];
      };
      get_asset_scan_context: { Args: { p_asset_id: string }; Returns: Json };
      get_defect_report_stats: { Args: never; Returns: Json };
      get_fleet_statistics: { Args: never; Returns: Json };
      get_hazard_review_stats: { Args: never; Returns: Json };
      get_maintenance_stats: { Args: never; Returns: Json };
      get_scan_count_estimate: { Args: never; Returns: number };
      is_manager_or_above: { Args: never; Returns: boolean };
      is_mechanic_or_above: { Args: never; Returns: boolean };
      is_user_active: { Args: never; Returns: boolean };
      lookup_asset_by_qr: {
        Args: { p_qr_data: string };
        Returns: {
          asset_number: string;
          assigned_depot_id: string | null;
          assigned_driver_id: string | null;
          category: Database['public']['Enums']['asset_category'];
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          dot_lookup_at: string | null;
          dot_lookup_failures: number;
          dot_lookup_status: string | null;
          id: string;
          last_latitude: number | null;
          last_location_accuracy: number | null;
          last_location_updated_at: string | null;
          last_longitude: number | null;
          last_scanned_by: string | null;
          make: string | null;
          model: string | null;
          notes: string | null;
          qr_code_data: string | null;
          qr_generated_at: string | null;
          registration_expiry: string | null;
          registration_number: string | null;
          registration_overdue: boolean;
          status: Database['public']['Enums']['asset_status'];
          subtype: string | null;
          updated_at: string;
          vin: string | null;
          year_manufactured: number | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'assets';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      maybe_revert_asset_to_serviced: {
        Args: { p_asset_id: string };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      submit_asset_count_items: {
        Args: { p_items: Json; p_session_id: string };
        Returns: number;
      };
      submit_hazard_feedback: {
        Args: {
          p_analysis_id: string;
          p_hazard_types: string[];
          p_outcomes: string[];
          p_review_notes?: string;
          p_reviewer_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      asset_category: 'trailer' | 'dolly';
      asset_status: 'serviced' | 'maintenance' | 'out_of_service';
      defect_status: 'reported' | 'task_created' | 'resolved' | 'dismissed';
      hazard_severity: 'critical' | 'high' | 'medium' | 'low';
      hazard_status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
      maintenance_priority: 'low' | 'medium' | 'critical';
      maintenance_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      photo_type: 'freight' | 'defect' | 'inspection' | 'general';
      review_outcome: 'confirmed' | 'false_positive' | 'needs_training';
      scan_type: 'qr_scan' | 'manual_entry' | 'nfc_scan' | 'gps_auto';
      user_role: 'driver' | 'mechanic' | 'manager' | 'superuser';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_category: ['trailer', 'dolly'],
      asset_status: ['serviced', 'maintenance', 'out_of_service'],
      defect_status: ['reported', 'task_created', 'resolved', 'dismissed'],
      hazard_severity: ['critical', 'high', 'medium', 'low'],
      hazard_status: ['active', 'acknowledged', 'resolved', 'dismissed'],
      maintenance_priority: ['low', 'medium', 'critical'],
      maintenance_status: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      photo_type: ['freight', 'defect', 'inspection', 'general'],
      review_outcome: ['confirmed', 'false_positive', 'needs_training'],
      scan_type: ['qr_scan', 'manual_entry', 'nfc_scan', 'gps_auto'],
      user_role: ['driver', 'mechanic', 'manager', 'superuser'],
    },
  },
} as const;
