/** Filas de la base de datos (supabase/migrations). */
import type { CategoryId, Role, StampIcon } from "@/core/catalog";
import type { BillingCycle, PlanId, SubscriptionStatus } from "@/core/plans";

export interface Business {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  status: "active" | "suspended" | "deleted";
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  role: Role;
  location_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Invitation {
  id: string;
  business_id: string;
  role: "manager" | "cashier";
  location_id: string | null;
  name: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  business_id: string;
  name: string;
  stamps_required: number;
  reward_description: string;
  terms: string | null;
  background_color: string;
  foreground_color: string;
  label_color: string;
  stamp_icon: StampIcon;
  min_seconds_between_stamps: number;
  max_stamps_per_visit: number;
  active: boolean;
  google_class_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  first_location_id: string | null;
  last_visit_at: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  business_id: string;
  program_id: string;
  customer_id: string;
  serial_number: string;
  auth_token: string;
  stamps: number;
  lifetime_stamps: number;
  visits: number;
  redemptions: number;
  last_stamp_at: string | null;
  google_object_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CardEventKind = "enroll" | "stamp" | "redeem" | "undo" | "adjust";

export interface CardEvent {
  id: number;
  business_id: string;
  card_id: string;
  location_id: string | null;
  membership_id: string | null;
  kind: CardEventKind;
  delta: number;
  stamps_after: number;
  reward_description: string | null;
  ticket_ref: string | null;
  created_at: string;
}

export interface Subscription {
  business_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider: "mercadopago" | "stripe" | "manual" | null;
  provider_subscription_id: string | null;
  provider_status: string | null;
}

/** Todo lo necesario para dibujar un pase. */
export interface CardBundle {
  card: Card;
  program: Program;
  business: Business;
  customer: Customer;
}

export interface Job {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}
