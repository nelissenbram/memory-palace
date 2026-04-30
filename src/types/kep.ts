/**
 * Kep system types — conduits that auto-feed memories into palace Rooms.
 */

// ── Source types ─────────────────────────────────────────────

export type KepSourceType = "whatsapp" | "photos";
export type KepStatus = "draft" | "active" | "paused" | "closed";
export type CaptureStatus = "pending" | "processed" | "routed" | "rejected" | "failed";
export type CaptureMediaType = "image" | "video" | "audio" | "text" | "document";

// ── Routing ──────────────────────────────────────────────────

export interface RoutingRule {
  id: string;
  condition: RoutingCondition;
  target_wing_id?: string;
  target_room_id?: string;
  priority: number;
}

export interface RoutingCondition {
  type: "sender" | "keyword" | "media_type" | "time_range";
  value: string;
}

export interface AiRoutingSuggestion {
  wing_id: string;
  wing_name: string;
  room_id: string;
  room_name: string;
  confidence: number;
  reasoning: string;
}

// ── Database row types ───────────────────────────────────────

export interface Kep {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  source_type: KepSourceType;
  source_config: Record<string, unknown>;
  default_wing_id: string | null;
  default_room_id: string | null;
  routing_rules: RoutingRule[];
  auto_route_enabled: boolean;
  status: KepStatus;
  starts_at: string | null;
  ends_at: string | null;
  end_condition: string | null;
  memories_captured: number;
  last_capture_at: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface KepCapture {
  id: string;
  kep_id: string;
  user_id: string;
  source_message_id: string | null;
  source_sender: string | null;
  source_timestamp: string | null;
  media_type: CaptureMediaType | null;
  media_url: string | null;
  media_size: number | null;
  transcription: string | null;
  ai_suggestion: AiRoutingSuggestion | null;
  status: CaptureStatus;
  rejection_reason: string | null;
  memory_id: string | null;
  payload_hash: string | null;
  payload_preview: Record<string, unknown> | null;
  created_at: string;
}

export interface WhatsAppLink {
  id: string;
  kep_id: string;
  user_id: string;
  wa_group_id: string | null;
  wa_group_name: string | null;
  phone_number_id: string | null;
  verified: boolean;
  verified_at: string | null;
  disclosure_sent: boolean;
  disclosure_sent_at: string | null;
  last_message_at: string | null;
  target_room_id: string | null;
  palace_room_created: boolean;
  invite_code: string | null;
  stopped: boolean;
  stopped_by: string | null;
  stopped_at: string | null;
  created_at: string;
}

export interface VirtualRoom {
  id: string;
  user_id: string;
  name: string;
  wing_id: string | null;
  is_virtual: boolean;
  virtual_title: string | null;
  source_kep_id: string | null;
  allocated_at: string | null;
  created_at: string;
}

export interface KepExclusion {
  id: string;
  kep_id: string;
  phone_number: string;
  reason: string;
  excluded_at: string;
}

// ── API request/response types ───────────────────────────────

export interface CreateKepRequest {
  name: string;
  description?: string;
  icon?: string;
  source_type: KepSourceType;
  source_config?: Record<string, unknown>;
  default_wing_id?: string;
  default_room_id?: string;
  routing_rules?: RoutingRule[];
  auto_route_enabled?: boolean;
  starts_at?: string;
  ends_at?: string;
  end_condition?: string;
}

export interface UpdateKepRequest {
  name?: string;
  description?: string;
  icon?: string;
  source_config?: Record<string, unknown>;
  default_wing_id?: string | null;
  default_room_id?: string | null;
  routing_rules?: RoutingRule[];
  auto_route_enabled?: boolean;
  status?: KepStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  end_condition?: string | null;
}

export interface KepStats {
  total_captures: number;
  pending_captures: number;
  routed_captures: number;
  rejected_captures: number;
  failed_captures: number;
  last_capture_at: string | null;
  captures_today: number;
  captures_this_week: number;
}

export interface PendingCaptureWithSuggestion extends KepCapture {
  kep_name: string;
  kep_icon: string;
}

// ── WhatsApp webhook types ───────────────────────────────────

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: "whatsapp";
    metadata: { display_phone_number: string; phone_number_id: string };
    messages?: WhatsAppMessage[];
    statuses?: unknown[];
  };
  field: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "reaction";
  chat_id?: string;
  text?: { body: string };
  image?: WhatsAppMedia;
  video?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  document?: WhatsAppMedia & { filename?: string };
}

export interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

// ── Job payloads ─────────────────────────────────────────────

export interface KepCaptureJobPayload {
  captureId: string;
  kepId: string;
  userId: string;
}

export interface KepScanJobPayload {
  kepId: string;
  userId: string;
  cursor?: string;
}
