export type Service = "electricity" | "water";

export type FlagStatus = "ok" | "below_prev" | "above_2x_avg" | "possible_partial";

export type Role = "admin" | "client";

export interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  created_at: string;
}

export interface Meter {
  id: string;
  property_id: string;
  unit_id: string | null;
  service: Service;
  label: string;
  location_note: string | null;
  is_communal: boolean;
  created_at: string;
}

export interface MeterReading {
  id: string;
  meter_id: string;
  reading_value: number;
  photo_url: string | null;
  captured_at: string;
  captured_by: string | null;
  notes: string | null;
  flag_status: FlagStatus;
  created_at: string;
  /**
   * Legacy columns, retained by migration 002 so the previous deploy can
   * still run if this one is rolled back. Derivable from the meter — do not
   * read these in new code. Migration 003 drops them.
   */
  unit_id?: string;
  service?: Service;
}

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  created_at: string;
}

export type InviteStatus = "pending" | "used" | "revoked";

export interface PropertyInvite {
  id: string;
  token: string;
  client_id: string;
  property_id: string | null;
  created_by: string;
  email: string | null;
  status: InviteStatus;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}
