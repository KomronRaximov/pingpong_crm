import axios from 'axios';
import type { Court, CourtSession, Product, Reservation, Stats } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Courts ──────────────────────────────────────────────────
export const getCourts = async (): Promise<Court[]> => {
  const { data } = await api.get('/courts');
  return data;
};

export const createCourt = async (payload: Partial<Court>): Promise<Court> => {
  const { data } = await api.post('/courts', payload);
  return data;
};

export const updateCourt = async (id: string, payload: Partial<Court>): Promise<Court> => {
  const { data } = await api.put(`/courts/${id}`, payload);
  return data;
};

export const deleteCourt = async (id: string): Promise<void> => {
  await api.delete(`/courts/${id}`);
};

// ── Sessions ─────────────────────────────────────────────────
export const startCourtSession = async (courtId: string): Promise<CourtSession> => {
  const { data } = await api.post(`/courts/${courtId}/start`);
  return data.session;
};

export const stopCourtSession = async (courtId: string): Promise<{ session: CourtSession; final_price: number }> => {
  const { data } = await api.post(`/courts/${courtId}/stop`);
  return data;
};

export const getActiveSession = async (courtId: string): Promise<CourtSession | null> => {
  const { data } = await api.get(`/courts/${courtId}/session`);
  return data;
};

// ── Orders ────────────────────────────────────────────────────
export const addOrderItem = async (courtId: string, productId: string, quantity: number) => {
  const { data } = await api.post(`/courts/${courtId}/order`, { product_id: productId, quantity });
  return data;
};

export const decreaseOrderItem = async (courtId: string, productId: string) => {
  const { data } = await api.post(`/courts/${courtId}/order/decrease`, { product_id: productId });
  return data;
};

// ── Sessions ─────────────────────────────────────────────────
export const getSessionHistory = async (): Promise<CourtSession[]> => {
  const { data } = await api.get('/sessions');
  return data;
};

// ── Products ─────────────────────────────────────────────────
export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/products');
  return data;
};

export const createProduct = async (payload: Partial<Product>): Promise<Product> => {
  const { data } = await api.post('/products', payload);
  return data;
};

export const updateProduct = async (id: string, payload: Partial<Product>): Promise<Product> => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

// ── Stats ─────────────────────────────────────────────────────
export const getStats = async (): Promise<Stats> => {
  const { data } = await api.get('/stats');
  return data;
};

// ── Reservations ──────────────────────────────────────────────
export const getReservations = async (): Promise<Reservation[]> => {
  const { data } = await api.get('/reservations');
  return data;
};

export const createReservation = async (payload: Partial<Reservation>): Promise<Reservation> => {
  const { data } = await api.post('/reservations', payload);
  return data;
};

export default api;
