export type Service = "electricity" | "water";

export type FlagStatus = "ok" | "below_prev" | "above_2x_avg" | "possible_partial";

export interface Property {
  id: string;
  name: string;
  address: string | null;
  owner_share_token: string;
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
