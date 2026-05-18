/**
 * Application state context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGetList, apiFetch } from "../services/api";
import {
  normDemand,
  normOrder,
  normProposal,
  normTxn,
  normContract,
  normDispute,
  normReview,
  normNotif,
  normNDA,
} from "../utils";
import { Demand, Order, Proposal, AppContextType, UserRole } from "../types";
import { useAuth } from "./AuthContext";
import { toast } from "../utils/toast";

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [ndas, setNdas] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [notifMap, setNotifMap] = useState<Record<UserRole, any[]>>({
    demandante: [],
    fornecedor: [],
    admin: [],
  });
  const [recurringContracts, setRecurringContracts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [appLoading, setAppLoading] = useState(true);

  // Load all data when user changes
  useEffect(() => {
    if (!user) {
      setAppLoading(false);
      return;
    }

    let cancelled = false;
    const role = user?.role || "demandante";
    setAppLoading(true);

    Promise.all([
      apiGetList("/demands"),
      apiGetList("/orders"),
      apiGetList("/machines"),
      apiGetList("/companies"),
      apiGetList("/contracts"),
      apiGetList("/ndas"),
      apiGetList("/proposals"),
      apiGetList("/transactions"),
      apiGetList("/disputes"),
      apiGetList("/reviews"),
      apiGetList("/recurring"),
      apiGetList("/notifications"),
      role === "admin" ? apiGetList("/audit") : Promise.resolve([]),
    ])
      .then(
        ([
          dem,
          ord,
          maq,
          comp,
          ctrs,
          nds,
          props,
          txns,
          disp,
          rev,
          rec,
          notifs,
          adt,
        ]) => {
          if (cancelled) return;

          setDemands((dem || []).map(normDemand));
          setOrders((ord || []).map(normOrder));
          setMachines(maq || []);
          setCompanies(comp || []);
          setContracts((ctrs || []).map(normContract));
          setNdas((nds || []).map(normNDA));

          const allProps = (props || []).map(normProposal);
          setProposals(allProps);

          if (role === "fornecedor" && user?.company) {
            setSentProposals(
              allProps.filter(
                (p) => (p.supplier_name || p.supplier) === user.company
              )
            );
          } else {
            setSentProposals(allProps);
          }

          setTransactions((txns || []).map(normTxn));
          setDisputes((disp || []).map(normDispute));
          setReviews((rev || []).map(normReview));
          setRecurringContracts(rec || []);

          // Group notifications by role
          const nm: Record<UserRole, any[]> = {
            demandante: [],
            fornecedor: [],
            admin: [],
          };
          (notifs || []).forEach((n: any) => {
            const r = n.user_role as UserRole;
            if (nm[r]) nm[r].push(normNotif(n));
          });
          setNotifMap(nm);

          setAudit(adt || []);
          setAppLoading(false);
        }
      )
      .catch(() => {
        if (!cancelled) setAppLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.company]);

  const createDemand = useCallback(
    async (data: any) => {
      const res = await apiFetch("/demands", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      const d = normDemand(await res.json());
      setDemands((prev) => [d, ...prev]);
      toast.success("Demanda criada com sucesso!");
      return d;
    },
    []
  );

  const sendProposal = useCallback(
    async (data: any) => {
      const payload = {
        demand_id: data.demandId,
        total: data.total,
        total_raw: data.gross,
        unit_price: data.unit,
        days: data.days,
        start_date: data.start,
        cert: data.cert,
        risk: data.risk,
        frete: data.frete,
        payment: data.payment,
        obs: data.obs,
        risk_factors: data.riskFactors,
        score: data.score,
      };

      const res = await apiFetch("/proposals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }

      const prop = normProposal(await res.json());
      setSentProposals((p) => [prop, ...p]);
      setProposals((p) => [prop, ...p]);
      setDemands((d) =>
        d.map((dem) =>
          dem.id === data.demandId
            ? { ...dem, proposals: (dem.proposals || 0) + 1 }
            : dem
        )
      );
      toast.success("Proposta enviada com sucesso!");
      return prop;
    },
    []
  );

  const acceptProposal = useCallback(
    async (proposal: Proposal, demand: Demand) => {
      const res = await apiFetch(`/proposals/${proposal.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ demandId: demand.id }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      const order = normOrder(await res.json());
      setOrders((o) => [order, ...o]);
      setDemands((d) =>
        d.map((dem) =>
          dem.id === demand.id ? { ...dem, status: "Contratado" } : dem
        )
      );
      toast.success("Proposta aceita! Pedido criado.");
      return order;
    },
    []
  );

  const value: AppContextType = {
    demands,
    orders,
    machines,
    companies,
    contracts,
    ndas,
    audit,
    notifMap,
    setNotifMap,
    recurringContracts,
    disputes,
    reviews,
    proposals,
    sentProposals,
    transactions,
    appLoading,
    createDemand,
    acceptProposal,
    sendProposal,
  } as AppContextType;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
