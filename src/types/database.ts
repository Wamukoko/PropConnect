export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          name: string;
          slug: string;
          business_name: string | null;
          country: string;
          currency: string;
          timezone: string;
          status: string;
          subscription_plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          business_name?: string | null;
          country?: string;
          currency?: string;
          timezone?: string;
          status?: string;
          subscription_plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          business_name?: string | null;
          country?: string;
          currency?: string;
          timezone?: string;
          status?: string;
          subscription_plan?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          email: string;
          role: string;
          active: boolean;
          notify_on_hot_lead: boolean;
          hot_lead_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          email: string;
          role?: string;
          active?: boolean;
          notify_on_hot_lead?: boolean;
          hot_lead_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          name?: string;
          email?: string;
          role?: string;
          active?: boolean;
          notify_on_hot_lead?: boolean;
          hot_lead_threshold?: number;
          updated_at?: string;
        };
      };
      whatsapp_accounts: {
        Row: {
          id: string;
          account_id: string;
          business_account_id: string | null;
          phone_number_id: string;
          display_phone: string | null;
          verified_name: string | null;
          status: string;
          graph_api_version: string;
          access_token_ref: string | null;
          verify_token_ref: string | null;
          app_secret_ref: string | null;
          quality_rating: string | null;
          messaging_limit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          business_account_id?: string | null;
          phone_number_id: string;
          display_phone?: string | null;
          verified_name?: string | null;
          status?: string;
          graph_api_version?: string;
          access_token_ref?: string | null;
          verify_token_ref?: string | null;
          app_secret_ref?: string | null;
          quality_rating?: string | null;
          messaging_limit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          business_account_id?: string | null;
          phone_number_id?: string;
          display_phone?: string | null;
          verified_name?: string | null;
          status?: string;
          graph_api_version?: string;
          access_token_ref?: string | null;
          verify_token_ref?: string | null;
          app_secret_ref?: string | null;
          quality_rating?: string | null;
          messaging_limit?: string | null;
          updated_at?: string;
        };
      };
      account_branding: {
        Row: {
          account_id: string;
          firm_name: string | null;
          display_name: string | null;
          logo_storage_path: string | null;
          favicon_storage_path: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          phone: string | null;
          email: string | null;
          website: string | null;
          address: Json | null;
          social_links: Json | null;
          public_contact_name: string | null;
          public_contact_email: string | null;
          public_contact_phone: string | null;
          custom_domain: string | null;
          custom_domain_status: string | null;
          show_powered_by: boolean;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          firm_name?: string | null;
          display_name?: string | null;
          logo_storage_path?: string | null;
          favicon_storage_path?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: Json | null;
          social_links?: Json | null;
          public_contact_name?: string | null;
          public_contact_email?: string | null;
          public_contact_phone?: string | null;
          custom_domain?: string | null;
          custom_domain_status?: string | null;
          show_powered_by?: boolean;
          updated_at?: string;
        };
        Update: {
          firm_name?: string | null;
          display_name?: string | null;
          logo_storage_path?: string | null;
          favicon_storage_path?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: Json | null;
          social_links?: Json | null;
          public_contact_name?: string | null;
          public_contact_email?: string | null;
          public_contact_phone?: string | null;
          custom_domain?: string | null;
          custom_domain_status?: string | null;
          show_powered_by?: boolean;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          reference_code: string | null;
          description: string | null;
          property_type: string;
          listing_type: string;
          status: string;
          price: number;
          currency: string;
          bedrooms: number | null;
          bathrooms: number | null;
          floor_area: number | null;
          land_area: number | null;
          furnished: boolean | null;
          parking_spaces: number | null;
          amenities: Json;
          location_id: string | null;
          latitude: number | null;
          longitude: number | null;
          public_location_text: string | null;
          availability_date: string | null;
          published_at: string | null;
          archived_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title: string;
          reference_code?: string | null;
          description?: string | null;
          property_type: string;
          listing_type: string;
          status?: string;
          price: number;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          floor_area?: number | null;
          land_area?: number | null;
          furnished?: boolean | null;
          parking_spaces?: number | null;
          amenities?: Json;
          location_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          public_location_text?: string | null;
          availability_date?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          reference_code?: string | null;
          description?: string | null;
          property_type?: string;
          listing_type?: string;
          status?: string;
          price?: number;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          floor_area?: number | null;
          land_area?: number | null;
          furnished?: boolean | null;
          parking_spaces?: number | null;
          amenities?: Json;
          location_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          public_location_text?: string | null;
          availability_date?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      property_photos: {
        Row: {
          id: string;
          account_id: string;
          property_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          alt_text: string | null;
          sort_order: number;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          property_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          thumbnail_path?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
        };
      };
      locations: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          slug: string;
          location_type: string;
          parent_id: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          slug: string;
          location_type: string;
          parent_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          location_type?: string;
          parent_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          account_id: string | null;
          whatsapp_account_id: string | null;
          provider_event_id: string | null;
          processing_state: string;
          attempts: number;
          last_error: string | null;
          processed_at: string | null;
          received_at: string;
          raw_payload: Json | null;
        };
        Insert: {
          id?: string;
          account_id?: string | null;
          whatsapp_account_id?: string | null;
          provider_event_id?: string | null;
          processing_state?: string;
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          received_at?: string;
          raw_payload?: Json | null;
        };
        Update: {
          processing_state?: string;
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          raw_payload?: Json | null;
        };
      };
      messages: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string | null;
          whatsapp_account_id: string | null;
          direction: string;
          type: string;
          content: Json;
          wa_message_id: string | null;
          provider_timestamp: string | null;
          correlation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id?: string | null;
          whatsapp_account_id?: string | null;
          direction: string;
          type: string;
          content: Json;
          wa_message_id?: string | null;
          provider_timestamp?: string | null;
          correlation_id?: string | null;
          created_at?: string;
        };
        Update: {
          content?: Json;
          correlation_id?: string | null;
        };
      };
      outbound_messages: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string;
          message_id: string | null;
          provider_message_id: string | null;
          template_name: string | null;
          template_version: string | null;
          status: string;
          error_code: string | null;
          attempt_count: number;
          next_attempt_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id: string;
          message_id?: string | null;
          provider_message_id?: string | null;
          template_name?: string | null;
          template_version?: string | null;
          status?: string;
          error_code?: string | null;
          attempt_count?: number;
          next_attempt_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          error_code?: string | null;
          attempt_count?: number;
          next_attempt_at?: string | null;
          sent_at?: string | null;
        };
      };
      outbound_jobs: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string;
          whatsapp_account_id: string | null;
          job_type: string;
          template_name: string | null;
          language: string | null;
          payload: Json | null;
          idempotency_key: string;
          status: string;
          attempts: number;
          next_attempt_at: string;
          locked_at: string | null;
          locked_by: string | null;
          provider_message_id: string | null;
          last_error: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id: string;
          whatsapp_account_id?: string | null;
          job_type: string;
          template_name?: string | null;
          language?: string | null;
          payload?: Json | null;
          idempotency_key: string;
          status?: string;
          attempts?: number;
          next_attempt_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          provider_message_id?: string | null;
          last_error?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          status?: string;
          attempts?: number;
          next_attempt_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          provider_message_id?: string | null;
          last_error?: string | null;
          sent_at?: string | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          account_id: string;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
          phone: string | null;
          normalized_phone: string | null;
          email: string | null;
          company: string | null;
          job_title: string | null;
          address: Json | null;
          notes: string | null;
          source: string | null;
          contact_type: string | null;
          owner_agent_id: string | null;
          avatar_storage_path: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          email?: string | null;
          company?: string | null;
          job_title?: string | null;
          address?: Json | null;
          notes?: string | null;
          source?: string | null;
          contact_type?: string | null;
          owner_agent_id?: string | null;
          avatar_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          email?: string | null;
          company?: string | null;
          job_title?: string | null;
          address?: Json | null;
          notes?: string | null;
          source?: string | null;
          contact_type?: string | null;
          owner_agent_id?: string | null;
          avatar_storage_path?: string | null;
          updated_at?: string;
          archived_at?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          account_id: string;
          contact_id: string | null;
          whatsapp_account_id: string | null;
          phone: string;
          whatsapp_name: string | null;
          name: string | null;
          email: string | null;
          preferred_language: string;
          budget_min: number | null;
          budget_max: number | null;
          listing_type: string | null;
          property_type: string | null;
          preferred_area: string | null;
          stage: string;
          lead_score: number;
          source: string | null;
          opted_out: boolean;
          opted_out_at: string | null;
          last_location_lat: number | null;
          last_location_lng: number | null;
          location_consent_at: string | null;
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          contact_id?: string | null;
          whatsapp_account_id?: string | null;
          phone: string;
          whatsapp_name?: string | null;
          name?: string | null;
          email?: string | null;
          preferred_language?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          listing_type?: string | null;
          property_type?: string | null;
          preferred_area?: string | null;
          stage?: string;
          lead_score?: number;
          source?: string | null;
          opted_out?: boolean;
          opted_out_at?: string | null;
          last_location_lat?: number | null;
          last_location_lng?: number | null;
          location_consent_at?: string | null;
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contact_id?: string | null;
          whatsapp_account_id?: string | null;
          whatsapp_name?: string | null;
          name?: string | null;
          email?: string | null;
          preferred_language?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          listing_type?: string | null;
          property_type?: string | null;
          preferred_area?: string | null;
          stage?: string;
          lead_score?: number;
          source?: string | null;
          opted_out?: boolean;
          opted_out_at?: string | null;
          last_location_lat?: number | null;
          last_location_lng?: number | null;
          location_consent_at?: string | null;
          last_contacted_at?: string | null;
          updated_at?: string;
        };
      };
      conversation_sessions: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string;
          whatsapp_account_id: string | null;
          state: string;
          language: string;
          collected_filters: Json;
          last_interaction_at: string;
          expires_at: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id: string;
          whatsapp_account_id?: string | null;
          state?: string;
          language?: string;
          collected_filters?: Json;
          last_interaction_at?: string;
          expires_at?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: string;
          language?: string;
          collected_filters?: Json;
          last_interaction_at?: string;
          expires_at?: string | null;
          version?: number;
          updated_at?: string;
        };
      };
      lead_timeline_events: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string;
          property_id: string | null;
          actor_type: string;
          actor_id: string | null;
          event_type: string;
          metadata: Json;
          dedup_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id: string;
          property_id?: string | null;
          actor_type: string;
          actor_id?: string | null;
          event_type: string;
          metadata?: Json;
          dedup_key?: string | null;
          created_at?: string;
        };
        Update: {
          metadata?: Json;
          dedup_key?: string | null;
        };
      };
      consent_records: {
        Row: {
          id: string;
          account_id: string;
          lead_id: string;
          purpose: string;
          granted: boolean;
          granted_at: string | null;
          revoked_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          lead_id: string;
          purpose: string;
          granted: boolean;
          granted_at?: string | null;
          revoked_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          granted?: boolean;
          granted_at?: string | null;
          revoked_at?: string | null;
        };
      };
      system_settings: {
        Row: {
          id: string;
          account_id: string;
          setting_key: string;
          setting_value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          setting_key: string;
          setting_value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setting_value?: Json;
          updated_at?: string;
        };
      };
    };
    Enums: {
      property_type:
        | "apartment"
        | "house"
        | "townhouse"
        | "villa"
        | "maisonette"
        | "land"
        | "office"
        | "shop"
        | "warehouse"
        | "commercial"
        | "serviced_apartment";
      listing_type: "sale" | "rent" | "lease";
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "available"
        | "reserved"
        | "under_offer"
        | "let"
        | "sold"
        | "withdrawn"
        | "expired"
        | "archived";
      lead_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "matching"
        | "recommendation_sent"
        | "viewing_requested"
        | "viewing_confirmed"
        | "negotiation"
        | "converted"
        | "lost"
        | "dormant";
      conversation_state:
        | "idle"
        | "choosing_intent"
        | "choosing_listing_type"
        | "choosing_property_type"
        | "choosing_budget"
        | "choosing_area"
        | "awaiting_location"
        | "matching_properties"
        | "showing_results"
        | "choosing_property"
        | "choosing_viewing_date"
        | "choosing_viewing_slot"
        | "awaiting_confirmation"
        | "completed"
        | "human_handoff"
        | "opted_out"
        | "expired";
      message_direction: "inbound" | "outbound";
      message_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "location"
        | "interactive"
        | "template"
        | "system";
      consent_purpose:
        | "service_messages"
        | "saved_search_alerts"
        | "broadcasts";
      viewing_status:
        | "requested"
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
        | "no_show";
    };
  };
}
