export type CourtStatus = 'available' | 'active' | 'reserved' | 'maintenance';

export interface Court {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  price_per_hour: number;
  status: CourtStatus;
}

export interface CourtSession {
  id: string;
  court_id: string;
  start_time: string;
  end_time?: string;
  total_price: number;
  status: 'active' | 'finished';
  order_items?: OrderItem[];
  court?: Court;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export interface OrderItem {
  id: string;
  court_session_id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export interface Reservation {
  id: string;
  court_id: string;
  client_name: string;
  client_phone: string;
  start_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Stats {
  total_courts: number;
  active_sessions: number;
  today_revenue: number;
}
