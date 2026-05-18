/**
 * REFACTORING MAP: Original App.tsx (4165 lines) → Modular Architecture
 * 
 * This file documents what needs to be extracted from the monolithic App.tsx
 * along with approximate line numbers for reference.
 */

// ────────────────────────────────────────────────────────────────
// PHASE 1 FOUNDATION: COMPLETED ✅ (1700+ lines)
// ────────────────────────────────────────────────────────────────

// types/index.ts ✅
// - User, Demand, Proposal, Order, Contract, Machine, Company, etc.
// - AuthContextType, AppContextType
// - UserRole, CompanyStatus, DemandStatus, etc.

// services/api.ts ✅
// - apiFetch, apiGet, apiPost, apiPatch, apiDelete, apiUpload

// utils/index.ts ✅
// - Formatters: fmtDate, fmtBRL
// - Normalizers: normDemand, normOrder, normProposal, normContract, etc.
// - DB wrapper: get, set, del
// - clearLegacySession, normalizeSessionUser, getCookie

// utils/constants.ts ✅
// - COLORS, STATUS_COLORS, RISK_COLORS, URG_COLORS
// - SCORE_CRITERIA, ORDER_STATUS_STEPS
// - DEMO_USERS, INDUSTRIES

// utils/toast.ts ✅
// - Toast notifications with subscriptions

// hooks/index.ts ✅
// - useFetch, useCreateMutation, useUpdateMutation, useDeleteMutation
// - useToggle, useAsync, useLocalStorage, useDebounce

// components/ui/BaseComponents.tsx ✅
// - Badge, Btn, Card, FormField, Stat, SectionTitle

// app/AuthContext.tsx ✅
// - AuthProvider, useAuth hook
// - login, register, logout, updateUser

// app/AppContext.tsx ✅
// - AppProvider, useApp hook
// - All app state: demands, orders, machines, companies, etc.

// ────────────────────────────────────────────────────────────────
// PHASE 2: PAGES & SCREENS (To be extracted ~1400 lines)
// ────────────────────────────────────────────────────────────────

// PRIORITY 1: Authentication Pages
// - Landing.tsx (line ~1081) - Hero, features, pricing
// - LoginPage.tsx (line ~1330) - Email + password form with demo mode
// - RegisterPage.tsx (line ~1460) - Registration form with role selection
// - ForgotPasswordPage.tsx (line ~1589) - Password recovery
// - ResetPasswordPage.tsx (line ~1619) - Reset password with token
// - VerifyEmailPage.tsx (line ~1654) - Email verification

// PRIORITY 2: Dashboard Components (Role-based)
// - DashDemandante.tsx (line ~2002) - Demand dashboard
// - DashFornecedor.tsx (line ~2168) - Supplier dashboard
// - DashAdmin.tsx (line ~2410) - Admin dashboard

// PRIORITY 3: Feature Pages (Extracted by section)
// - VerificacaoEmpresarial.tsx (line ~2693) - Company verification
// - VerificacaoAdmin.tsx (line ~3000) - Admin verification panel
// - Pedidos.tsx - Orders list and management
// - ListaDemandas.tsx - Demands list
// - BuscarFornecedores.tsx - Supplier search
// - CompararPropostas.tsx - Proposal comparison
// - ContratosNDA.tsx - NDA & contracts
// - ContratosRecorrentes.tsx - Recurring contracts
// - Chat.tsx - Messaging
// - Qualidade.tsx - Quality management
// - Financeiro.tsx - Financial dashboard
// - Avaliacoes.tsx - Reviews and ratings
// - Configuracoes.tsx - Settings

// ────────────────────────────────────────────────────────────────
// PHASE 3: MODALS (To be extracted ~900 lines)
// ────────────────────────────────────────────────────────────────

// COMPLETED ✅
// - BaseModal (line ~673)
// - ScoreModal.tsx (line ~689)
// - RiskModal.tsx (line ~732)

// PENDING (18 more modals)
// - NDAModal.tsx (line ~769)
// - LaudoModal.tsx (line ~821)
// - NCModal.tsx (line ~893)
// - DocViewerModal.tsx (line ~930)
// - ContratoViewerModal.tsx (line ~969)
// - PropostaDetailModal.tsx (line ~1040)
// - NotificacaoPanel.tsx (line ~1080)
// - And others...

// ────────────────────────────────────────────────────────────────
// PHASE 4: LAYOUT & ROUTING (To be created ~500 lines)
// ────────────────────────────────────────────────────────────────

// - AppShell.tsx - Main app layout with sidebar + header
// - Header.tsx - Top navigation bar
// - Sidebar.tsx - Left navigation menu
// - RoutingManager.tsx - Page routing logic based on user role

// ────────────────────────────────────────────────────────────────
// PHASE 5: INTEGRATION & TESTING (To be validated ~300 lines)
// ────────────────────────────────────────────────────────────────

// - Validate all imports are correct
// - Fix circular dependency issues
// - Test auth flow (login → dashboard → logout)
// - Test API calls with real endpoints
// - Fix styling issues
// - Performance optimization

// ────────────────────────────────────────────────────────────────
// EXTRACTION STRATEGY
// ────────────────────────────────────────────────────────────────

// 1. High Priority: Extract authentication pages first (shared by all roles)
// 2. Medium Priority: Extract dashboards (role-specific, high usage)
// 3. Medium Priority: Extract core modals (ScoreModal, PropostaDetailModal)
// 4. Lower Priority: Extract feature pages (can be stubbed initially)
// 5. Final: Create layout wrapper and integrate everything

// ────────────────────────────────────────────────────────────────
// METRICS
// ────────────────────────────────────────────────────────────────

// Original App.tsx: 4165 lines
// Target distributed across: 40+ files
// Reduction per file: 100-150 lines average
// Benefits:
//   - Improved readability and maintainability
//   - Easier testing (isolated components)
//   - Better code reuse (shared hooks, utils, types)
//   - Faster development cycles
//   - Clearer separation of concerns

export const EXTRACTION_MAP = {
  total_lines: 4165,
  foundation_complete: true,
  pages_pending: 15,
  modals_pending: 18,
  layouts_pending: 3,
  current_phase: 'Phase 2 - Pages & Screens',
};
