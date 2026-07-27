export type Service = "electricity" | "water";

export type FlagStatus = "ok" | "below_prev" | "above_2x_avg" | "possible_partial";

export type Role = "admin" | "owner";

export interface Property {
  id: string;
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

export interface MeterReading {
  id: string;
  unit_id: string;
  service: Service;
  reading_value: number;
  photo_url: string | null;
  captured_at: string;
  notes: string | null;
  flag_status: FlagStatus;
  created_at: string;
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
  property_id: string;
  created_by: string;
  email: string | null;
  status: InviteStatus;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}
