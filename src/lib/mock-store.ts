
export type Role = 'client' | 'technician' | 'admin';
export type TicketStatus = 'pendiente' | 'asignado' | 'en proceso' | 'terminado';
export type Category = 'eléctrico' | 'plomería' | 'clima' | 'general';
export type UserStatus = 'pending' | 'approved' | 'verified';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty?: string;
  status: UserStatus;
  profileImg?: string;
  ineImg?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: TicketStatus;
  clientId: string;
  techId?: string;
  beforeImg?: string;
  afterImg?: string;
  signature?: string;
  rating?: number;
  comment?: string;
  createdAt: string;
}

// Limpiamos los arrays para empezar desde cero con Firebase
let users: User[] = [];
let tickets: Ticket[] = [];

export const getTickets = () => tickets;
export const getTicketById = (id: string) => tickets.find(t => t.id === id);
export const createTicket = (ticket: Omit<Ticket, 'id' | 'createdAt'>) => {
  const newTicket = {
    ...ticket,
    id: `T-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  tickets = [newTicket, ...tickets];
  return newTicket;
};

export const updateTicketStatus = (id: string, status: TicketStatus, evidence?: { beforeImg?: string, afterImg?: string, signature?: string }) => {
  tickets = tickets.map(t => t.id === id ? { ...t, status, ...evidence } : t);
};

export const assignTechToTicket = (ticketId: string, techId: string) => {
  tickets = tickets.map(t => t.id === ticketId ? { ...t, techId, status: 'asignado' } : t);
};

export const rateTicket = (id: string, rating: number, comment?: string) => {
  tickets = tickets.map(t => t.id === id ? { ...t, rating, comment } : t);
};

export const getUsers = () => users;
export const getUserById = (id: string) => users.find(u => u.id === id);
export const getUserByEmail = (email: string) => users.find(u => u.email === email);

export const approveUser = (id: string) => {
  users = users.map(u => u.id === id ? { ...u, status: 'approved' } : u);
};

export const verifyUser = (id: string) => {
  users = users.map(u => u.id === id ? { ...u, status: 'verified' } : u);
};

export const registerUser = (user: Omit<User, 'id'>) => {
  const newUser = { ...user, id: String(users.length + 1) };
  users.push(newUser);
  return newUser;
};
