/**
 * Type definitions for CapaCity frontend
 */

export type UserRole = "demandante" | "fornecedor" | "admin";
export type CompanyStatus = "Pendente" | "Em análise" | "Aprovado" | "Reprovado" | "Suspenso";
export type DemandStatus = "Publicado" | "Em cotação" | "Em negociação" | "Contratado" | "Finalizado" | "Cancelado";
export type OrderStatus = "Publicado" | "Em cotação" | "Contratado" | "Em setup" | "Em produção" | "Em inspeção" | "Aguardando coleta" | "Em transporte" | "Entregue" | "Finalizado" | "Cancelado";
export type Urgency = "Baixa" | "Média" | "Alta" | "Crítica";
export type RiskLevel = "Baixo" | "Médio" | "Alto" | "Crítico";
export type ContractStatus = "Gerado" | "Aguardando assinatura" | "Assinado" | "Cancelado";

export interface User {
  id?: string;
  userId?: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  company_id?: string;
  company?: string;
  cnpj?: string;
  avatar?: string;
  companyStatus?: CompanyStatus;
  company_status?: CompanyStatus;
  loginAt?: string;
}

export interface Demand {
  id: string;
  title: string;
  category?: string;
  process: string;
  material: string;
  qty?: string;
  deadline: string;
  urgency: Urgency;
  budget?: string;
  location?: string;
  status: DemandStatus;
  proposals?: number;
  proposals_count?: number;
  nda?: boolean;
  nda_required?: boolean;
  cert?: string;
  cert_required?: string;
  obs?: string;
  created?: string;
  created_at?: string;
}

export interface Proposal {
  id: string;
  supplier: string;
  supplier_name?: string;
  /** Pode vir como string (legacy) ou como objeto aninhado (API moderna). */
  company?: string | { id?: string; name?: string; rating?: number };
  status?: ProposalStatus;
  score?: number;
  rating?: number;
  total?: string;
  price?: number;
  lead_time_days?: number;
  notes?: string | null;
  risk?: RiskLevel;
  riskFactors?: string[];
  days?: number;
  start?: string;
  start_date?: string;
  city?: string;
  cert?: string;
  frete?: string;
  payment?: string;
  obs?: string;
  unit?: number;
  unit_price?: number;
  created?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  client?: string;
  supplier?: string;
  supplier_company_name?: string;
  product: string;
  value?: string;
  value_raw?: number;
  gross?: number;
  status: OrderStatus;
  pct?: number;
  deadline?: string;
  created?: string;
}

export interface Contract {
  id: string;
  pedido?: string;
  order_id?: string;
  demandante?: string;
  fornecedor?: string;
  valor?: string;
  value?: string;
  prazo?: string;
  status: ContractStatus;
  gerado?: string;
  generated_at?: string;
  assinado?: string;
  signed_at?: string;
  escopo?: string;
  scope?: string;
  created_at?: string;
  pdf_url?: string | null;
  content_hash?: string | null;
}

export interface Machine {
  id: string;
  name: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  turns?: string;
  cost?: string;
  idle?: number;
  monthly?: number;
  used?: number;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  type?: string;
  status: CompanyStatus;
  city?: string;
  address?: string;
  site?: string;
  logo_url?: string;
  orders_count?: number;
}

export interface Transaction {
  id: string;
  order_id?: string;
  order?: string;
  gross?: number;
  commission?: number;
  status?: string;
  created?: string;
  date?: string;
}

export interface Notification {
  id: number | string;
  tipo?: string;
  type?: string;
  icone?: string;
  titulo?: string;
  title?: string;
  desc?: string;
  description?: string;
  descricao?: string;
  body?: string;
  tempo?: string;
  lida?: boolean;
  read?: boolean;
  user_role?: UserRole;
  userType?: UserRole;
  created_at?: string;
  group_key?: string | null;
  count?: number;
}

export interface Review {
  id: string;
  order?: string;
  order_id?: string;
  from?: string;
  from_company?: string;
  rating?: number;
  comment?: string;
  date?: string;
  criterios?: [string, number][];
}

export interface Dispute {
  id: string;
  order?: string;
  order_id?: string;
  desc?: string;
  description?: string;
  reason?: string;
  resolution?: string | null;
  type?: string;
  impact?: string;
  status?: DisputeStatus | string;
  date?: string;
  parecer?: string;
  resolvedAt?: string;
  created_at?: string;
}

// ─── Additional types added for feature modules ───────────────────────────────

export type Role = UserRole; // alias

export type ProposalStatus = "Enviada" | "Em análise" | "Aceita" | "Recusada" | "Retirada";

export type NDAStatus = "Pendente" | "Ativo" | "Expirado" | "Cancelado";

export type TransactionType = "escrow_deposit" | "release" | "refund" | "fee";
export type TransactionStatus = "pendente" | "processando" | "concluído" | "falhou";

export type DisputeStatus = "Aberta" | "Em análise" | "Resolvida" | "Encerrada";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalState {
  open: boolean;
  componentKey?: string;
  props?: Record<string, unknown>;
}

export interface NDA {
  id: string;
  demand_id: string | null;
  party_a_company_id: string;
  party_b_company_id: string;
  party_a?: Pick<Company, "id" | "name">;
  party_b?: Pick<Company, "id" | "name">;
  status: NDAStatus;
  expires_at: string | null;
  signed_at: string | null;
  created_at: string;
}

export interface NDACreateInput {
  party_b_company_id: string;
  demand_id?: string | null;
  expires_at?: string | null;
}

export interface Conversation {
  id: string;
  demand_id: string | null;
  order_id: string | null;
  participant_ids: string[];
  participants?: Array<Pick<User, "id" | "name" | "avatar">>;
  last_message_at: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Pick<User, "id" | "name" | "avatar">;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender?: Pick<User, "id" | "name" | "avatar">;
  body: string;
  created_at: string;
}

export interface DisputeCreateInput {
  order_id: string;
  reason: string;
}

export interface ReviewCreateInput {
  order_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
}

export interface ProposalCreateInput {
  demand_id: string;
  price: number;
  lead_time_days: number;
  notes?: string | null;
}

export interface Upload {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  uploaded_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  evento: string;
  usuario: string;
  empresa: string;
  ip: string;
  data: string;
  tipo: string;
  ref: string | null;
  user_id: string | null;
  request_id: string | null;
  created_at: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  error: string;
  details?: Array<{ field?: string; msg: string }>;
}

// ─── End additional types ─────────────────────────────────────────────────────

export interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  loginErr: string;
  loginLoading: boolean;
  login: (email: string, password: string, role: UserRole, totp?: string) => Promise<boolean | string>;
  register: (form: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

export interface AppContextType {
  demands: Demand[];
  orders: Order[];
  machines: Machine[];
  companies: Company[];
  contracts: Contract[];
  ndas: any[];
  audit: any[];
  notifMap: Record<UserRole, Notification[]>;
  setNotifMap: (map: Record<UserRole, Notification[]>) => void;
  recurringContracts: any[];
  disputes: Dispute[];
  reviews: Review[];
  proposals: Proposal[];
  sentProposals: Proposal[];
  transactions: Transaction[];
  appLoading: boolean;
  createDemand: (data: any) => Promise<Demand>;
  acceptProposal: (proposal: Proposal, demand: Demand) => Promise<Order>;
  sendProposal: (data: any) => Promise<Proposal>;
  // ... outras funções
}
