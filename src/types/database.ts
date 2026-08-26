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
