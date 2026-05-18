// @ts-nocheck
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  ARQUIVO LEGADO — NÃO ADICIONAR NOVAS FUNCIONALIDADES AQUI  ⚠️      ║
 * ║                                                                          ║
 * ║  Este arquivo tem ~4.264 linhas sem tipagem TypeScript.                 ║
 * ║  Existe apenas como ponte de transição enquanto extraímos o código      ║
 * ║  para módulos tipados em frontend/src/features/.                        ║
 * ║                                                                          ║
 * ║  REGRAS:                                                                 ║
 * ║  ❌ Proibido adicionar novas features aqui                               ║
 * ║  ❌ Proibido corrigir bugs editando diretamente (extraia primeiro)       ║
 * ║  ✅ Bugs críticos → corrigir aqui + abrir issue "extrair depois"        ║
 * ║  ✅ Novo código → sempre em features/<dominio>/NomeComponente.tsx        ║
 * ║                                                                          ║
 * ║  Plano de migração: frontend/src/legacy/README.md                       ║
 * ║  Issue de rastreamento: https://github.com/joaocaarlos/teste.neta/issues/4 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import {
  LayoutDashboard, Factory, Package, FileText, Users, Settings,
  Bell, Search, Plus, Star, Clock, MapPin, CheckCircle, AlertCircle,
  TrendingUp, DollarSign, Zap, Shield, MessageCircle, Calendar,
  Wrench, BarChart2, LogOut, X, Upload, Send, ArrowRight, Check,
  ChevronDown, Activity, Truck, CreditCard, Eye, Filter, ChevronRight,
  AlertTriangle, Layers, Target, BarChart, Cpu, Award, RefreshCw,
  PieChart, FileCheck, ClipboardList, CircleDot, Inbox, Lock, Unlock,
  FilePlus, FileSignature, Repeat, ScrollText, Info, ChevronUp,
  UserCheck, BadgeCheck, ShieldCheck, Fingerprint, GitBranch, Terminal,
  Radio, Pencil, RotateCcw, BookOpen, Slash, Printer, SlidersHorizontal, Download
} from "lucide-react";

// ─── Features modulares plugadas no legacy ────────────────────────────────────
import { RegisterWizard } from "../features/auth/RegisterWizard";
import { FeedbackWidget as ModularFeedbackWidget } from "../features/feedback/FeedbackWidget";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useSSE } from "../hooks/useSSE";
import { startCheckout } from "../services/stripe";

// ─── Módulos centralizados (extraídos do legado) ──────────────────────────────
import { apiFetch, apiGetList as apiGet } from "../services/api";
import {
  DB,
  clearLegacySession, normalizeSessionUser, getCookie,
  fmtDate,
  normDemand, normOrder, normProposal, normTxn, normContract,
  normDispute, normReview, normNotif, normNDA,
} from "../utils";
// Usado pelas 3 chamadas fetch diretas no AuthProvider (login/register/me)
const API_BASE = "/api";

const APP_SSE_EVENTS=[
  "demand.created",
  "proposal.received",
  "proposal.countered",
  "proposal.accepted",
  "payment.held",
  "payment.released",
  "order.status",
  "order.update",
  "order.tracking",
  "order.delivery.created",
  "order.delivery.reviewed",
  "order.fiscal_document",
  "contract.signed",
  "dispute.opened",
  "dispute.message",
  "message.new",
  "message.typing",
  "notification.new",
];

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx=createContext(null);
function AuthProvider({children}){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const res=await fetch(`${API_BASE}/auth/me`,{credentials:"include"});
        if(res.ok){
          const data=await res.json();
          if(!cancelled) setUser(normalizeSessionUser(data));
        }else{
          clearLegacySession();
        }
      }catch{
        clearLegacySession();
      }finally{
        if(!cancelled) setAuthLoading(false);
      }
    })();
    return()=>{cancelled=true;};
  },[]);

  const login=useCallback(async(email,password,role,totp="")=>{
    setLoginLoading(true); setLoginErr("");
    try{
      const res=await fetch(`${API_BASE}/auth/login`,{
        method:"POST",
        credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password,role,...(totp?{totp}: {})}),
      });
      const data=await res.json();
      if(!res.ok){setLoginErr(data.error||"Credenciais inválidas.");return data.code||false;}
      clearLegacySession();
      const session=normalizeSessionUser(data.user);
      setUser(session);
      return true;
    }catch{setLoginErr("Erro de conexão com o servidor.");return false;}
    finally{setLoginLoading(false);}
  },[]);

  const register=useCallback(async(form)=>{
    setLoginLoading(true); setLoginErr("");
    try{
      const res=await fetch(`${API_BASE}/auth/register`,{
        method:"POST",
        credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(form),
      });
      const data=await res.json();
      if(!res.ok){setLoginErr(data.error||"Erro no cadastro.");return false;}
      if(!data.token){
        setLoginErr(data.message||"Cadastro recebido. Verifique seu e-mail para ativar o acesso.");
        toast.info(data.message||"Verifique seu e-mail para ativar o acesso.");
        return false;
      }
      clearLegacySession();
      const session=normalizeSessionUser(data.user);
      setUser(session);
      return true;
    }catch{setLoginErr("Erro de conexão com o servidor.");return false;}
    finally{setLoginLoading(false);}
  },[]);

  const logout=useCallback(async()=>{
    try{await apiFetch("/auth/logout",{method:"POST"});}catch{}
    clearLegacySession();
    setUser(null);
  },[]);

  const updateUser=useCallback(patch=>{
    setUser(u=>{
      const next={...(u||{}),...patch};
      return next;
    });
  },[]);

  return <AuthCtx.Provider value={{user,authLoading,login,register,logout,updateUser,loginErr,loginLoading}}>{children}</AuthCtx.Provider>;
}
const useAuth=()=>useContext(AuthCtx);

// ─── APP CONTEXT ──────────────────────────────────────────────────────────────
const AppCtx=createContext(null);
function AppProvider({children}){
  const {user}=useAuth();
  const [demands,         setDemands]          = useState([]);
  const [orders,          setOrders]           = useState([]);
  const [machines,        setMachines]         = useState([]);
  const [companies,       setCompanies]        = useState([]);
  const [contracts,       setContracts]        = useState([]);
  const [ndas,            setNdas]             = useState([]);
  const [audit,           setAudit]            = useState([]);
  const [notifMap,        setNotifMap]         = useState({demandante:[],fornecedor:[],admin:[]});
  const [recurringContracts,setRecurringContracts] = useState([]);
  const [disputes,        setDisputes]         = useState([]);
  const [reviews,         setReviews]          = useState([]);
  const [proposals,       setProposals]        = useState([]);
  const [sentProposals,   setSentProposals]    = useState([]);
  const [transactions,    setTransactions]     = useState([]);
  const [appLoading,      setAppLoading]       = useState(true);
  const sseEvent=useSSE(APP_SSE_EVENTS,{enabled:Boolean(user)});

  // Carrega todos os dados da API ao montar (requer token válido)
  useEffect(()=>{
    if(!user){setAppLoading(false);return;}
    let cancelled=false;
    const role=user?.role;
    setAppLoading(true);

    Promise.all([
      apiGet("/demands"),
      apiGet("/orders"),
      apiGet("/machines"),
      apiGet("/companies"),
      apiGet("/contracts"),
      apiGet("/ndas"),
      apiGet("/proposals"),
      apiGet("/transactions"),
      apiGet("/disputes"),
      apiGet("/reviews"),
      apiGet("/recurring"),
      apiGet("/notifications"),
      role==="admin"?apiGet("/audit"):Promise.resolve([]),
    ]).then(([dem,ord,maq,comp,ctrs,nds,props,txns,disp,rev,rec,notifs,adt])=>{
      if(cancelled) return;
      setDemands((dem||[]).map(normDemand));
      setOrders((ord||[]).map(normOrder));
      setMachines(maq||[]);
      setCompanies(comp||[]);
      setContracts((ctrs||[]).map(normContract));
      setNdas((nds||[]).map(normNDA));
      const allProps=(props||[]).map(normProposal);
      setProposals(allProps);
      // Propostas enviadas pelo fornecedor atual
      if(role==="fornecedor"&&user?.company){
        setSentProposals(allProps.filter(p=>(p.supplier_name||p.supplier)===user.company));
      }else{
        setSentProposals(allProps);
      }
      setTransactions((txns||[]).map(normTxn));
      setDisputes((disp||[]).map(normDispute));
      setReviews((rev||[]).map(normReview));
      setRecurringContracts(rec||[]);
      // Notificações agrupadas por role
      const nm={demandante:[],fornecedor:[],admin:[]};
      (notifs||[]).forEach(n=>{const r=n.user_role;if(nm[r])nm[r].push(normNotif(n));});
      setNotifMap(nm);
      setAudit(adt||[]);
      setAppLoading(false);
    }).catch(()=>{
      if(!cancelled) setAppLoading(false);
    });
    return()=>{cancelled=true;};
  },[user?.id,user?.role,user?.company]);

  const addAudit=useCallback(()=>{},[]);  // audit é server-side

  useEffect(()=>{
    if(!user||!sseEvent) return;
    const reloadNotifications=()=>apiGet("/notifications").then(rows=>{
      const nm={demandante:[],fornecedor:[],admin:[]};
      (rows||[]).forEach(n=>{const r=n.user_role;if(nm[r])nm[r].push(normNotif(n));});
      setNotifMap(nm);
    });
    const reloadOrders=()=>apiGet("/orders").then(rows=>setOrders((rows||[]).map(normOrder)));
    const reloadContracts=()=>apiGet("/contracts").then(rows=>setContracts((rows||[]).map(normContract)));
    const reloadTransactions=()=>apiGet("/transactions").then(rows=>setTransactions((rows||[]).map(normTxn)));
    const reloadProposals=()=>apiGet("/proposals").then(rows=>{
      const all=(rows||[]).map(normProposal);
      setProposals(all);
      setSentProposals(user.role==="fornecedor"&&user.company?all.filter(p=>(p.supplier_name||p.supplier)===user.company):all);
    });
    const reloadDisputes=()=>apiGet("/disputes").then(rows=>setDisputes((rows||[]).map(normDispute)));
    const onDemand=()=>{toast.info("Nova demanda recebida.");apiGet("/demands").then(rows=>setDemands((rows||[]).map(normDemand)));reloadNotifications();};
    const onProposal=()=>{toast.info(sseEvent.type==="proposal.countered"?"Contraproposta recebida.":"Nova proposta recebida.");reloadProposals();reloadNotifications();};
    const onAccepted=()=>{toast.success("Proposta aceita.");reloadOrders();reloadProposals();reloadContracts();reloadTransactions();};
    const onOrder=()=>{reloadOrders();reloadNotifications();};
    const onPayment=()=>{toast.info(sseEvent.type==="payment.released"?"Pagamento liberado.":"Pagamento retido para acompanhamento.");reloadTransactions();reloadNotifications();};
    const onContract=()=>{toast.info("Contrato atualizado.");reloadContracts();};
    const onDispute=()=>{toast.warning(sseEvent.type==="dispute.message"?"Nova mensagem na disputa.":"Nova disputa aberta.");reloadDisputes();reloadNotifications();};
    const onMessage=()=>{window.dispatchEvent(new CustomEvent(`sse:${sseEvent.type}`,{detail:sseEvent.data}));if(sseEvent.type==="message.new")toast.info("Nova mensagem recebida.");};
    if(sseEvent.type==="demand.created") onDemand();
    else if(["proposal.received","proposal.countered"].includes(sseEvent.type)) onProposal();
    else if(sseEvent.type==="proposal.accepted") onAccepted();
    else if(["order.status","order.update","order.tracking","order.delivery.created","order.delivery.reviewed","order.fiscal_document"].includes(sseEvent.type)) onOrder();
    else if(["payment.held","payment.released"].includes(sseEvent.type)) onPayment();
    else if(sseEvent.type==="contract.signed") onContract();
    else if(["dispute.opened","dispute.message"].includes(sseEvent.type)) onDispute();
    else if(["message.new","message.typing"].includes(sseEvent.type)) onMessage();
    else if(sseEvent.type==="notification.new") reloadNotifications();
  },[sseEvent,user?.id,user?.role,user?.company]);

  const createDemand=useCallback(async(data)=>{
    const res=await apiFetch("/demands",{method:"POST",body:JSON.stringify(data)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const d=normDemand(await res.json());
    setDemands(prev=>[d,...prev]);
    return d;
  },[]);

  const sendProposal=useCallback(async(data)=>{
    const payload={demand_id:data.demandId,total:data.total,total_raw:data.gross,unit_price:data.unit,days:data.days,start_date:data.start,cert:data.cert,risk:data.risk,frete:data.frete,payment:data.payment,obs:data.obs,risk_factors:data.riskFactors,score:data.score};
    const res=await apiFetch("/proposals",{method:"POST",body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const prop=normProposal(await res.json());
    if(data.file){
      const fd=new FormData();
      fd.append("files",data.file);
      const up=await apiFetch(`/proposals/${prop.id}/attachments`,{method:"POST",body:fd});
      if(!up.ok) toast.warning("Proposta enviada, mas o anexo não foi enviado.");
    }
    setSentProposals(p=>[prop,...p]);
    setProposals(p=>[prop,...p]);
    setDemands(d=>d.map(dem=>dem.id===data.demandId?{...dem,proposals:(dem.proposals||0)+1}:dem));
    return prop;
  },[]);

  const acceptProposal=useCallback(async(proposal,demand)=>{
    const res=await apiFetch(`/proposals/${proposal.id}/accept`,{method:"POST",body:JSON.stringify({demandId:demand.id})});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const order=normOrder(await res.json());
    setOrders(o=>[order,...o]);
    setDemands(d=>d.map(dem=>dem.id===demand.id?{...dem,status:"Contratado"}:dem));
    // Recarrega contratos e transações gerados pelo aceite
    apiGet("/contracts").then(c=>setContracts((c||[]).map(normContract)));
    apiGet("/transactions").then(t=>setTransactions((t||[]).map(normTxn)));
    return order;
  },[]);

  const createCounterProposal=useCallback(async(proposal,data)=>{
    const res=await apiFetch(`/proposals/${proposal.id}/counter`,{method:"POST",body:JSON.stringify(data)});
    const json=await res.json().catch(()=>({}));
    if(!res.ok){toast.error(json.error||"Nao foi possivel enviar contraproposta.");return null;}
    const prop=normProposal(json);
    setProposals(p=>[prop,...p.map(x=>x.id===proposal.id?{...x,status:"Contraproposta"}:x)]);
    return prop;
  },[]);

  const signContract=useCallback(async(ctId)=>{
    const res=await apiFetch(`/contracts/${ctId}/sign`,{method:"POST"});
    if(!res.ok)return;
    const ct=normContract(await res.json());
    setContracts(c=>c.map(x=>x.id===ctId?ct:x));
  },[]);

  const signNDA=useCallback(async(demandId,user)=>{
    const existing=ndas.find(n=>n.demand_id===demandId||n.demanda===demandId);
    if(existing){
      const res=await apiFetch(`/ndas/${existing.id}/sign`,{method:"POST"});
      if(res.ok){const nda=normNDA(await res.json());setNdas(n=>n.map(x=>x.id===existing.id?nda:x));return nda;}
    }
    const res=await apiFetch("/ndas",{method:"POST",body:JSON.stringify({demand_id:demandId,contraparte:user.company})});
    if(!res.ok)return null;
    const nda=await res.json();
    const signRes=await apiFetch(`/ndas/${nda.id}/sign`,{method:"POST"});
    const signed=normNDA(signRes.ok?await signRes.json():nda);
    setNdas(n=>[signed,...n]);
    return signed;
  },[ndas]);

  const addMachine=useCallback(async(data)=>{
    const {photoFile,...payload}=data;
    const res=await apiFetch("/machines",{method:"POST",body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    let m=await res.json();
    if(photoFile){
      const fd=new FormData();
      fd.append("file",photoFile);
      const up=await apiFetch(`/machines/${m.id}/photo`,{method:"PATCH",body:fd});
      if(up.ok) m=await up.json();
      else toast.warning("Máquina cadastrada, mas a foto não foi enviada.");
    }
    setMachines(prev=>[...prev,m]);
    return m;
  },[]);

  const approveCompany=useCallback(async(cId)=>{
    const res=await apiFetch(`/companies/${cId}/approve`,{method:"POST"});
    if(!res.ok)return;
    setCompanies(cs=>cs.map(c=>c.id===cId?{...c,status:"Aprovado"}:c));
  },[]);

  const rejectCompany=useCallback(async(cId,_user,motivo)=>{
    const res=await apiFetch(`/companies/${cId}/reject`,{method:"POST",body:JSON.stringify({reason:motivo})});
    if(!res.ok)return;
    setCompanies(cs=>cs.map(c=>c.id===cId?{...c,status:"Reprovado"}:c));
  },[]);

  const updateOrderStatus=useCallback(async(orderId,newStatus,pct)=>{
    const res=await apiFetch(`/orders/${orderId}/status`,{method:"PATCH",body:JSON.stringify({status:newStatus,pct})});
    if(!res.ok)return;
    setOrders(o=>o.map(x=>x.id===orderId?{...x,status:newStatus,pct:pct??x.pct}:x));
  },[]);

  const createRecurringContract=useCallback(async(data)=>{
    const res=await apiFetch("/recurring",{method:"POST",body:JSON.stringify(data)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const rc=await res.json();
    setRecurringContracts(r=>[rc,...r]);
    return rc;
  },[]);

  const toggleRecurringStatus=useCallback(async(id)=>{
    const current=recurringContracts.find(c=>c.id===id);
    const ep=current?.status==="Ativo"?"pause":"resume";
    const res=await apiFetch(`/recurring/${id}/${ep}`,{method:"POST"});
    if(!res.ok)return;
    const updated=await res.json();
    setRecurringContracts(r=>r.map(c=>c.id===id?updated:c));
  },[recurringContracts]);

  const resolveDispute=useCallback(async(id,parecer,userRef)=>{
    const res=await apiFetch(`/disputes/${id}/resolve`,{method:"POST",body:JSON.stringify({parecer,resolution:"no_action"})});
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      console.warn("Falha ao sincronizar disputa com API:",data.error||res.status);
      toast.warning("API recusou a sincronizacao, mas a resolucao foi registrada no painel e notificada em tempo real.");
    }
    const stamp=nowPtBr();
    const dispute=disputes.find(d=>d.id===id);
    setDisputes(d=>d.map(x=>x.id===id?{...x,status:"Resolvida",parecer,resolution:parecer,resolvidoEm:stamp,resolvidoPor:userRef?.name||"Admin CapaCity"}:x));
    setNotifMap(map=>{
      const notice={id:`notif-dispute-${Date.now()}`,tipo:"disputa",icone:"!",titulo:"Disputa resolvida",desc:`${id} teve parecer final publicado${dispute?.order?` · ${dispute.order}`:""}.`,tempo:"agora",lida:false};
      return {
        ...map,
        admin:[notice,...(map.admin||[])],
        demandante:[notice,...(map.demandante||[])],
        fornecedor:[notice,...(map.fornecedor||[])],
      };
    });
    setAudit(a=>[{id:Date.now(),evento:`Disputa resolvida: ${id}`,usuario:userRef?.name||"Admin CapaCity",empresa:userRef?.company||"CapaCity",ip:"127.0.0.1",data:stamp,tipo:"disputa",ref:id},...a]);
    toast.success(`Resolucao de ${id} publicada em tempo real.`);
    return true;
  },[disputes]);

  const openDispute=useCallback(async(data)=>{
    const payload={order_id:data.order,type:data.type,impact:data.impact,demandante:data.demandante,fornecedor:data.fornecedor,description:data.desc};
    const res=await apiFetch("/disputes",{method:"POST",body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const dp=normDispute(await res.json());
    if(data.file){
      const fd=new FormData();
      fd.append("files",data.file);
      const up=await apiFetch(`/disputes/${dp.id}/attachments`,{method:"POST",body:fd});
      if(!up.ok) toast.warning("Disputa aberta, mas o anexo não foi enviado.");
    }
    setDisputes(d=>[dp,...d]);
    return dp;
  },[]);

  const addReview=useCallback(async(data)=>{
    const payload={order_id:data.order,rating:data.rating,comment:data.comment,criterios:data.criterios};
    const res=await apiFetch("/reviews",{method:"POST",body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.error);}
    const rv=normReview(await res.json());
    setReviews(r=>[rv,...r]);
    return rv;
  },[]);

  const releaseTransaction=useCallback(async(id)=>{
    const res=await apiFetch(`/transactions/${id}/release`,{method:"POST"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){toast.error(data.error||"Nao foi possivel liberar o pagamento.");return false;}
    setTransactions(prev=>prev.map(t=>t.id===id?normTxn({...t,...data}):t));
    toast.success(`Pagamento ${id} liberado.`);
    return true;
  },[]);

  const refundTransaction=useCallback(async(id)=>{
    if(!window.confirm(`Confirmar reembolso da transacao ${id}?`)) return;
    const res=await apiFetch(`/transactions/${id}/refund`,{method:"POST",body:JSON.stringify({reason:"requested_by_customer"})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){toast.error(data.error||"Nao foi possivel reembolsar.");return;}
    setTransactions(prev=>prev.map(t=>t.id===id?normTxn({...t,...data}):t));
    toast.success(`Reembolso ${id} registrado.`);
  },[]);

  const checkoutTransaction=useCallback(async(id)=>{
    try{
      await startCheckout(id, apiFetch);
    }catch(err){
      toast.error(err?.message||"Nao foi possivel iniciar o pagamento.");
    }
  },[]);

  const onboardStripeCompany=useCallback(async(companyId)=>{
    if(!companyId){toast.error("Empresa nao encontrada para configurar repasse.");return;}
    const res=await apiFetch(`/companies/${companyId}/stripe/onboarding`,{method:"POST"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){toast.error(data.error||"Nao foi possivel iniciar onboarding Stripe.");return;}
    if(data.onboardingUrl) window.location.href=data.onboardingUrl;
  },[]);

  return(
    <AppCtx.Provider value={{demands,orders,machines,companies,contracts,ndas,audit,notifMap,setNotifMap,recurringContracts,disputes,reviews,proposals,sentProposals,transactions,appLoading,createDemand,acceptProposal,createCounterProposal,signContract,signNDA,addMachine,approveCompany,rejectCompany,updateOrderStatus,createRecurringContract,toggleRecurringStatus,resolveDispute,openDispute,addReview,sendProposal,addAudit,releaseTransaction,refundTransaction,checkoutTransaction,onboardStripeCompany}}>
      {children}
    </AppCtx.Provider>
  );
}
const useApp=()=>useContext(AppCtx);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=Barlow:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070708;--bg2:#0f0f11;--bg3:#161618;--bg4:#1e1e21;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
  --amber:#E8A020;--amber2:#F5B942;--amber-dim:rgba(232,160,32,0.1);
  --amber-dim2:rgba(232,160,32,0.18);
  --green:#22C55E;--red:#EF4444;--blue:#3B82F6;--purple:#A855F7;--orange:#F97316;
  --white:#F2EDE4;--white2:#B9AEA0;--white3:#A89F93;
  --cond:'Barlow Condensed',sans-serif;
  --body:'Barlow',sans-serif;
  --mono:'IBM Plex Mono',monospace;
}
body{background:var(--bg);color:var(--white);font-family:var(--body);overflow-x:hidden}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(232,160,32,0.4)}
input,textarea,select{background:var(--bg3);border:1px solid var(--border);color:var(--white);font-family:var(--body);font-size:14px;padding:10px 14px;outline:none;transition:border-color .2s;width:100%;border-radius:0}
input:focus,textarea:focus,select:focus{border-color:rgba(232,160,32,0.5)}
input::placeholder,textarea::placeholder{color:var(--white3)}
select option{background:var(--bg3)}
button{cursor:pointer;font-family:var(--body)}
.grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(232,160,32,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(232,160,32,0.025) 1px,transparent 1px);background-size:50px 50px;pointer-events:none;z-index:0}
.ticker-wrap{background:var(--amber);overflow:hidden;padding:9px 0}
.ticker{display:flex;animation:ticker 50s linear infinite;white-space:nowrap}
.ticker-item{font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--bg);padding:0 32px;display:flex;align-items:center;gap:12px}
.ticker-item::after{content:'◆'}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.fadeup{animation:fadeup .7s ease both}
@keyframes fadeup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-box{background:var(--bg2);border:1px solid var(--border2);max-width:580px;width:90%;max-height:90vh;overflow-y:auto;position:relative}
.notif-panel{position:fixed;top:56px;right:0;width:380px;height:calc(100vh - 56px);background:var(--bg2);border-left:1px solid var(--border);z-index:150;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease}
.notif-panel.open{transform:translateX(0)}
.score-bar{background:rgba(255,255,255,.06);height:6px;position:relative;border-radius:0}
.score-fill{position:absolute;left:0;top:0;bottom:0;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.risk-glow-low{box-shadow:0 0 0 1px rgba(34,197,94,.25)}
.risk-glow-med{box-shadow:0 0 0 1px rgba(249,115,22,.25)}
.risk-glow-high{box-shadow:0 0 0 1px rgba(239,68,68,.25)}
.risk-glow-crit{box-shadow:0 0 0 2px rgba(239,68,68,.5)}
.seg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border)}
.seg-item{background:var(--bg);padding:24px 20px;cursor:pointer;transition:background .2s}
.seg-item:hover{background:var(--amber-dim2)}
.tab-bar{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab-btn{padding:10px 20px;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--white3);transition:all .2s}
.tab-btn.active{color:var(--amber);border-bottom-color:var(--amber)}
`;

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const DISPUTES_SEED=[
  {id:"DP-041",order:"PD-4799",demandante:"Sigma Ind Ltda",fornecedor:"CNC Express",type:"Qualidade",impact:"Alto",status:"Em análise",date:"01/05/2026",desc:"Peças com dimensional fora de especificação. 120 peças reprovadas no recebimento.",parecer:null},
  {id:"DP-039",order:"PD-4788",demandante:"DataBR Sistemas",fornecedor:"Indfab Nordeste",type:"Atraso",impact:"Médio",status:"Aberta",date:"28/04/2026",desc:"Entrega 8 dias após prazo contratual sem comunicação prévia.",parecer:null},
  {id:"DP-038",order:"PD-4780",demandante:"AutoPeças Brasil",fornecedor:"Precisão Tech",type:"Quebra de confidencialidade",impact:"Alto",status:"Em análise",date:"25/04/2026",desc:"Desenho técnico confidencial compartilhado com terceiros sem autorização.",parecer:null},
  {id:"DP-035",order:"PD-4765",demandante:"Embalagens BR",fornecedor:"Indfab Nordeste",type:"Quantidade",impact:"Baixo",status:"Resolvida",date:"20/04/2026",desc:"Entrega de 80% da quantidade contratada sem justificativa.",parecer:"Fornecedor reembolsou diferença proporcional. Aceito pelas partes.",resolvidoEm:"22/04/2026"},
  {id:"DP-033",order:"PD-4750",demandante:"MegaMóveis SA",fornecedor:"Metalúrgica NE",type:"Acabamento incorreto",impact:"Médio",status:"Resolvida",date:"15/04/2026",desc:"Acabamento superficial diferente do especificado no contrato.",parecer:"Retrabalho realizado pelo fornecedor sem custo adicional.",resolvidoEm:"18/04/2026"},
];
const REVIEWS_SEED=[
  {id:"RV-001",order:"PD-4818",from:"Eletro Nordeste SA",rating:5,comment:"Peças dentro da tolerância. Entrega 2 dias antes do prazo.",date:"02/05/2026",criterios:[["Qualidade técnica",5],["Cumprimento de prazo",5],["Comunicação",5],["Documentação",4]]},
  {id:"RV-002",order:"PD-4810",from:"Startup Industrial BR",rating:4,comment:"Boa comunicação. Pequeno desvio dimensional resolvido rapidamente.",date:"28/04/2026",criterios:[["Qualidade técnica",4],["Cumprimento de prazo",4],["Comunicação",5],["Documentação",3]]},
  {id:"RV-003",order:"PD-4801",from:"Construtora Rio Branco",rating:5,comment:"Processo impecável. Produto conforme especificação.",date:"24/04/2026",criterios:[["Qualidade técnica",5],["Cumprimento de prazo",5],["Comunicação",4],["Documentação",5]]},
];
const DEMANDS = [
  {id:"DM-4821",title:"5.000 suportes metálicos aço carbono",category:"Usinagem CNC",process:"Torneamento CNC",material:"Aço SAE 1020",qty:"5.000 peças",deadline:"20/05/2026",urgency:"Alta",budget:"R$ 25.000 – R$ 35.000",location:"Recife/PE",status:"Em cotação",proposals:7,nda:false,cert:"ISO 9001",created:"02/05/2026"},
  {id:"DM-4819",title:"Injeção plástica carcaça PP – 2k lote",category:"Plástico",process:"Injeção Plástica",material:"PP copolímero",qty:"2.000 peças",deadline:"15/05/2026",urgency:"Crítica",budget:"R$ 12.000 – R$ 18.000",location:"São Paulo/SP",status:"Em negociação",proposals:4,nda:true,cert:"Nenhuma",created:"01/05/2026"},
  {id:"DM-4810",title:"Corte laser e dobra chapas 2mm inox",category:"Corte/Dobra",process:"Corte Laser + Dobra CNC",material:"Inox 304 – 2mm",qty:"800 chapas",deadline:"25/05/2026",urgency:"Média",budget:"R$ 8.000 – R$ 14.000",location:"Fortaleza/CE",status:"Publicado",proposals:2,nda:false,cert:"Nenhuma",created:"30/04/2026"},
  {id:"DM-4805",title:"Soldagem MIG estruturas caldeiraria",category:"Soldagem",process:"Soldagem MIG/TIG",material:"Aço estrutural",qty:"12 estruturas",deadline:"10/06/2026",urgency:"Baixa",budget:"R$ 45.000 – R$ 60.000",location:"Recife/PE",status:"Publicado",proposals:1,nda:true,cert:"ASME",created:"29/04/2026"},
];
// PROPOSALS removed — data comes from AppCtx via /api/proposals
const MACHINES = [
  {id:"MQ-001",name:"Torno CNC Romi Centur 30D",type:"Torneamento",brand:"Romi",model:"Centur 30D",year:2020,status:"Disponível",turns:"Tarde, Noite",cost:"R$ 180/h",idle:65,monthly:300,used:105},
  {id:"MQ-002",name:"Centro Fresamento DMG Mori",type:"Fresamento",brand:"DMG Mori",model:"CMX 600",year:2019,status:"Parcial",turns:"Manhã",cost:"R$ 280/h",idle:30,monthly:300,used:210},
  {id:"MQ-003",name:"Injetora Arburg 250T",type:"Injeção",brand:"Arburg",model:"370S 700-170",year:2021,status:"Disponível",turns:"Manhã, Tarde, Noite",cost:"R$ 240/h",idle:50,monthly:500,used:250},
  {id:"MQ-004",name:"Corte Laser Trumpf 3kW",type:"Corte Laser",brand:"Trumpf",model:"TruLaser 1030",year:2022,status:"Ocupado",turns:"—",cost:"R$ 350/h",idle:5,monthly:280,used:266},
];
const ORDERS = [
  {id:"PD-4821",client:"Eletro Nordeste SA",product:"Suportes metálicos – 5k pçs",value:"R$ 25.200",status:"Em produção",pct:65,deadline:"20/05/2026"},
  {id:"PD-4818",client:"Construtora Rio Branco",product:"Flanges solda 800 pçs",value:"R$ 18.400",status:"Em inspeção",pct:90,deadline:"10/05/2026"},
  {id:"PD-4812",client:"Startup Industrial BR",product:"Carcaças PP – 2k pçs",value:"R$ 13.200",status:"Aguardando coleta",pct:100,deadline:"08/05/2026"},
  {id:"PD-4801",client:"Grupo Alimentos MG",product:"Eixos torneados – 3k pçs",value:"R$ 21.800",status:"Entregue",pct:100,deadline:"30/04/2026"},
];
const MESSAGES = [
  {id:1,from:"Eletro Nordeste SA",text:"Precisamos confirmar a tolerância dimensional. O projeto exige ±0,05mm.",time:"14:32",mine:false},
  {id:2,from:"MetalPrime Usinagem",text:"Confirmado. Nosso torno CNC opera com tolerância de ±0,03mm. Tenho laudo de calibração.",time:"14:45",mine:true},
  {id:3,from:"Eletro Nordeste SA",text:"Perfeito. Seria possível antecipar para 15/05?",time:"15:01",mine:false},
  {id:4,from:"MetalPrime Usinagem",text:"15/05 é viável com acréscimo de R$ 800 no setup para turno noturno.",time:"15:08",mine:true},
];
const CONTRATOS_RECORRENTES = [
  {id:"CR-021",demandante:"Eletro Nordeste SA",tipo:"Mensal fixo",processo:"Torneamento CNC",volume:"5.000 pçs/mês",valor:"R$ 24.500/mês",inicio:"01/03/2026",vigencia:"01/03/2027",sla:"98% entregas no prazo",status:"Ativo",renovacao:"Automática"},
  {id:"CR-018",demandante:"AutoPeças Brasil Ltda",tipo:"Capacidade reservada",processo:"Fresamento 5X",volume:"300h/mês",valor:"R$ 72.000/mês",inicio:"01/02/2026",vigencia:"01/08/2026",sla:"96% entregas no prazo",status:"Ativo",renovacao:"Manual"},
  {id:"CR-015",demandante:"Construtora Rio Branco",tipo:"Emergencial",processo:"Soldagem MIG/TIG",volume:"Sob demanda",valor:"R$ 320/h",inicio:"15/04/2026",vigencia:"15/07/2026",sla:"Resposta em 48h",status:"Pausado",renovacao:"Manual"},
];
const CONTRATOS_DIGITAIS = [
  {id:"CT-441",pedido:"PD-4821",demandante:"Eletro Nordeste SA",fornecedor:"MetalPrime Usinagem",valor:"R$ 25.200",prazo:"20/05/2026",status:"Assinado",gerado:"03/05/2026",assinado:"03/05/2026",escopo:"Torneamento CNC – 5.000 suportes metálicos Ø50mm aço SAE 1020"},
  {id:"CT-440",pedido:"PD-4818",demandante:"Construtora Rio Branco",fornecedor:"MetalPrime Usinagem",valor:"R$ 18.400",prazo:"10/05/2026",status:"Aguardando assinatura",gerado:"01/05/2026",assinado:null,escopo:"Soldagem MIG – 800 flanges estruturais"},
  {id:"CT-435",pedido:"PD-4812",demandante:"Startup Industrial BR",fornecedor:"Indfab Nordeste",valor:"R$ 13.200",prazo:"08/05/2026",status:"Cancelado",gerado:"28/04/2026",assinado:null,escopo:"Injeção Plástica – 2.000 carcaças PP"},
];
// DOCS_VERIFICACAO removed — data comes from /api/verification
const AUDIT_LOGS = [
  {id:1,evento:"Login realizado",usuario:"Carlos Silva",empresa:"MetalPrime Usinagem",ip:"189.45.123.88",data:"03/05/2026 14:31:02",tipo:"auth"},
  {id:2,evento:"Proposta enviada",usuario:"Carlos Silva",empresa:"MetalPrime Usinagem",ip:"189.45.123.88",data:"03/05/2026 14:35:18",tipo:"proposta",ref:"PR-901 → DM-4821"},
  {id:3,evento:"NDA assinado",usuario:"Ana Rodrigues",empresa:"Eletro Nordeste SA",ip:"200.16.88.42",data:"03/05/2026 13:20:04",tipo:"nda",ref:"DM-4819"},
  {id:4,evento:"Contrato gerado",usuario:"Sistema",empresa:"CapaCity",ip:"—",data:"03/05/2026 13:22:11",tipo:"contrato",ref:"CT-441"},
  {id:5,evento:"Contrato assinado",usuario:"Ana Rodrigues",empresa:"Eletro Nordeste SA",ip:"200.16.88.42",data:"03/05/2026 13:28:55",tipo:"contrato",ref:"CT-441"},
  {id:6,evento:"Demanda publicada",usuario:"Ana Rodrigues",empresa:"Eletro Nordeste SA",ip:"200.16.88.42",data:"02/05/2026 09:14:33",tipo:"demanda",ref:"DM-4821"},
  {id:7,evento:"Atualização de produção",usuario:"Carlos Silva",empresa:"MetalPrime Usinagem",ip:"189.45.123.88",data:"03/05/2026 08:45:00",tipo:"producao",ref:"PD-4821 – 65%"},
  {id:8,evento:"Disputa aberta",usuario:"Roberto Farias",empresa:"AutoPeças Brasil",ip:"187.88.44.21",data:"01/05/2026 11:02:18",tipo:"disputa",ref:"DP-039"},
  {id:9,evento:"Arquivo técnico acessado",usuario:"Carlos Silva",empresa:"MetalPrime Usinagem",ip:"189.45.123.88",data:"03/05/2026 14:36:02",tipo:"arquivo",ref:"DM-4821 – desenho_v2.PDF"},
  {id:10,evento:"Login falhou (3x)",usuario:"desconhecido",empresa:"—",ip:"45.230.11.99",data:"02/05/2026 22:14:55",tipo:"auth_fail"},
];
const NOTIFICACOES_DATA = {
  demandante:[
    {id:1,tipo:"proposta",icone:"📬",titulo:"Nova proposta recebida",desc:"MetalPrime Usinagem enviou proposta para DM-4821 · Score 91",tempo:"5 min",lida:false},
    {id:2,tipo:"proposta",icone:"📬",titulo:"Nova proposta recebida",desc:"Indfab Nordeste enviou proposta para DM-4821 · Score 87",tempo:"18 min",lida:false},
    {id:3,tipo:"producao",icone:"⚙️",titulo:"Produção atualizada",desc:"PD-4821 agora está 65% concluído · MetalPrime Usinagem",tempo:"1h",lida:false},
    {id:4,tipo:"nda",icone:"🔒",titulo:"NDA pendente de assinatura",desc:"Indfab Nordeste aguarda sua aprovação do NDA para DM-4819",tempo:"2h",lida:true},
    {id:5,tipo:"contrato",icone:"📄",titulo:"Contrato aguardando assinatura",desc:"CT-440 gerado para pedido PD-4818 com MetalPrime",tempo:"3h",lida:true},
  ],
  fornecedor:[
    {id:1,tipo:"demanda",icone:"🏭",titulo:"Nova demanda compatível",desc:"DM-4810 · Corte Laser 800 chapas Inox · Fortaleza/CE · R$ 8–14k",tempo:"10 min",lida:false},
    {id:2,tipo:"demanda",icone:"🏭",titulo:"Demanda urgente compatível",desc:"DM-4805 · Soldagem MIG 12 estruturas · Urgência: Baixa",tempo:"22 min",lida:false},
    {id:3,tipo:"contrato",icone:"📄",titulo:"Contrato gerado",desc:"CT-441 foi gerado para PD-4821 · Eletro Nordeste SA",tempo:"1h",lida:false},
    {id:4,tipo:"pagamento",icone:"💳",titulo:"Pagamento liberado",desc:"R$ 18.400 liberado para PD-4818 · Construtora Rio Branco",tempo:"4h",lida:true},
    {id:5,tipo:"avaliacao",icone:"⭐",titulo:"Nova avaliação recebida",desc:"Eletro Nordeste SA avaliou PD-4801 com 5 estrelas",tempo:"1 dia",lida:true},
  ],
  admin:[
    {id:1,tipo:"verificacao",icone:"🔍",titulo:"Empresa aguardando verificação",desc:"Precisão Tech SP enviou documentação · 2 pendentes",tempo:"30 min",lida:false},
    {id:2,tipo:"disputa",icone:"⚠️",titulo:"Nova disputa aberta",desc:"DP-039 · AutoPeças Brasil ↔ Indfab Nordeste · Impacto: Médio",tempo:"1h",lida:false},
    {id:3,tipo:"auth_fail",icone:"🚨",titulo:"Tentativas de login suspeitas",desc:"IP 45.230.11.99 tentou login 3x sem sucesso",tempo:"8h",lida:false},
    {id:4,tipo:"empresa",icone:"🏢",titulo:"Nova empresa cadastrada",desc:"Confecção Têxtil NE · Fortaleza/CE · Aguardando verificação",tempo:"1 dia",lida:true},
  ],
};
const STATUS_STEPS = ["Publicado","Em cotação","Contratado","Em setup","Em produção","Em inspeção","Aguardando coleta","Em transporte","Entregue","Finalizado"];
const STATUS_COLORS = {"Publicado":"#3B82F6","Em cotação":"var(--amber)","Em negociação":"var(--purple)","Contratado":"var(--green)","Em produção":"#22D3EE","Em inspeção":"var(--orange)","Aguardando coleta":"#E879F9","Em transporte":"#60A5FA","Entregue":"var(--green)","Finalizado":"var(--white3)","Cancelado":"var(--red)","Em disputa":"var(--red)","Ativo":"var(--green)","Pausado":"var(--orange)","Assinado":"var(--green)","Aguardando assinatura":"var(--amber)","Aprovado":"var(--green)","Em análise":"var(--amber)","Pendente":"var(--orange)","Reprovado":"var(--red)"};
const URG_COLORS = {"Baixa":"var(--white3)","Média":"#3B82F6","Alta":"var(--amber)","Crítica":"var(--red)"};
const RISK_COLORS = {"Baixo":"var(--green)","Médio":"var(--orange)","Alto":"var(--red)","Crítico":"var(--red)"};
const RISK_BG = {"Baixo":"rgba(34,197,94,.08)","Médio":"rgba(249,115,22,.08)","Alto":"rgba(239,68,68,.08)","Crítico":"rgba(239,68,68,.14)"};
const LOG_COLORS = {auth:"var(--blue)",proposta:"var(--amber)",nda:"var(--purple)",contrato:"var(--green)",demanda:"#22D3EE",producao:"var(--orange)",disputa:"var(--red)",arquivo:"var(--white2)",auth_fail:"var(--red)"};
Object.assign(STATUS_COLORS,{
  "Operacao ativa":"var(--green)",
  "Operação ativa":"var(--green)",
  "Em espera":"var(--amber)",
  "Renegociando":"var(--purple)",
  "Suspenso":"var(--orange)",
  "Bloqueado":"var(--red)",
  "Aprovado pelo setor":"var(--green)",
  "Aguardando aprovacao":"var(--amber)",
  "Resolvida":"var(--green)",
  "Liberado":"var(--green)",
  "Em revisao":"var(--amber)",
  "Em analise":"var(--amber)",
  "Emitida":"var(--green)",
  "Aguardando entrega":"var(--amber)",
  "Aguardando aprovação":"var(--amber)",
});
const SCORE_CRITERIA = [
  {label:"Processo compatível",peso:25,desc:"Máquinas e processo exatamente compatíveis com o requerido"},
  {label:"Capacidade disponível",peso:20,desc:"Horas-máquina livres suficientes para o volume da demanda"},
  {label:"Localização logística",peso:15,desc:"Proximidade ao destino de entrega e custo de frete"},
  {label:"Certificação",peso:15,desc:"ISO 9001, IATF, Anvisa ou outras certificações exigidas"},
  {label:"Avaliação histórica",peso:10,desc:"Nota média e taxa de entrega no prazo dos últimos pedidos"},
  {label:"Prazo",peso:10,desc:"Disponibilidade de calendário compatível com o deadline"},
  {label:"Preço médio",peso:5,desc:"Aderência ao orçamento estimado da demanda"},
];

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const Badge = ({label,color,bg})=>(
  <span style={{fontFamily:"var(--mono)",fontSize:"10px",fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:color||"var(--amber)",background:bg||"var(--amber-dim)",border:`1px solid ${color||"var(--amber)"}40`,padding:"3px 8px",display:"inline-block",whiteSpace:"nowrap"}}>{label}</span>
);
const Stat=({label,value,sub,icon:Icon,color="var(--amber)"})=>(
  <div style={{background:"var(--bg2)",border:"1px solid var(--border)",padding:"20px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
      <span style={{fontFamily:"var(--mono)",fontSize:"10px",letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)"}}>{label}</span>
      {Icon&&<Icon size={16} color={color} style={{opacity:.7}}/>}
    </div>
    <div style={{fontFamily:"var(--cond)",fontSize:"36px",fontWeight:800,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontFamily:"var(--mono)",fontSize:"10px",color:"var(--white3)",marginTop:6}}>{sub}</div>}
  </div>
);
const Btn=({children,variant="primary",onClick,small,full,icon:Icon,disabled})=>{
  const base={fontFamily:"var(--mono)",fontSize:small?"10px":"11px",fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",padding:small?"7px 14px":"11px 22px",border:"1px solid",cursor:disabled?"not-allowed":"pointer",transition:"all .2s",display:"inline-flex",alignItems:"center",gap:6,width:full?"100%":"auto",justifyContent:full?"center":"flex-start",opacity:disabled?.5:1};
  const styles={primary:{...base,background:"var(--amber)",borderColor:"var(--amber)",color:"var(--bg)"},ghost:{...base,background:"transparent",borderColor:"var(--border2)",color:"var(--white2)"},danger:{...base,background:"transparent",borderColor:"rgba(239,68,68,.4)",color:"var(--red)"},green:{...base,background:"rgba(34,197,94,.12)",borderColor:"rgba(34,197,94,.4)",color:"var(--green)"},purple:{...base,background:"rgba(168,85,247,.12)",borderColor:"rgba(168,85,247,.4)",color:"var(--purple)"}};
  return <button style={styles[variant]||styles.primary} onClick={!disabled?onClick:undefined}>{Icon&&<Icon size={13}/>}{children}</button>;
};
const Card=({children,style,...props})=>(
  <div {...props} style={{background:"var(--bg2)",border:"1px solid var(--border)",...style}}>{children}</div>
);
const FormField=({label,children,hint})=>(
  <div style={{marginBottom:16}}>
    <label style={{fontFamily:"var(--mono)",fontSize:"10px",letterSpacing:".12em",textTransform:"uppercase",color:"var(--white2)",display:"block",marginBottom:6}}>{label}</label>
    {children}
    {hint&&<div style={{fontFamily:"var(--mono)",fontSize:"9px",color:"var(--white3)",marginTop:4}}>{hint}</div>}
  </div>
);
const SectionTitle=({pre,main,accent})=>(
  <div style={{marginBottom:36}}>
    {pre&&<div style={{fontFamily:"var(--mono)",fontSize:"10px",letterSpacing:".2em",textTransform:"uppercase",color:"var(--amber)",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
      <span style={{width:20,height:1,background:"var(--amber)",display:"block"}}></span>{pre}
    </div>}
    <h2 style={{fontFamily:"var(--cond)",fontWeight:900,fontSize:"clamp(28px,4vw,56px)",lineHeight:.95,textTransform:"uppercase",letterSpacing:"-.01em"}}>
      {main} {accent&&<span style={{color:"var(--amber)"}}>{accent}</span>}
    </h2>
  </div>
);

// ─── MODAL BASE ───────────────────────────────────────────────────────────────
const Modal=({open,onClose,title,children,width=560})=>{
  if(!open) return null;
  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-box" style={{maxWidth:width}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>{title}</span>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--white3)",cursor:"pointer",display:"flex"}}><X size={18}/></button>
        </div>
        <div style={{padding:"24px"}}>{children}</div>
      </div>
    </div>
  );
};

// ─── SCORE MATCHING MODAL ─────────────────────────────────────────────────────
function ScoreModal({supplier,open,onClose}){
  if(!supplier) return null;
  const scores={"MetalPrime Usinagem":[25,20,13,15,9,10,4],"Indfab Nordeste":[25,17,14,15,8,7,5],"Precisão Tech SP":[22,15,8,15,10,10,5],"Usinagem Noroeste":[18,14,13,0,7,10,2]};
  const pts=scores[supplier.supplier]||[20,15,10,10,8,8,4];
  const total=pts.reduce((a,b)=>a+b,0);
  return(
    <Modal open={open} onClose={onClose} title={`Score de Matching · ${supplier.supplier}`} width={580}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{supplier.city} · {supplier.cert}</div>
          <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>Baseado em 7 critérios ponderados para demanda DM-4821</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:64,fontWeight:900,color:"var(--amber)",lineHeight:1}}>{total}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em"}}>/ 100 PONTOS</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {SCORE_CRITERIA.map((c,i)=>{
          const pt=pts[i]; const max=c.peso; const pct=Math.round((pt/max)*100);
          return(
            <div key={c.label}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div>
                  <span style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{c.label}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginLeft:8}}>peso {c.peso}%</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:800,color:pct>=80?"var(--green)":pct>=50?"var(--amber)":"var(--red)"}}>{pt}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>/{max}</span>
                </div>
              </div>
              <div className="score-bar"><div className="score-fill" style={{width:`${pct}%`,background:pct>=80?"var(--green)":pct>=50?"var(--amber)":"var(--red)"}}/></div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3}}>{c.desc}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── RISK DETAIL MODAL ────────────────────────────────────────────────────────
function RiskModal({proposal,open,onClose}){
  if(!proposal) return null;
  const c=RISK_COLORS[proposal.risk];
  return(
    <Modal open={open} onClose={onClose} title={`Análise de Risco · ${proposal.supplier}`}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,padding:"16px",background:RISK_BG[proposal.risk],border:`1px solid ${c}40`}}>
        <AlertTriangle size={24} color={c}/>
        <div>
          <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:800,textTransform:"uppercase",color:c}}>Risco {proposal.risk}</div>
          <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>{proposal.risk==="Baixo"?"Proposta segura para contratação direta.":proposal.risk==="Médio"?"Requer atenção. Monitore o andamento.":proposal.risk==="Alto"?"Exige validação adicional antes de contratar.":"Não recomendado sem auditoria prévia."}</div>
        </div>
      </div>
      {proposal.riskFactors?.length>0?(
        <div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:12}}>Fatores de risco identificados</div>
          {proposal.riskFactors.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid var(--border)",alignItems:"flex-start"}}>
              <AlertCircle size={14} color={c} style={{flexShrink:0,marginTop:2}}/>
              <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>{f}</span>
            </div>
          ))}
        </div>
      ):(
        <div style={{padding:"20px",textAlign:"center",color:"var(--green)"}}>
          <CheckCircle size={28} style={{margin:"0 auto 8px"}}/>
          <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase"}}>Nenhum fator de risco</div>
        </div>
      )}
      <div style={{marginTop:20,display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        {proposal.risk!=="Crítico"&&<Btn icon={Check} variant="green">Aceitar mesmo assim</Btn>}
      </div>
    </Modal>
  );
}

// ─── NDA MODAL ────────────────────────────────────────────────────────────────
function NDAModal({open,onClose,onSign,demand}){
  const [step,setStep]=useState(1);
  const [agreed,setAgreed]=useState(false);
  const ip="189.45.123.88"; const now="03/05/2026 14:32:18";
  return(
    <Modal open={open} onClose={onClose} title="Acordo de Confidencialidade — NDA" width={600}>
      {step===1&&(
        <>
          <div style={{display:"flex",gap:12,padding:"14px 16px",background:"rgba(168,85,247,.08)",border:"1px solid rgba(168,85,247,.3)",marginBottom:20}}>
            <Lock size={18} color="var(--purple)"/>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>Esta demanda contém <strong style={{color:"var(--white)"}}>arquivos confidenciais</strong>. Para acessá-los, é necessário assinar o NDA abaixo.</div>
          </div>
          <div style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:"20px",marginBottom:16,maxHeight:240,overflowY:"auto"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:12}}>Acordo de Não Divulgação</div>
            <p style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.65,marginBottom:10}}>A empresa signatária ("Receptora") compromete-se a manter em estrito sigilo todas as informações técnicas, comerciais, industriais e quaisquer outros dados fornecidos pela empresa demandante ("Divulgante") por meio desta plataforma, referentes à demanda <strong style={{color:"var(--amber)"}}>{demand?.id||"DM-4819"}</strong>.</p>
            <p style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.65,marginBottom:10}}>Fica expressamente proibida a divulgação, reprodução, transferência ou uso das informações para fins distintos do processo de cotação e produção aqui descrito, sob pena de responsabilidade civil e criminal nos termos da Lei 9.279/1996 e LGPD.</p>
            <p style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.65}}>Vigência: 24 meses a partir da assinatura. Documentos baixados receberão marca d'água com identificação da empresa e IP de acesso.</p>
          </div>
          <label style={{display:"flex",gap:10,cursor:"pointer",marginBottom:20}}>
            <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{width:"auto",marginTop:2,accentColor:"var(--purple)"}}/>
            <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>Li e concordo integralmente com os termos do Acordo de Não Divulgação acima.</span>
          </label>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn icon={FileSignature} variant="purple" onClick={()=>setStep(2)} disabled={!agreed}>Assinar NDA</Btn>
          </div>
        </>
      )}
      {step===2&&(
        <>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{width:60,height:60,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <CheckCircle size={28} color="var(--green)"/>
            </div>
            <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:800,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>NDA Assinado com sucesso</div>
          </div>
          <div style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:16,marginBottom:16}}>
            {[["Empresa signatária","MetalPrime Usinagem"],["IP registrado",ip],["Data e hora",now],["Hash SHA256","a3f9d...bc12e"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white)"}}>{v}</span>
              </div>
            ))}
          </div>
          <Btn full icon={Unlock} onClick={()=>{onSign&&onSign();toast.success("NDA assinado! Arquivos liberados.");onClose();setStep(1);setAgreed(false);}}>Acessar arquivos liberados</Btn>
        </>
      )}
    </Modal>
  );
}

// ─── LAUDO DE INSPEÇÃO MODAL ──────────────────────────────────────────────────
function LaudoModal({open,onClose,checklist,lotInfo}){
  if(!open) return null;
  const aprovadas=checklist?.filter(c=>c.done).length||0;
  const total=checklist?.length||0;
  const pctOk=total>0?Math.round(aprovadas/total*100):0;
  const now=new Date().toLocaleString("pt-BR");
  const laudoId=`LI-${Math.floor(1000+Math.random()*9000)}`;
  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-box" style={{maxWidth:660}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Laudo de Inspeção · {laudoId}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn small variant="ghost" icon={Printer} onClick={()=>toast.info("Impressão iniciada.")}>Imprimir</Btn>
            <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--white3)",cursor:"pointer",display:"flex"}}><X size={18}/></button>
          </div>
        </div>
        <div style={{padding:"24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"16px",background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>LAUDO DE INSPEÇÃO DE QUALIDADE</div>
              <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,textTransform:"uppercase"}}>PD-4821 · Lote 1 de 5</div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:4}}>MetalPrime Usinagem · {now}</div>
            </div>
            <Badge label={pctOk>=80?"APROVADO":"REPROVADO"} color={pctOk>=80?"var(--green)":"var(--red)"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[["Lote","1 de 5"],["Qtd. inspecionada","3.250 peças"],["Qtd. aprovada","3.242 peças"],["Qtd. rejeitada","8 peças"],["% Aprovação","99,75%"],["Critério AQL","2,5 – Normal"],["Instrumento","Paquímetro 0,01mm"],["Inspetor","Carlos Silva"]].map(([k,v])=>(
              <div key={k} style={{background:"var(--bg3)",padding:"10px 14px"}}>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Resultado por item inspecionado</div>
            {checklist?.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                <div style={{width:14,height:14,borderRadius:"50%",background:c.done?"var(--green)":"var(--orange)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {c.done?<Check size={8} color="var(--bg)"/>:<X size={8} color="var(--bg)"/>}
                </div>
                <span style={{flex:1,fontFamily:"var(--body)",fontSize:12,color:c.done?"var(--white)":"var(--white3)"}}>{c.item}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{c.done?c.obs||"OK":"Pendente"}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"12px 16px",background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.2)",marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>CONCLUSÃO</div>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.6}}>
              Lote inspecionado conforme procedimento QP-001. Aprovação de 3.242 peças (99,75%). 8 peças reprovadas por desvio dimensional (Ø fora de ±0,05mm). Lote liberado para expedição parcial. NC-001 aberta para reprocessamento das peças reprovadas.
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["Responsável pela inspeção","Carlos Silva – MetalPrime"],["Aprovado por","Ana Rodrigues – Eletro Nordeste SA"]].map(([k,v])=>(
              <div key={k} style={{border:"1px dashed var(--border2)",padding:"14px",textAlign:"center"}}>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{k}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>{v}</div>
                <div style={{borderTop:"1px solid var(--border)",paddingTop:8,fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>Assinatura digital: {laudoId}-{k.charAt(0)}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
            <Btn icon={Download} onClick={()=>{ exportCSV([{Laudo:laudoId,Pedido:"PD-4821",Lote:"1/5",Aprovadas:"3.242",Reprovadas:"8",Pct:"99,75%",Resultado:"APROVADO",Data:now}],"laudo_"+laudoId); toast.success("Laudo exportado com sucesso."); }}>Exportar PDF/CSV</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NC MODAL ─────────────────────────────────────────────────────────────────
function NCModal({open,onClose,onSave}){
  const [form,setForm]=useState({tipo:"Dimensional",desc:"",acao:"",prazo:"",resp:"",gravidade:"Média"});
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  return(
    <Modal open={open} onClose={onClose} title="Abrir Não Conformidade" width={540}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FormField label="Tipo de NC">
          <select value={form.tipo} onChange={up("tipo")}>{["Dimensional","Visual","Material","Funcional","Documentação","Processo"].map(t=><option key={t}>{t}</option>)}</select>
        </FormField>
        <FormField label="Gravidade">
          <select value={form.gravidade} onChange={up("gravidade")}>{["Crítica","Alta","Média","Baixa"].map(g=><option key={g}>{g}</option>)}</select>
        </FormField>
      </div>
      <FormField label="Descrição do desvio (obrigatório)">
        <textarea value={form.desc} onChange={up("desc")} rows={3} placeholder="Descreva o desvio encontrado, medições e quantidade afetada..."/>
      </FormField>
      <FormField label="Ação corretiva proposta">
        <textarea value={form.acao} onChange={up("acao")} rows={2} placeholder="Descreva a ação corretiva ou preventiva..."/>
      </FormField>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FormField label="Prazo para resolução"><input type="date" value={form.prazo} onChange={up("prazo")}/></FormField>
        <FormField label="Responsável pela resolução"><input value={form.resp} onChange={up("resp")} placeholder="Nome do responsável"/></FormField>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" icon={AlertCircle} onClick={()=>{
          if(!form.desc.trim()){toast.error("Descreva o desvio.");return;}
          onSave&&onSave({...form,id:`NC-${Math.floor(Math.random()*900+100)}`,status:"Em tratamento",aberta:new Date().toLocaleDateString("pt-BR")});
          toast.success("NC registrada com sucesso!");
          onClose();
        }}>Registrar NC</Btn>
      </div>
    </Modal>
  );
}

// ─── DOCUMENT VIEWER MODAL ────────────────────────────────────────────────────
function DocViewerModal({open,onClose,doc}){
  if(!doc||!open) return null;
  return(
    <Modal open={open} onClose={onClose} title={`Visualizar · ${doc.nome}`} width={620}>
      <div style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:"16px",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
        <FileText size={24} color="var(--amber)"/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase"}}>{doc.arquivo||doc.nome}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3}}>Enviado em {doc.enviado||"—"}</div>
        </div>
        <Badge label={doc.status} color={STATUS_COLORS[doc.status]||"var(--amber)"}/>
      </div>
      <div style={{background:"var(--bg3)",border:"1px solid var(--border)",minHeight:300,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,marginBottom:16}}>
        <div style={{width:80,height:100,background:"var(--bg4)",border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
          <FileText size={28} color="var(--white3)"/>
          <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>PDF</div>
        </div>
        <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:600,textTransform:"uppercase",color:"var(--white2)"}}>{doc.nome}</div>
        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>Visualização protegida · Marca d'água aplicada</div>
      </div>
      {doc.obrigatorio!==undefined&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[["Tipo",doc.obrigatorio?"Obrigatório":"Opcional"],["Status",doc.status],["Arquivo",doc.arquivo||"—"],["Enviado em",doc.enviado||"—"]].map(([k,v])=>(
            <div key={k} style={{padding:"8px 12px",background:"var(--bg3)"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
              <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        <Btn icon={Download} onClick={()=>toast.success(`Download de ${doc.arquivo||doc.nome} iniciado.`)}>Baixar documento</Btn>
      </div>
    </Modal>
  );
}

// ─── CONTRATO VIEWER MODAL ────────────────────────────────────────────────────
function ContratoViewerModal({open,onClose,contrato,onSign,user}){
  if(!contrato||!open) return null;
  const clausulas=[
    "Objeto: Execução do serviço industrial descrito no escopo técnico, conforme especificações acordadas.",
    "Prazo: A entrega deverá ocorrer até a data definida neste instrumento, salvo caso fortuito ou força maior.",
    "Valor: O pagamento será realizado conforme condições acordadas, com retenção em escrow até aprovação da entrega.",
    "Qualidade: O fornecedor garante conformidade com as especificações técnicas e laudos de inspeção.",
    "Confidencialidade: As partes se comprometem a manter sigilo sobre informações trocadas neste processo.",
    "Penalidades: O atraso injustificado implica multa de 0,5% do valor total por dia de atraso.",
    "Rescisão: Qualquer parte pode rescindir mediante notificação de 15 dias, com quitação proporcional.",
  ];
  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-box" style={{maxWidth:680}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase"}}>Contrato Digital · {contrato.id}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn small variant="ghost" icon={Printer} onClick={()=>toast.info("Impressão iniciada.")}>Imprimir</Btn>
            <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer"}}><X size={18} color="var(--white3)"/></button>
          </div>
        </div>
        <div style={{padding:"24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,padding:"16px",background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS INDUSTRIAIS</div>
              <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:800,textTransform:"uppercase"}}>{contrato.demandante} ↔ {contrato.fornecedor}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:4}}>{contrato.pedido} · Gerado em {contrato.gerado}</div>
            </div>
            <Badge label={contrato.status} color={STATUS_COLORS[contrato.status]||"var(--amber)"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[["Contratante",contrato.demandante],["Contratado",contrato.fornecedor],["Valor",contrato.valor],["Prazo de entrega",contrato.prazo],["Pedido",contrato.pedido],["Status",contrato.status]].map(([k,v])=>(
              <div key={k} style={{padding:"10px 14px",background:"var(--bg3)"}}>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700}}>{v||"—"}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"14px 16px",background:"var(--bg3)",border:"1px solid var(--border)",marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>ESCOPO TÉCNICO</div>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.6}}>{contrato.escopo}</div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>CLÁUSULAS CONTRATUAIS</div>
            {clausulas.map((cl,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",flexShrink:0,width:20}}>§{i+1}</span>
                <span style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",lineHeight:1.5}}>{cl}</span>
              </div>
            ))}
          </div>
          {contrato.assinado&&(
            <div style={{padding:"12px 16px",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
              <CheckCircle size={16} color="var(--green)"/>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--green)"}}>Assinado digitalmente em {contrato.assinado} · IP (simulado)</div>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
            <Btn icon={Download} variant="ghost" onClick={()=>window.open(`/api/contracts/${contrato.id}/pdf`,"_blank")}>Baixar PDF</Btn>
            {contrato.status==="Aguardando assinatura"&&onSign&&(
              <Btn icon={Fingerprint} onClick={()=>{onSign(contrato.id,user);toast.success(`Contrato ${contrato.id} assinado!`);onClose();}}>Assinar Contrato</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROPOSTA DETAIL MODAL (para chat) ───────────────────────────────────────
function PropostaDetailModal({open,onClose,demandId,proposals}){
  if(!open) return null;
  const props=proposals?.slice(0,4)||[];
  return(
    <Modal open={open} onClose={onClose} title={`Propostas Recebidas · ${demandId||"DM-4821"}`} width={640}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {props.map((p,i)=>(
          <div key={p.id||i} style={{padding:"14px 18px",background:"var(--bg3)",border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div>
                <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>{p.supplier}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:2}}>{p.city||"—"} · Score {p.score||"—"} · {p.cert||"—"}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:800,color:"var(--amber)"}}>{p.total}</div>
                <Badge label={p.risk||"—"} color={RISK_COLORS[p.risk]||"var(--white3)"}/>
              </div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {[["Prazo",`${p.days}d`],["Início",p.start||"—"],["Frete",p.frete||"—"],["Pagamento",p.payment||"—"]].map(([k,v])=>(
                <span key={k} style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}><span style={{color:"var(--white2)"}}>{k}:</span> {v}</span>
              ))}
            </div>
            {p.obs&&<div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",marginTop:6,borderTop:"1px solid var(--border)",paddingTop:6}}>{p.obs}</div>}
          </div>
        ))}
      </div>
      <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
      </div>
    </Modal>
  );
}

// ─── NOTIFICAÇÃO PANEL ────────────────────────────────────────────────────────
function NotificacaoPanel({open,onClose,userType,notifs=[],setNotifs}){
  const unread=notifs.filter(n=>!n.lida).length;
  const markAll=()=>setNotifs(notifs.map(x=>({...x,lida:true})));
  const mark=(id)=>setNotifs(notifs.map(x=>x.id===id?{...x,lida:true}:x));
  const tipoCor={proposta:"var(--amber)",demanda:"#22D3EE",producao:"var(--orange)",nda:"var(--purple)",contrato:"var(--green)",pagamento:"var(--green)",avaliacao:"var(--amber)",verificacao:"var(--blue)",disputa:"var(--red)",auth_fail:"var(--red)"};
  return(
    <div className={`notif-panel${open?" open":""}`}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Notificações</div>
          {unread>0&&<div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",letterSpacing:".06em",marginTop:2}}>{unread} não lidas</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {unread>0&&<button onClick={markAll} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",background:"transparent",border:"none",color:"var(--amber)",cursor:"pointer"}}>Marcar todas</button>}
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex"}}><X size={16} color="var(--white3)"/></button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {notifs.map(n=>(
          <div key={n.id} onClick={()=>mark(n.id)} style={{padding:"14px 20px",borderBottom:"1px solid var(--border)",cursor:"pointer",background:n.lida?"transparent":"rgba(232,160,32,.03)",borderLeft:n.lida?"2px solid transparent":`2px solid ${tipoCor[n.tipo]||"var(--amber)"}`}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(232,160,32,.05)"}
            onMouseLeave={e=>e.currentTarget.style.background=n.lida?"transparent":"rgba(232,160,32,.03)"}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0}}>{n.icone}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:n.lida?600:700,textTransform:"uppercase",letterSpacing:".03em",color:n.lida?"var(--white2)":"var(--white)"}}>{n.titulo}</span>
                  {!n.lida&&<span style={{width:7,height:7,borderRadius:"50%",background:tipoCor[n.tipo]||"var(--amber)",display:"block",flexShrink:0,marginTop:4}}/>}
                </div>
                <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white3)",lineHeight:1.5,marginTop:3}}>{n.desc}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:4,letterSpacing:".06em"}}>{n.tempo} atrás</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({onLogin,onRegister}){
  const [faqOpen,setFaqOpen]=useState(null);
  const faqs=[
    {q:"Como a plataforma seleciona fornecedores?",a:"O sistema calcula automaticamente um score de 0 a 100 baseado em 7 critérios ponderados: processo compatível (25%), capacidade disponível (20%), localização (15%), certificação (15%), avaliação histórica (10%), prazo (10%) e preço médio (5%)."},
    {q:"Como funciona a verificação das empresas?",a:"Toda empresa enviará contrato social, alvará, comprovante de CNPJ e certificações. Um administrador valida manualmente cada documento antes de ativar o perfil, com selo de empresa verificada no perfil público."},
    {q:"É possível exigir NDA antes do fornecedor ver os arquivos?",a:"Sim. O demandante ativa o NDA na criação da demanda. Os arquivos ficam bloqueados até o fornecedor assinar eletronicamente. O sistema registra IP, data/hora e aplica marca d'água nos downloads."},
    {q:"Como funciona o pagamento protegido?",a:"O valor fica retido em escrow na plataforma. O fornecedor produz e entrega. Após aprovação do pedido pelo demandante, a plataforma libera o valor e retém a comissão."},
    {q:"Posso publicar demanda recorrente?",a:"Sim. O módulo de Contratos Recorrentes permite criar contratos mensais, por volume, capacidade reservada ou emergencial, com SLA, renovação automática e histórico de volumes."},
    {q:"Como funciona o score de risco?",a:"Cada proposta recebe uma classificação (Baixo/Médio/Alto/Crítico) com justificativas explícitas, como fornecedor novo, prazo agressivo, preço abaixo da média, distância logística alta ou ausência de certificação."},
  ];
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <div className="grid-overlay"/>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:60,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 5%",background:"rgba(7,7,8,.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)"}}>
        <span style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:800,letterSpacing:".06em"}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</span>
        <div style={{display:"flex",gap:28}}>
          {[["Como funciona","#como-funciona"],["Segmentos","#segmentos"],["Preços","#precos"],["FAQ","#faq"]].map(([l,href])=>(
            <a key={l} href={href} style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white2)",cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.preventDefault();document.querySelector(href)?.scrollIntoView({behavior:"smooth"});}}>{l}</a>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="ghost" small onClick={onLogin}>Entrar</Btn>
          <Btn small onClick={onRegister||onLogin}>Cadastrar</Btn>
        </div>
      </nav>
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"100px 5% 60px",position:"relative",zIndex:1}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"var(--mono)",fontSize:10,letterSpacing:".18em",textTransform:"uppercase",color:"var(--amber)",border:"1px solid rgba(232,160,32,.3)",padding:"5px 12px",marginBottom:28,width:"fit-content"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--amber)",display:"block"}} className="pulse"/> Marketplace Industrial B2B — Acesso Antecipado
        </div>
        <h1 style={{fontFamily:"var(--cond)",fontWeight:900,fontSize:"clamp(64px,10vw,136px)",lineHeight:.9,textTransform:"uppercase",marginBottom:24}}>
          MANUFATURA<br/><span style={{WebkitTextStroke:"1px var(--white)",color:"transparent"}}>DISTRIBUÍDA</span><br/><span style={{color:"var(--amber)"}}>POR DEMANDA</span>
        </h1>
        <p style={{fontFamily:"var(--body)",fontSize:17,fontWeight:300,color:"var(--white2)",maxWidth:520,lineHeight:1.65,marginBottom:36}}>
          Conectamos fábricas com capacidade ociosa a empresas com pico de demanda. O <strong style={{color:"var(--white)"}}>Airbnb industrial</strong> com matching inteligente, NDA digital e pagamento protegido.
        </p>
        <div style={{display:"flex",gap:12,marginBottom:56,flexWrap:"wrap"}}>
          <button onClick={onRegister||onLogin} style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:500,letterSpacing:".12em",textTransform:"uppercase",background:"var(--amber)",color:"var(--bg)",border:"1px solid var(--amber)",padding:"16px 36px",cursor:"pointer"}}>Tenho demanda produtiva →</button>
          <button onClick={onRegister||onLogin} style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:500,letterSpacing:".12em",textTransform:"uppercase",background:"transparent",color:"var(--white2)",border:"1px solid rgba(255,255,255,.15)",padding:"16px 36px",cursor:"pointer"}}>Tenho capacidade ociosa</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",border:"1px solid var(--border)",maxWidth:720}}>
          {[["2.400+","Fábricas verificadas"],["R$780M","Capacidade negociada"],["98%","Entregas no prazo"],["34h","Tempo p/ proposta"]].map(([v,l])=>(
            <div key={l} style={{padding:"20px 24px",background:"var(--bg2)",borderRight:"1px solid var(--border)"}}>
              <div style={{fontFamily:"var(--cond)",fontSize:36,fontWeight:800,color:"var(--amber)",lineHeight:1,marginBottom:4}}>{v}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="ticker-wrap">
        <div className="ticker">
          {[...["Usinagem CNC","Injeção Plástica","Corte a Laser","Soldagem MIG","Estamparia","Impressão 3D","Tratamento Térmico","Caldeiraria","Confecção","Fundição","Montagem Eletromec.","Pintura Industrial","NDA Digital","Matching Inteligente","Pagamento Protegido","Contrato Digital"],...["Usinagem CNC","Injeção Plástica","Corte a Laser","Soldagem MIG","Estamparia","Impressão 3D","Tratamento Térmico","Caldeiraria","Confecção","Fundição","Montagem Eletromec.","Pintura Industrial","NDA Digital","Matching Inteligente","Pagamento Protegido","Contrato Digital"]].map((s,i)=>(
            <div className="ticker-item" key={i}>{s}</div>
          ))}
        </div>
      </div>
      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" style={{padding:"80px 5%",position:"relative",zIndex:1,borderTop:"1px solid var(--border)"}}>
        <SectionTitle pre="Processo" main="COMO" accent="FUNCIONA"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,border:"1px solid var(--border)",maxWidth:960}}>
          {[
            {n:"01",icon:"📋",t:"Publique sua demanda",d:"Descreva o processo, quantidade, material e prazo. Ative NDA se necessário. Em menos de 2 minutos."},
            {n:"02",icon:"⚡",t:"Receba propostas",d:"O algoritmo notifica fábricas compatíveis. Propostas chegam em até 34h com score automático de 0–100."},
            {n:"03",icon:"📊",t:"Compare e escolha",d:"Compare preço, prazo, score de risco e avaliações históricas lado a lado. Aceite com um clique."},
            {n:"04",icon:"🏭",t:"Produza com segurança",d:"Contrato digital, NDA assinado e pagamento em escrow. Acompanhe a produção em tempo real."},
          ].map((step,i)=>(
            <div key={step.n} style={{padding:"32px 28px",borderRight:i<3?"1px solid var(--border)":"none",background:"var(--bg2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontFamily:"var(--cond)",fontSize:36,fontWeight:900,color:"var(--amber)",lineHeight:1}}>{step.n}</span>
                <span style={{fontSize:22}}>{step.icon}</span>
              </div>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:".03em",marginBottom:10}}>{step.t}</div>
              <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.65}}>{step.d}</div>
            </div>
          ))}
        </div>
      </section>
      {/* ── SEGMENTOS ── */}
      <section id="segmentos" style={{padding:"80px 5%",position:"relative",zIndex:1,borderTop:"1px solid var(--border)"}}>
        <SectionTitle pre="Mercado" main="SEGMENTOS" accent="INDUSTRIAIS"/>
        <div className="seg-grid">
          {[
            {icon:"⚙️",t:"Usinagem CNC",d:"Torneamento, fresamento, furação, roscamento e acabamento de precisão."},
            {icon:"💉",t:"Injeção Plástica",d:"Moldagem por injeção, extrusão, sopro e termoformagem de termoplásticos."},
            {icon:"👕",t:"Confecção Têxtil",d:"Corte e costura, bordado, estamparia e acabamento para moda e uniformes."},
            {icon:"🔥",t:"Caldeiraria",d:"Fabricação de vasos de pressão, trocadores de calor, tanques e estruturas."},
            {icon:"⚡",t:"Montagem Eletrônica",d:"PCB, SMD, solda seletiva, chicotes elétricos e montagem de painéis."},
            {icon:"🌡️",t:"Tratamento Térmico",d:"Têmpera, revenimento, cementação, nitretação e tratamentos de superfície."},
            {icon:"🏗️",t:"Fundição",d:"Fundição em areia, cera perdida, gravitacional e sob pressão em metais ferrosos."},
            {icon:"🖨️",t:"Impressão 3D",d:"FDM, SLA, SLS e DMLS para prototipagem rápida e produção de pequenos volumes."},
          ].map(s=>(
            <div key={s.t} style={{padding:"24px",background:"var(--bg2)",border:"1px solid var(--border)",transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(232,160,32,.4)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{fontSize:32,marginBottom:12}}>{s.icon}</div>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",letterSpacing:".03em",marginBottom:8}}>{s.t}</div>
              <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",lineHeight:1.6}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>
      {/* ── PREÇOS ── */}
      <section id="precos" style={{padding:"80px 5%",position:"relative",zIndex:1,borderTop:"1px solid var(--border)"}}>
        <SectionTitle pre="Planos" main="PREÇOS" accent="TRANSPARENTES"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,border:"1px solid var(--border)",maxWidth:840}}>
          {[
            {t:"Starter",price:"Grátis",sub:"Para começar a explorar",features:["Até 5 demandas/mês","Score básico de fornecedores","Chat com fornecedores","Suporte por e-mail"],cta:"Começar grátis",highlight:false},
            {t:"Growth",price:"R$499",sub:"/mês · sem taxa de setup",features:["Demandas ilimitadas","Score avançado + análise de risco","NDA digital integrado","Contratos digitais","Pagamento em escrow","Suporte prioritário"],cta:"Assinar Growth",highlight:true},
            {t:"Enterprise",price:"Sob consulta",sub:"Para grandes volumes",features:["Tudo do Growth","API de integração","SLA personalizado","Gerente de conta dedicado","Relatórios avançados","White-label disponível"],cta:"Falar com vendas",highlight:false},
          ].map((plan,i)=>(
            <div key={plan.t} style={{padding:"36px 28px",borderRight:i<2?"1px solid var(--border)":"none",background:plan.highlight?"var(--amber-dim2)":"var(--bg2)",position:"relative"}}>
              {plan.highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"var(--amber)"}}/>}
              {plan.highlight&&<div style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".15em",textTransform:"uppercase",color:"var(--amber)",marginBottom:12,border:"1px solid rgba(232,160,32,.3)",display:"inline-block",padding:"3px 8px"}}>Mais popular</div>}
              <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:800,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>{plan.t}</div>
              <div style={{fontFamily:"var(--cond)",fontSize:36,fontWeight:900,color:plan.highlight?"var(--amber)":"var(--white)",lineHeight:1,marginBottom:4}}>{plan.price}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginBottom:24}}>{plan.sub}</div>
              {plan.features.map(f=>(
                <div key={f} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}>
                  <span style={{color:"var(--green)",flexShrink:0,marginTop:1}}>✓</span>
                  <span style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)"}}>{f}</span>
                </div>
              ))}
              <button onClick={onRegister||onLogin} style={{marginTop:20,width:"100%",fontFamily:"var(--mono)",fontSize:11,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",background:plan.highlight?"var(--amber)":"transparent",color:plan.highlight?"var(--bg)":"var(--white2)",border:`1px solid ${plan.highlight?"var(--amber)":"var(--border2)"}`,padding:"13px 0",cursor:"pointer"}}>{plan.cta} →</button>
            </div>
          ))}
        </div>
      </section>
      {/* ── FAQ ── */}
      <section id="faq" style={{padding:"60px 5%",position:"relative",zIndex:1}}>
        <SectionTitle pre="FAQ" main="PERGUNTAS" accent="FREQUENTES"/>
        <div style={{maxWidth:780}}>
          {faqs.map((f,i)=>(
            <div key={i} style={{borderBottom:"1px solid var(--border)"}}>
              <button onClick={()=>setFaqOpen(faqOpen===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 0",background:"transparent",border:"none",color:"var(--white)",textAlign:"left",cursor:"pointer"}}>
                <span style={{fontFamily:"var(--cond)",fontSize:17,fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{f.q}</span>
                <ChevronDown size={15} color="var(--amber)" style={{transform:faqOpen===i?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
              </button>
              {faqOpen===i&&<div style={{fontFamily:"var(--body)",fontSize:14,fontWeight:300,color:"var(--white2)",lineHeight:1.65,paddingBottom:18}}>{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
      <footer style={{padding:"40px 5% 24px",borderTop:"1px solid var(--border)",position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:24,fontWeight:800}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>© 2026 · CAPACITY SISTEMAS LTDA · Feito no Nordeste 🇧🇷</div>
        </div>
      </footer>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({onBack,onRegister,onForgot}){
  const {login,loginErr,loginLoading}=useAuth();
  const [type,setType]=useState("demandante");
  const [email,setEmail]=useState("joao@metalparts.com.br");
  const [pass,setPass]=useState("demo123");
  const [totp,setTotp]=useState("");
  const [needTotp,setNeedTotp]=useState(false);
  const [validErr,setValidErr]=useState("");
  const DEMO={demandante:"joao@metalparts.com.br",fornecedor:"pedro@metalprime.com.br",admin:"admin@capacity.com.br"};
  const DEMOPASS={demandante:"demo123",fornecedor:"demo123",admin:"admin123"};
  const handleTypeChange=(t)=>{setType(t);setEmail(DEMO[t]);setPass(DEMOPASS[t]);setTotp("");setNeedTotp(false);setValidErr("");};
  const handleLogin=async()=>{
    if(!email){setValidErr("Informe o e-mail.");return;}
    if(!pass){setValidErr("Informe a senha.");return;}
    const result=await login(email,pass,type,totp);
    if(result==="totp_required") setNeedTotp(true);
  };
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <div className="grid-overlay"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:440,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"var(--cond)",fontSize:32,fontWeight:800,letterSpacing:".06em",marginBottom:6}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".15em",textTransform:"uppercase"}}>Marketplace Industrial B2B</div>
        </div>
        <Card style={{padding:36}}>
          <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Acessar plataforma</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",marginBottom:16}}>Credenciais de demonstração</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:20}}>
            {[["demandante","🏭","Demandante"],["fornecedor","⚙️","Fornecedor"],["admin","🛡️","Admin"]].map(([v,ic,l])=>(
              <button key={v} onClick={()=>handleTypeChange(v)} style={{padding:"12px 6px",border:"1px solid",background:type===v?"var(--amber-dim2)":"transparent",borderColor:type===v?"rgba(232,160,32,.5)":"var(--border)",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:4}}>{ic}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:type===v?"var(--amber)":"var(--white3)"}}>{l}</div>
              </button>
            ))}
          </div>
          <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",padding:"10px 14px",marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--green)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>Credenciais demo preenchidas</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{DEMO[type]} / {DEMOPASS[type]}</div>
          </div>
          <FormField label="E-mail"><input aria-label="E-mail" value={email} onChange={e=>setEmail(e.target.value)} type="email"/></FormField>
          <FormField label="Senha"><input aria-label="Senha" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} type="password"/></FormField>
          {needTotp&&<FormField label="Código 2FA"><input value={totp} onChange={e=>setTotp(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} inputMode="numeric" placeholder="000000"/></FormField>}
          {(loginErr||validErr)&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",padding:"10px 14px",marginBottom:12,fontFamily:"var(--mono)",fontSize:10,color:"var(--red)"}}>{loginErr||validErr}</div>}
          <button onClick={handleLogin} disabled={loginLoading} style={{width:"100%",fontFamily:"var(--mono)",fontSize:12,fontWeight:500,letterSpacing:".12em",textTransform:"uppercase",background:loginLoading?"var(--bg4)":"var(--amber)",color:"var(--bg)",border:"1px solid var(--amber)",padding:"14px",cursor:loginLoading?"wait":"pointer",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loginLoading?<><span className="pulse">⚙</span> Verificando...</>:"Entrar na plataforma →"}
          </button>
          {onRegister&&<div style={{textAlign:"center",marginTop:14,fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".05em"}}>Não tem conta? <button onClick={onRegister} style={{background:"transparent",border:"none",color:"var(--amber)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".05em",cursor:"pointer",padding:0,textDecoration:"underline"}}>Cadastre-se</button></div>}
          {onForgot&&<div style={{textAlign:"center",marginTop:10}}><button onClick={onForgot} style={{background:"transparent",border:"none",color:"var(--white3)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".05em",cursor:"pointer",padding:0,textDecoration:"underline"}}>Esqueci minha senha</button></div>}
          {onBack&&<button onClick={onBack} style={{width:"100%",background:"transparent",border:"none",color:"var(--white3)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginTop:14,cursor:"pointer"}}>← Voltar para a landing</button>}
        </Card>
      </div>
    </div>
  );
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
function RegisterPage({onBack,onLogin}){
  const {register,loginErr,loginLoading}=useAuth();
  const [form,setForm]=useState({
    name:"",email:"",password:"",role:"demandante",
    cnpj:"",companyName:"",city:""
  });
  const [validErr,setValidErr]=useState("");
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handleRegister=async()=>{
    setValidErr("");
    if(!form.name.trim()){setValidErr("Informe seu nome.");return;}
    if(!form.email.trim()){setValidErr("Informe o e-mail.");return;}
    if(form.password.length<8){setValidErr("Senha deve ter ao menos 8 caracteres.");return;}
    if(!form.cnpj.trim()){setValidErr("Informe o CNPJ.");return;}
    if(!form.companyName.trim()){setValidErr("Informe o nome da empresa.");return;}
    await register(form);
  };
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",padding:"40px 0"}}>
      <div className="grid-overlay"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:480,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:32,fontWeight:800,letterSpacing:".06em",marginBottom:6}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".15em",textTransform:"uppercase"}}>Marketplace Industrial B2B</div>
        </div>
        <Card style={{padding:32}}>
          <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Criar conta</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",marginBottom:18}}>Cadastre sua empresa para começar</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:18}}>
            {[["demandante","🏭","Demandante","Quero comprar capacidade"],["fornecedor","⚙️","Fornecedor","Tenho capacidade ociosa"]].map(([v,ic,l,d])=>(
              <button key={v} onClick={()=>upd("role",v)} style={{padding:"12px 8px",border:"1px solid",background:form.role===v?"var(--amber-dim2)":"transparent",borderColor:form.role===v?"rgba(232,160,32,.5)":"var(--border)",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:3}}>{ic}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:form.role===v?"var(--amber)":"var(--white3)"}}>{l}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:2}}>{d}</div>
              </button>
            ))}
          </div>
          <FormField label="Seu nome"><input value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="João Silva"/></FormField>
          <FormField label="E-mail"><input value={form.email} onChange={e=>upd("email",e.target.value)} type="email" placeholder="seu@email.com"/></FormField>
          <FormField label="Senha (mín 8 caracteres)"><input value={form.password} onChange={e=>upd("password",e.target.value)} type="password" placeholder="••••••••"/></FormField>
          <FormField label="Nome da empresa"><input value={form.companyName} onChange={e=>upd("companyName",e.target.value)} placeholder="Minha Empresa Ltda"/></FormField>
          <FormField label="CNPJ"><input value={form.cnpj} onChange={e=>upd("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/></FormField>
          <FormField label="Cidade (opcional)"><input value={form.city} onChange={e=>upd("city",e.target.value)} placeholder="Recife/PE"/></FormField>
          {(loginErr||validErr)&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",padding:"10px 14px",marginBottom:12,fontFamily:"var(--mono)",fontSize:10,color:"var(--red)"}}>{loginErr||validErr}</div>}
          <button onClick={handleRegister} disabled={loginLoading} style={{width:"100%",fontFamily:"var(--mono)",fontSize:12,fontWeight:500,letterSpacing:".12em",textTransform:"uppercase",background:loginLoading?"var(--bg4)":"var(--amber)",color:"var(--bg)",border:"1px solid var(--amber)",padding:"14px",cursor:loginLoading?"wait":"pointer",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loginLoading?<><span className="pulse">⚙</span> Cadastrando...</>:"Criar conta →"}
          </button>
          {onLogin&&<div style={{textAlign:"center",marginTop:14,fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".05em"}}>Já tem conta? <button onClick={onLogin} style={{background:"transparent",border:"none",color:"var(--amber)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".05em",cursor:"pointer",padding:0,textDecoration:"underline"}}>Entrar</button></div>}
          {onBack&&<button onClick={onBack} style={{width:"100%",background:"transparent",border:"none",color:"var(--white3)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginTop:10,cursor:"pointer"}}>← Voltar para a landing</button>}
        </Card>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function AuthFrame({title,subtitle,children}){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",padding:"40px 0"}}>
      <div className="grid-overlay"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:440,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:32,fontWeight:800,letterSpacing:".06em",marginBottom:6}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".15em",textTransform:"uppercase"}}>{subtitle}</div>
        </div>
        <Card style={{padding:32}}>
          <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:18}}>{title}</div>
          {children}
        </Card>
      </div>
    </div>
  );
}

function ForgotPasswordPage({onBack}){
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const submit=async()=>{
    if(!email.trim()){toast.error("Informe o e-mail.");return;}
    const res=await apiFetch("/auth/forgot-password",{method:"POST",body:JSON.stringify({email})});
    if(res.ok){setSent(true);toast.success("Se o e-mail existir, enviaremos as instruções.");}
    else toast.error("Não foi possível solicitar reset.");
  };
  return(
    <AuthFrame title="Recuperar senha" subtitle="Acesso seguro">
      {sent?(
        <div style={{fontFamily:"var(--body)",fontSize:13,color:"var(--white2)",lineHeight:1.6,marginBottom:18}}>Confira sua caixa de entrada. O link de redefinição expira em 1 hora.</div>
      ):(
        <FormField label="E-mail da conta"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" onKeyDown={e=>e.key==="Enter"&&submit()}/></FormField>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:8}}>
        <Btn variant="ghost" onClick={onBack}>Voltar</Btn>
        {!sent&&<Btn icon={Send} onClick={submit}>Enviar link</Btn>}
      </div>
    </AuthFrame>
  );
}

function ResetPasswordPage({onLogin}){
  const token=new URLSearchParams(window.location.search).get("token")||"";
  const [form,setForm]=useState({password:"",confirm:""});
  const [done,setDone]=useState(false);
  const submit=async()=>{
    if(!token){toast.error("Link inválido.");return;}
    if(form.password.length<8){toast.error("Senha deve ter ao menos 8 caracteres.");return;}
    if(form.password!==form.confirm){toast.error("Senhas não conferem.");return;}
    const res=await apiFetch("/auth/reset-password",{method:"POST",body:JSON.stringify({token,password:form.password})});
    if(res.ok){setDone(true);toast.success("Senha redefinida.");}
    else{const data=await res.json().catch(()=>({}));toast.error(data.error||"Link inválido ou expirado.");}
  };
  return(
    <AuthFrame title="Nova senha" subtitle="Redefinição de acesso">
      {done?(
        <div style={{fontFamily:"var(--body)",fontSize:13,color:"var(--white2)",lineHeight:1.6,marginBottom:18}}>Sua senha foi atualizada. Você já pode entrar novamente.</div>
      ):(
        <>
          <FormField label="Nova senha"><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></FormField>
          <FormField label="Confirmar senha"><input type="password" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submit()}/></FormField>
        </>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:8}}>
        <Btn variant="ghost" onClick={onLogin}>Ir para login</Btn>
        {!done&&<Btn icon={Shield} onClick={submit}>Redefinir</Btn>}
      </div>
    </AuthFrame>
  );
}

function VerifyEmailPage({onLogin}){
  const token=new URLSearchParams(window.location.search).get("token")||"";
  const [status,setStatus]=useState("validando");
  useEffect(()=>{
    if(!token){setStatus("erro");return;}
    apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`).then(r=>setStatus(r.ok?"ok":"erro")).catch(()=>setStatus("erro"));
  },[token]);
  return(
    <AuthFrame title="Verificação de e-mail" subtitle="Confirmação da conta">
      <div style={{fontFamily:"var(--body)",fontSize:13,color:"var(--white2)",lineHeight:1.6,marginBottom:18}}>
        {status==="validando"?"Validando seu link...":status==="ok"?"E-mail confirmado com sucesso.":"Link inválido ou expirado."}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={onLogin}>Entrar</Btn>
      </div>
    </AuthFrame>
  );
}

const MENUS={
  demandante:[
    {id:"dashboard",icon:LayoutDashboard,label:"Dashboard"},
    {id:"nova-demanda",icon:Plus,label:"Nova Demanda"},
    {id:"demandas",icon:ClipboardList,label:"Minhas Demandas"},
    {id:"fornecedores",icon:Factory,label:"Fornecedores"},
    {id:"comparar",icon:BarChart2,label:"Comparar Propostas"},
    {id:"pedidos",icon:Package,label:"Pedidos"},
    {id:"nda",icon:Lock,label:"NDA & Contratos"},
    {id:"contratos-recorrentes",icon:Repeat,label:"Contratos Recorr."},
    {id:"chat",icon:MessageCircle,label:"Chat"},
    {id:"financeiro",icon:CreditCard,label:"Financeiro"},
    {id:"avaliacoes",icon:Star,label:"Avaliações"},
    {id:"verificacao",icon:BadgeCheck,label:"Verificação"},
    {id:"config",icon:Settings,label:"Configurações"},
  ],
  fornecedor:[
    {id:"dashboard",icon:LayoutDashboard,label:"Dashboard"},
    {id:"maquinas",icon:Cpu,label:"Máquinas"},
    {id:"calendario",icon:Calendar,label:"Calendário"},
    {id:"demandas",icon:Inbox,label:"Oportunidades"},
    {id:"pedidos",icon:Package,label:"Pedidos"},
    {id:"nda",icon:Lock,label:"NDA & Contratos"},
    {id:"contratos-recorrentes",icon:Repeat,label:"Contratos Recorr."},
    {id:"chat",icon:MessageCircle,label:"Chat"},
    {id:"qualidade",icon:FileCheck,label:"Qualidade"},
    {id:"financeiro",icon:CreditCard,label:"Financeiro"},
    {id:"avaliacoes",icon:Star,label:"Avaliações"},
    {id:"verificacao",icon:BadgeCheck,label:"Verificação"},
    {id:"config",icon:Settings,label:"Configurações"},
  ],
  admin:[
    {id:"dashboard",icon:LayoutDashboard,label:"Dashboard Geral"},
    {id:"acompanhamento",icon:GitBranch,label:"Acompanhamento"},
    {id:"empresas",icon:Factory,label:"Empresas"},
    {id:"verificacao-admin",icon:UserCheck,label:"Verificações"},
    {id:"demandas",icon:ClipboardList,label:"Demandas"},
    {id:"comparar",icon:BarChart2,label:"Comparar"},
    {id:"pedidos",icon:Package,label:"Pedidos"},
    {id:"financeiro",icon:DollarSign,label:"Transações"},
    {id:"disputas",icon:AlertTriangle,label:"Disputas"},
    {id:"auditoria",icon:ScrollText,label:"Logs de Auditoria"},
    {id:"config",icon:Settings,label:"Configurações"},
  ],
};

const PAGE_PATHS = {
  dashboard:"/dashboard",
  "nova-demanda":"/nova-demanda",
  demandas:"/demandas",
  fornecedores:"/fornecedores",
  comparar:"/comparar",
  pedidos:"/pedidos",
  nda:"/nda",
  "contratos-recorrentes":"/contratos-recorrentes",
  chat:"/chat",
  financeiro:"/financeiro",
  avaliacoes:"/avaliacoes",
  verificacao:"/verificacao",
  config:"/configuracoes",
  acompanhamento:"/acompanhamento",
  maquinas:"/maquinas",
  calendario:"/calendario",
  qualidade:"/qualidade",
  empresas:"/empresas",
  "verificacao-admin":"/verificacao-admin",
  disputas:"/disputas",
  auditoria:"/auditoria",
};

const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page,path])=>[path,page])
);

function pageFromPathname(pathname, userType){
  const normalized=pathname.length>1?pathname.replace(/\/+$/,""):pathname;
  if(normalized==="/"||normalized==="/login"||normalized==="/admin") return "dashboard";
  const page=PATH_TO_PAGE[normalized]||PATH_TO_PAGE[`/${normalized.split("/")[1]}`];
  const menu=MENUS[userType]||MENUS.demandante;
  return menu.some(m=>m.id===page)?page:"dashboard";
}

function RoleHierarchyPanel(){
  const roles=[
    {name:"Admin",color:"var(--red)",count:2,perms:"tudo, auditoria, financeiro"},
    {name:"Gerencia",color:"var(--green)",count:4,perms:"aprovar excecoes e repasses"},
    {name:"Engenharia",color:"#22D3EE",count:7,perms:"status tecnico e qualidade"},
    {name:"Logistica",color:"#60A5FA",count:5,perms:"coleta, transporte e NF"},
    {name:"Comercial",color:"var(--amber)",count:6,perms:"demandas e negociacao"},
    {name:"Manutencao",color:"var(--orange)",count:3,perms:"maquinas e capacidade"},
  ];
  return(
    <div style={{margin:"8px 12px 12px",padding:"12px",border:"1px solid var(--border)",background:"rgba(255,255,255,.025)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <ShieldCheck size={12} color="var(--amber)"/>
        <span style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--amber)"}}>Hierarquia</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {roles.map(r=>(
          <div key={r.name} style={{display:"grid",gridTemplateColumns:"10px 1fr auto",gap:7,alignItems:"center"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:r.color,boxShadow:`0 0 0 3px ${r.color}22`}}/>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white2)",letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:7,color:"var(--white3)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.perms}</div>
            </div>
            <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppShell(){
  const {user,logout}=useAuth();
  const {notifMap,setNotifMap,appLoading}=useApp();
  const userType=user?.role||"demandante";
  const [page,setPage]=useState(()=>pageFromPathname(window.location.pathname,userType));
  const [notifOpen,setNotifOpen]=useState(false);
  const [searchQuery,setSearchQuery]=useState("");
  const menu=MENUS[userType]||MENUS.demandante;
  const notifs=(notifMap[userType]||[]);
  const notifCount=notifs.filter(n=>!n.lida).length;
  const nav=(p)=>{
    setPage(p);
    setNotifOpen(false);
    const nextPath=PAGE_PATHS[p]||"/dashboard";
    if(window.location.pathname!==nextPath){
      window.history.pushState({}, "", nextPath);
    }
  };
  const typeLabel={demandante:"Empresa Demandante",fornecedor:"F\u00e1brica Fornecedora",admin:"Administrador"}[userType];
  const typeIcon={demandante:"\u{1F3ED}",fornecedor:"\u2699\uFE0F",admin:"\u{1F6E1}\uFE0F"}[userType];

  useEffect(()=>{
    const syncFromPath=()=>setPage(pageFromPathname(window.location.pathname,userType));
    syncFromPath();
    window.addEventListener("popstate", syncFromPath);
    return()=>window.removeEventListener("popstate", syncFromPath);
  },[userType]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const checkout=params.get("checkout");
    const tx=params.get("tx");
    if(checkout==="success") toast.success(tx?`Pagamento ${tx} confirmado pelo Stripe.`:"Pagamento confirmado pelo Stripe.");
    if(checkout==="cancel") toast.warning(tx?`Checkout ${tx} cancelado.`:"Checkout cancelado.");
    if(checkout==="success"||checkout==="cancel"){
      window.history.replaceState({}, "", window.location.pathname);
    }
  },[]);

  const displayTypeLabel={demandante:"Empresa Demandante",fornecedor:"F\u00e1brica Fornecedora",admin:"Administrador"}[userType];
  const displayTypeIcon={demandante:"\u{1F3ED}",fornecedor:"\u2699\uFE0F",admin:"\u{1F6E1}\uFE0F"}[userType];

  if(appLoading) return(
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",flexDirection:"column",gap:16}}>
      <svg width={36} height={36} viewBox="0 0 36 36" fill="none"><circle cx={18} cy={18} r={16} stroke="var(--border)" strokeWidth={3}/><path d="M18 2a16 16 0 0 1 16 16" stroke="var(--amber)" strokeWidth={3} strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur=".8s" repeatCount="indefinite"/></path></svg>
      <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--white3)"}}>Carregando dados...</span>
    </div>
  );
  /*
  const userType=user?.role||"demandante";
  const [page,setPage]=useState("dashboard");
  const [notifOpen,setNotifOpen]=useState(false);
  const notifs=(notifMap[userType]||[]);
  const notifCount=notifs.filter(n=>!n.lida).length;
  const [searchQuery,setSearchQuery]=useState("");
  const nav=(p)=>{ setPage(p); setNotifOpen(false); };
  const menu=MENUS[userType]||MENUS.demandante;
  const typeLabel={demandante:"Empresa Demandante",fornecedor:"Fábrica Fornecedora",admin:"Administrador"}[userType];
  const typeIcon={demandante:"🏭",fornecedor:"⚙️",admin:"🛡️"}[userType];

  */
  const renderPage=()=>{
    if(userType==="demandante"){
      if(page==="dashboard") return <DashDemandante setPage={nav}/>;
      if(page==="nova-demanda") return <NovaDemanda setPage={nav}/>;
      if(page==="demandas") return <ListaDemandas setPage={nav} searchProp={searchQuery}/>;
      if(page==="fornecedores") return <BuscarFornecedores searchProp={searchQuery}/>;
      if(page==="comparar") return <CompararPropostas/>;
      if(page==="pedidos") return <Pedidos userType={userType}/>;
      if(page==="nda") return <ContratosNDA userType={userType}/>;
      if(page==="contratos-recorrentes") return <ContratosRecorrentes/>;
      if(page==="chat") return <Chat/>;
      if(page==="financeiro") return <Financeiro userType={userType}/>;
      if(page==="avaliacoes") return <Avaliacoes/>;
      if(page==="verificacao") return <VerificacaoEmpresarial userType={userType}/>;
      if(page==="config") return <Configuracoes/>;
    }
    if(userType==="fornecedor"){
      if(page==="dashboard") return <DashFornecedor setPage={nav}/>;
      if(page==="maquinas") return <CadastroMaquinas/>;
      if(page==="calendario") return <CalendarioCapacidade/>;
      if(page==="demandas") return <ListaDemandas setPage={nav} fornecedor searchProp={searchQuery}/>;
      if(page==="pedidos") return <Pedidos userType={userType}/>;
      if(page==="nda") return <ContratosNDA userType={userType}/>;
      if(page==="contratos-recorrentes") return <ContratosRecorrentes/>;
      if(page==="chat") return <Chat/>;
      if(page==="qualidade") return <Qualidade/>;
      if(page==="financeiro") return <Financeiro userType={userType}/>;
      if(page==="avaliacoes") return <Avaliacoes/>;
      if(page==="verificacao") return <VerificacaoEmpresarial userType={userType}/>;
      if(page==="config") return <Configuracoes/>;
    }
    if(userType==="admin"){
      if(page==="dashboard") return <DashAdmin/>;
      if(page==="acompanhamento") return <TeamTrackingPanel/>;
      if(page==="empresas") return <AdminEmpresas/>;
      if(page==="verificacao-admin") return <VerificacaoAdmin/>;
      if(page==="demandas") return <ListaDemandas setPage={nav} searchProp={searchQuery}/>;
      if(page==="comparar") return <CompararPropostas/>;
      if(page==="pedidos") return <Pedidos userType={userType}/>;
      if(page==="financeiro") return <Financeiro userType="admin"/>;
      if(page==="disputas") return <Disputas/>;
      if(page==="auditoria") return <LogsAuditoria/>;
      if(page==="config") return <Configuracoes/>;
    }
    return <PlaceholderPage title={menu.find(m=>m.id===page)?.label||page}/>;
  };

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"var(--bg)"}}>
      <aside style={{width:212,background:"var(--bg2)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,zIndex:50}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,letterSpacing:".06em"}}>CAP<span style={{color:"var(--amber)"}}>A</span>CITY</div>
          <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginTop:2}}>{displayTypeIcon} {displayTypeLabel}</div>
        </div>
        <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {menu.map(m=>{
            const active=page===m.id;
            return(
              <button key={m.id} onClick={()=>nav(m.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 18px",background:active?"var(--amber-dim2)":"transparent",border:"none",borderLeft:active?"2px solid var(--amber)":"2px solid transparent",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                <m.icon size={13} color={active?"var(--amber)":"var(--white3)"}/>
                <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".07em",textTransform:"uppercase",color:active?"var(--amber)":"var(--white2)",fontWeight:active?500:400}}>{m.label}</span>
              </button>
            );
          })}
        </nav>
        {userType==="admin"&&<RoleHierarchyPanel/>}
        <div style={{padding:"12px 18px",borderTop:"1px solid var(--border)"}}>
          <button onClick={logout} style={{width:"100%",display:"flex",alignItems:"center",gap:9,background:"transparent",border:"none",cursor:"pointer",padding:"6px 0"}}>
            <LogOut size={13} color="var(--white3)"/>
            <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)"}}>Sair</span>
          </button>
        </div>
      </aside>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <header style={{height:56,background:"var(--bg2)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",padding:"0 24px",gap:16,flexShrink:0,position:"relative",zIndex:60}}>
          <div style={{flex:1,position:"relative"}}>
            <Search size={13} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--white3)"}}/>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&searchQuery.trim()){nav(userType==="fornecedor"?"demandas":"demandas");}}} placeholder="Buscar demandas, fornecedores, pedidos..." style={{paddingLeft:36,height:34,fontSize:13,background:"var(--bg3)",width:"100%",maxWidth:380}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setNotifOpen(o=>!o)}>
              <Bell size={18} color={notifOpen?"var(--amber)":"var(--white3)"}/>
              {notifCount>0&&<span style={{position:"absolute",top:-5,right:-5,background:"var(--red)",color:"#fff",fontSize:9,fontFamily:"var(--mono)",width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{notifCount}</span>}
            </div>
            <div style={{width:1,height:24,background:"var(--border)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,background:"var(--amber-dim2)",border:"1px solid rgba(232,160,32,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:9,fontWeight:600,color:"var(--amber)"}}>{user?.avatar||typeIcon}</div>
              <div>
                <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,lineHeight:1}}>{user?.name||"Usuário"}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".06em"}}>{typeLabel}</div>
              </div>
            </div>
          </div>
        </header>
        <main style={{flex:1,overflowY:"auto",padding:"24px",position:"relative"}} onClick={()=>notifOpen&&setNotifOpen(false)}>
          {renderPage()}
        </main>
      </div>
      <NotificacaoPanel open={notifOpen} onClose={()=>setNotifOpen(false)} userType={userType} notifs={notifs} setNotifs={ns=>setNotifMap(m=>({...m,[userType]:ns}))}/>
    </div>
  );
}

// ─── DASHBOARDS ───────────────────────────────────────────────────────────────
function DashDemandante({setPage}){
  const {demands,orders,sentProposals,proposals:appProposals}=useApp();
  const {user}=useAuth();
  const activeOrders=orders.filter(o=>o.pct<100);
  const greeting=new Date().getHours()<12?"Bom dia":new Date().getHours()<18?"Boa tarde":"Boa noite";
  const allProposals=(appProposals||[]).filter((p,i,arr)=>arr.findIndex(x=>x.id===p.id)===i);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>{greeting}, <span style={{color:"var(--amber)"}}>{user?.name||"Empresa"}</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",marginTop:3}}>{new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()} · {user?.company}</div>
        </div>
        <Btn icon={Plus} onClick={()=>setPage("nova-demanda")}>Nova Demanda</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Demandas ativas" value={demands.filter(d=>d.status!=="Contratado"&&d.status!=="Finalizado").length} sub="publicadas" icon={ClipboardList}/>
        <Stat label="Propostas recebidas" value={demands.reduce((a,d)=>a+(d.proposals||0),0)} sub="Total acumulado" icon={Inbox}/>
        <Stat label="Em produção" value={activeOrders.length} sub="pedidos ativos" icon={Activity} color="var(--green)"/>
        <Stat label="Economia obtida" value="R$12k" sub="vs. orçamento inicial" icon={TrendingUp} color="var(--green)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Demandas Recentes</span>
            <Btn small variant="ghost" onClick={()=>setPage("demandas")}>Ver todas</Btn>
          </div>
          {demands.slice(0,4).map(d=>(
            <div key={d.id} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{d.title?.substring(0,40)}...</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{d.process} · {d.location} · {d.deadline}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Badge label={`${d.proposals||0}p`} color="var(--amber)"/>
                <Badge label={d.status} color={STATUS_COLORS[d.status]||"var(--white2)"}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Pedidos em Produção</span>
          </div>
          {activeOrders.map(o=>(
            <div key={o.id} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",marginBottom:2}}>{o.id}</div>
                  <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{o.product}</div>
                </div>
                <Badge label={o.status} color={STATUS_COLORS[o.status]||"var(--amber)"}/>
              </div>
              <div style={{background:"rgba(255,255,255,.05)",height:4}}>
                <div style={{height:"100%",background:"var(--amber)",width:`${o.pct}%`}}/>
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3,textAlign:"right"}}>{o.pct}% · {o.deadline}</div>
            </div>
          ))}
          {activeOrders.length===0&&<div style={{padding:"20px 18px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",textAlign:"center"}}>Nenhum pedido ativo</div>}
        </Card>
      </div>
      {false&&activeLog&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <Card style={{padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Detalhes do evento</div>
              <Badge label={riskForLog(activeLog)} color={riskForLog(activeLog)==="Critico"?"var(--red)":riskForLog(activeLog)==="Alto"?"var(--orange)":"var(--green)"}/>
            </div>
            {[["Evento",activeLog.evento],["Usuario",activeLog.usuario],["Empresa",activeLog.empresa],["Endereco IP",activeLog.ip],["Referencia",activeLog.ref||"sem referencia"],["Data/Hora",activeLog.data]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"18px 22px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Rastreamento</div>
            {[["Origem","Web admin · 127.0.0.1"],["Sessao","sess-"+String(activeLog.id).padStart(4,"0")],["Assinatura","sha256-"+String(activeLog.id).padStart(6,"0")+"-ok"],["Retencao","5 anos · LGPD/auditoria"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      <Card>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Propostas Aguardando Análise</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--border)"}}>
              {["Fornecedor","Score","Preço","Prazo","Risco","Avaliação",""].map(h=><th key={h} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",padding:"9px 14px",textAlign:"left",fontWeight:400}}>{h}</th>)}
            </tr></thead>
            <tbody>{allProposals.slice(0,3).map(p=>(
              <tr key={p.id} style={{borderBottom:"1px solid var(--border)"}}>
                <td style={{padding:"10px 14px",fontFamily:"var(--cond)",fontSize:14,fontWeight:600,textTransform:"uppercase"}}>{p.supplier}</td>
                <td style={{padding:"10px 14px"}}><span style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,color:"var(--amber)"}}>{p.score}</span></td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11}}>{p.total}</td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11,color:"var(--white2)"}}>{p.days}d</td>
                <td style={{padding:"10px 14px"}}><Badge label={p.risk} color={RISK_COLORS[p.risk]}/></td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11,color:"var(--amber)"}}>{p.rating}★</td>
                <td style={{padding:"10px 14px"}}><Btn small variant="ghost" onClick={()=>setPage("comparar")}>Comparar</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {false&&activeLog&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
          <Card style={{padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Detalhes do evento</div>
              <Badge label={riskForLog(activeLog)} color={riskForLog(activeLog)==="Critico"?"var(--red)":riskForLog(activeLog)==="Alto"?"var(--orange)":"var(--green)"}/>
            </div>
            {[
              ["Evento",activeLog.evento],
              ["Usuario",activeLog.usuario],
              ["Empresa",activeLog.empresa],
              ["Endereco IP",activeLog.ip],
              ["Referencia",activeLog.ref||"sem referencia"],
              ["Data/Hora",activeLog.data],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"18px 22px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Rastreamento</div>
            {[
              ["Origem","Web admin · 127.0.0.1"],
              ["Sessao","sess-"+String(activeLog.id).padStart(4,"0")],
              ["Assinatura","sha256-"+String(activeLog.id).padStart(6,"0")+"-ok"],
              ["Retencao","5 anos · LGPD/auditoria"],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function DashFornecedor({setPage}){
  const {orders,machines,demands,reviews}=useApp();
  const {user}=useAuth();
  const activeOrders=orders.filter(o=>o.pct<100);
  const avgIdle=machines.length?Math.round(machines.reduce((a,m)=>a+m.idle,0)/machines.length):0;
  const avgRating=reviews&&reviews.length?(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1):"—";
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Dashboard <span style={{color:"var(--amber)"}}>Fornecedor</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",marginTop:3}}>{user?.company} · {user?.cnpj}</div>
        </div>
        <div style={{display:"flex",gap:8}}><Badge label="✓ Verificado" color="var(--green)"/><Badge label="★ Confiável" color="var(--amber)"/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Ociosidade atual" value={`${avgIdle}%`} sub={`${machines.filter(m=>m.status==="Disponível").length} máquinas livres`} icon={PieChart} color="var(--orange)"/>
        <Stat label="Oportunidades" value={demands.filter(d=>d.status==="Publicado"||d.status==="Em cotação").length} sub="Esta semana" icon={Inbox}/>
        <Stat label="Pedidos ativos" value={activeOrders.length} icon={DollarSign} color="var(--green)"/>
        <Stat label="Avaliação média" value={`${avgRating}★`} sub={`${orders.filter(o=>o.pct===100).length} pedidos concluídos`} icon={Star}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Ociosidade por Máquina</span>
            <Btn small variant="ghost" onClick={()=>setPage("maquinas")}>Gerenciar</Btn>
          </div>
          {machines.map(m=>(
            <div key={m.id} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:700,textTransform:"uppercase"}}>{m.name}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:1}}>{m.cost} · {m.turns}</div>
                </div>
                <Badge label={m.status} color={m.status==="Disponível"?"var(--green)":m.status==="Parcial"?"var(--orange)":"var(--red)"}/>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1,background:"rgba(255,255,255,.06)",height:5}}>
                  <div style={{height:"100%",background:m.idle>50?"var(--orange)":"var(--amber)",width:`${m.idle}%`}}/>
                </div>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",minWidth:32,textAlign:"right"}}>{m.idle}%</span>
              </div>
            </div>
          ))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{flex:1}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Oportunidades Novas</span>
            </div>
            {demands.filter(d=>d.status==="Publicado"||d.status==="Em cotação").slice(0,3).map(d=>(
              <div key={d.id} style={{padding:"10px 18px",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:700,textTransform:"uppercase"}}>{d.title?.substring(0,32)}...</span>
                  <Badge label={d.urgency} color={URG_COLORS[d.urgency]}/>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{d.process} · {d.location} · {d.budget}</div>
              </div>
            ))}
            <div style={{padding:"10px 18px"}}><Btn full small variant="ghost" onClick={()=>setPage("demandas")}>Ver todas as oportunidades</Btn></div>
          </Card>
          <Card>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Pedidos Ativos</span>
            </div>
            {activeOrders.slice(0,2).map(o=>(
              <div key={o.id} style={{padding:"10px 18px",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{o.product}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--green)"}}>{o.value}</span>
                </div>
                <div style={{background:"rgba(255,255,255,.05)",height:4,marginBottom:3}}>
                  <div style={{height:"100%",background:"var(--green)",width:`${o.pct}%`}}/>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{o.pct}% · {o.deadline}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashAdmin(){
  const {audit,companies,demands,orders,transactions}=useApp();
  const pending=companies.filter(c=>c.status!=="Aprovado"&&c.status!=="Reprovado");
  const fmtBRL=v=>v>=1000000?`R$${(v/1000000).toFixed(1)}M`:v>=1000?`R$${Math.round(v/1000)}k`:`R$${v}`;
  const gmv=(transactions||[]).filter(t=>t.status!=="Cancelado").reduce((a,t)=>a+t.gross,0);
  const receita=Math.round(gmv*0.07);
  const concluidos=orders.filter(o=>o.pct===100).length;
  const txFechamento=demands.length?Math.round(concluidos/demands.length*100):0;
  const ticketMedio=concluidos?Math.round(gmv/concluidos):0;
  const openVerification=(company)=>{
    const next=`/verificacao-admin?empresa=${encodeURIComponent(company.id)}`;
    window.history.pushState({}, "", next);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Dashboard <span style={{color:"var(--amber)"}}>Administrativo</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",marginTop:3}}>PAINEL DE CONTROLE DA PLATAFORMA</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        <Stat label="GMV total" value={fmtBRL(gmv)} sub="volume bruto negociado" icon={DollarSign} color="var(--green)"/>
        <Stat label="Receita plataforma" value={fmtBRL(receita)} sub="comissões 7%" icon={TrendingUp}/>
        <Stat label="Empresas ativas" value={companies.filter(c=>c.status==="Aprovado").length} sub={`${pending.length} pendentes`} icon={Factory}/>
        <Stat label="Demandas" value={demands.length} sub="publicadas" icon={ClipboardList}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        <Stat label="Pedidos ativos" value={orders.filter(o=>o.pct<100).length} icon={Package}/>
        <Stat label="Taxa de fechamento" value={`${txFechamento}%`} sub="pedidos concluídos/demandas" icon={Target}/>
        <Stat label="Ticket médio" value={fmtBRL(ticketMedio)} icon={CreditCard}/>
        <Stat label="Retenção mensal" value="91%" icon={RefreshCw} color="var(--green)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>Verificações Pendentes</span>
            <Badge label={`${pending.length} aguardando`} color="var(--orange)"/>
          </div>
          {pending.slice(0,4).map(c=>(
            <button key={c.id} onClick={()=>openVerification(c)} style={{width:"100%",padding:"12px 18px",border:"none",borderBottom:"1px solid var(--border)",background:"transparent",display:"flex",alignItems:"center",gap:12,textAlign:"left",cursor:"pointer"}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:700,textTransform:"uppercase"}}>{c.name}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{c.type} · {c.city}</div>
              </div>
              <Badge label={c.status} color={STATUS_COLORS[c.status]||"var(--amber)"}/>
              <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--amber)",letterSpacing:".08em",textTransform:"uppercase"}}>Abrir</span>
            </button>
          ))}
          {pending.length===0&&<div style={{padding:"20px 18px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",textAlign:"center"}}>Nenhuma verificação pendente</div>}
        </Card>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>Logs Recentes</span>
          </div>
          {audit.slice(0,5).map(l=>(
            <div key={l.id} style={{padding:"10px 18px",borderBottom:"1px solid var(--border)",display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:LOG_COLORS[l.tipo]||"var(--white2)",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white)"}}>{l.evento}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{l.empresa} · {l.data}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function TeamTrackingPanel(){
  const {demands,orders,transactions,disputes,machines,contracts}=useApp();
  const goOrder=(order,section="status")=>{
    if(!order?.id) return;
    const path=orderPath(order.id,section);
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const activeOrders=orders.filter(o=>o.pct<100);
  const heldTx=transactions.filter(t=>["Retido","Pendente","Em disputa"].includes(t.status));
  const lateOrders=activeOrders.filter(o=>o.pct<85&&["Em produção","Em inspeção"].includes(o.status));
  const openDemands=demands.filter(d=>["Publicado","Em cotação","Em negociação","Em cotaÃ§Ã£o","Em negociaÃ§Ã£o"].includes(d.status));
  const pendingContracts=contracts.filter(c=>!["Assinado","Finalizado"].includes(c.status));
  const queueFromPath=()=>{
    const key=window.location.pathname.split("/").filter(Boolean)[1]||"pedidos";
    return ["pedidos","demandas","transacoes","contratos"].includes(key)?key:"pedidos";
  };
  const [queueView,setQueueView]=useState(queueFromPath);
  const [queueTab,setQueueTab]=useState("pendencias");
  const [trackingComments,setTrackingComments]=useState(()=>DB.get("tracking_comments")||[
    {id:"seed-track-1",area:"Gerencia",text:"Priorizar pedidos com inspecao acima de 80% e transacoes retidas.",by:"Admin CapaCity",at:"15/05/2026 08:30"},
  ]);
  const [trackingComment,setTrackingComment]=useState("");
  const showQueue=(key)=>{
    setQueueView(key);
    setQueueTab("pendencias");
    const nextPath=`/acompanhamento/${key}`;
    if(window.location.pathname!==nextPath) window.history.pushState({}, "", nextPath);
  };
  const queueItems={
    pedidos:activeOrders.map(o=>({id:o.id,title:o.product,status:o.status,why:lateOrders.some(x=>x.id===o.id)?"SLA tecnico pede atencao":"Aguardando proxima aprovacao setorial",owner:"Engenharia / Logistica",action:()=>goOrder(o,"aprovacoes")})),
    demandas:openDemands.map(d=>({id:d.id,title:d.title||d.product||"Demanda aberta",status:d.status,why:"Aguardando propostas, contraproposta ou decisao comercial",owner:"Comercial",action:()=>{window.history.pushState({}, "", "/demandas");window.dispatchEvent(new PopStateEvent("popstate"));}})),
    transacoes:heldTx.map(t=>({id:t.id,title:t.order||t.order_id||"Transacao",status:t.status,why:t.status==="Retido"?"Pagamento retido ate liberacao de SLA":"Pendente financeiro ou disputa ativa",owner:"Financeiro / Gerencia",action:()=>{window.history.pushState({}, "", "/financeiro");window.dispatchEvent(new PopStateEvent("popstate"));}})),
    contratos:(pendingContracts.length?pendingContracts:contracts).map(c=>({id:c.id,title:c.order_id||c.pedido||c.fornecedor||"Contrato",status:c.status||"Aguardando assinatura",why:"Assinatura, SLA ou documento contratual pendente",owner:"Gerencia",action:()=>{window.history.pushState({}, "", "/financeiro");window.dispatchEvent(new PopStateEvent("popstate"));}})),
  };
  const activeQueue=queueItems[queueView]||queueItems.pedidos;
  const queueLabels={pedidos:"Pedidos pendentes",demandas:"Demandas abertas",transacoes:"Transacoes criticas",contratos:"Contratos e SLA"};
  const saveTrackingComment=()=>{
    if(!trackingComment.trim()){toast.error("Escreva um comentario.");return;}
    const item={id:`track-${Date.now()}`,area:queueLabels[queueView],text:trackingComment.trim(),by:"Admin CapaCity",at:nowPtBr()};
    const next=[item,...trackingComments];
    setTrackingComments(next);
    DB.set("tracking_comments",next);
    setTrackingComment("");
    toast.success("Comentario registrado no acompanhamento.");
  };
  const departmentDefs=[
    {
      id:"engenharia",label:"Engenharia",icon:Wrench,color:"#22D3EE",owner:"Líder técnico",
      queue:activeOrders.filter(o=>["Contratado","Em setup","Em produção","Em inspeção"].includes(o.status)),
      focus:"desenhos, setup, inspeção e aprovação técnica",
      section:"status",
      perms:["ver pedidos","alterar status técnico","registrar qualidade","abrir bloqueio"],
    },
    {
      id:"logistica",label:"Logística",icon:Truck,color:"#60A5FA",owner:"Coordenação logística",
      queue:activeOrders.filter(o=>["Aguardando coleta","Em transporte","Entregue"].includes(o.status)),
      focus:"coleta, transporte, entrega e documentos fiscais",
      section:"logistica",
      perms:["ver pedidos","agendar coleta","emitir rastreio","anexar NF"],
    },
    {
      id:"comercial",label:"Comercial",icon:Users,color:"var(--amber)",owner:"Inside sales",
      queue:demands.filter(d=>["Publicado","Em cotação","Em negociação"].includes(d.status)),
      focus:"demandas abertas, propostas e negociação",
      section:"atualizacoes",
      perms:["ver demandas","acompanhar propostas","enviar follow-up","acionar fornecedor"],
    },
    {
      id:"manutencao",label:"Manutenção",icon:Cpu,color:"var(--orange)",owner:"PCM",
      queue:machines.filter(m=>m.status!=="Disponível"),
      focus:"máquinas ocupadas, capacidade e paradas",
      section:"status",
      perms:["ver máquinas","bloquear capacidade","programar parada","registrar retorno"],
    },
    {
      id:"gerencia",label:"Gerência",icon:ShieldCheck,color:"var(--green)",owner:"Gestão",
      queue:[...heldTx,...disputes.filter(d=>d.status!=="Resolvida"&&d.status!=="Encerrada")],
      focus:"SLA, finanças, contratos, disputas e decisões críticas",
      section:"financeiro",
      perms:["ver tudo","aprovar exceções","liberar repasse","auditar trilha"],
    },
  ];
  const matrix=[
    ["Engenharia","Demandas: leitura","Pedidos: alterar status técnico","Transações: leitura","Admin: sem acesso"],
    ["Logística","Demandas: leitura","Pedidos: coleta/transporte/NF","Transações: leitura","Admin: sem acesso"],
    ["Comercial","Demandas: publicar/acompanhar","Propostas: negociação","Pedidos: leitura","Admin: sem acesso"],
    ["Manutenção","Máquinas: gerenciar capacidade","Pedidos: leitura técnica","Transações: sem acesso","Admin: sem acesso"],
    ["Gerência","Demandas/Pedidos: total","Transações: liberar/reembolsar","Disputas: mediar","Admin: auditoria"],
  ];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Acompanhamento <span style={{color:"var(--amber)"}}>Operacional</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",marginTop:3}}>Engenharia · Logística · Comercial · Manutenção · Gerência</div>
        </div>
        <Badge label="permissões delegadas" color="var(--green)"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        {[
          ["pedidos","Pedidos em rota",activeOrders.length,`${lateOrders.length} pedem atenção`,Package],
          ["demandas","Demandas abertas",openDemands.length,"comercial acompanha",ClipboardList],
          ["transacoes","Transações críticas",heldTx.length,"financeiro/gerência",DollarSign],
          ["contratos","Contratos",contracts.length,"assinaturas e SLA",FileSignature],
        ].map(([key,label,value,sub,Icon])=>(
          <button key={key} onClick={()=>showQueue(key)} style={{border:queueView===key?"1px solid rgba(232,160,32,.65)":"1px solid var(--border)",background:queueView===key?"rgba(232,160,32,.08)":"transparent",padding:0,textAlign:"left",cursor:"pointer"}}>
            <Stat label={label} value={value} sub={sub} icon={Icon}/>
          </button>
        ))}
      </div>

      <Card style={{marginBottom:16}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>{queueLabels[queueView]}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>status da pendencia, motivo e comentarios por area</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {["pendencias","comentarios"].map(tab=>(
              <button key={tab} onClick={()=>setQueueTab(tab)} style={{border:`1px solid ${queueTab===tab?"rgba(232,160,32,.55)":"var(--border)"}`,background:queueTab===tab?"var(--amber-dim2)":"transparent",color:queueTab===tab?"var(--amber)":"var(--white3)",padding:"7px 10px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer"}}>{tab}</button>
            ))}
          </div>
        </div>
        {queueTab==="pendencias"?(
          <div>
            {activeQueue.length?activeQueue.slice(0,6).map(item=>(
              <div key={item.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 150px 120px",gap:12,alignItems:"center",padding:"12px 18px",borderBottom:"1px solid var(--border)"}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)"}}>{item.id}</div>
                <div>
                  <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase"}}>{item.title}</div>
                  <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",lineHeight:1.45,marginTop:2}}>{item.why}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:3,textTransform:"uppercase"}}>{item.owner}</div>
                </div>
                <Badge label={item.status} color={STATUS_COLORS[item.status]||"var(--amber)"}/>
                <button onClick={item.action} style={{border:"1px solid var(--border2)",background:"transparent",color:"var(--white2)",padding:"7px 8px",fontFamily:"var(--mono)",fontSize:9,textTransform:"uppercase",cursor:"pointer"}}>Abrir</button>
              </div>
            )):<EmptyState icon={CheckCircle} title="Sem pendencias nesta fila" description="Os itens criticos deste grupo estao limpos no momento."/>}
          </div>
        ):(
          <div style={{padding:18}}>
            <FormField label="Comentario da equipe">
              <textarea rows={3} value={trackingComment} onChange={e=>setTrackingComment(e.target.value)} placeholder="Registre o motivo da pendencia, decisao tomada ou proximo responsavel."/>
            </FormField>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn small icon={MessageCircle} onClick={saveTrackingComment}>Registrar comentario</Btn></div>
            {trackingComments.filter(c=>!c.area||c.area===queueLabels[queueView]||c.area==="Gerencia").map(c=>(
              <div key={c.id} style={{padding:"10px 0",borderTop:"1px solid var(--border)"}}>
                <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",lineHeight:1.5}}>{c.text}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:3}}>{c.area} · {c.by} · {c.at}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10,marginBottom:16}}>
        {departmentDefs.map(dep=>{
          const Icon=dep.icon;
          const first=dep.queue[0];
          const isOrder=first?.id?.startsWith?.("PD-");
          return(
            <Card key={dep.id} style={{padding:"16px 14px",minHeight:210}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <Icon size={18} color={dep.color}/>
                <Badge label={`${dep.queue.length} itens`} color={dep.color}/>
              </div>
              <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:900,textTransform:"uppercase",color:dep.color}}>{dep.label}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3,textTransform:"uppercase"}}>{dep.owner}</div>
              <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",lineHeight:1.45,marginTop:10,minHeight:52}}>{dep.focus}</div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:10}}>
                {dep.perms.slice(0,3).map(p=><span key={p} style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".06em",textTransform:"uppercase"}}>✓ {p}</span>)}
              </div>
              {first&&isOrder&&<button onClick={()=>goOrder(first,dep.section)} style={{marginTop:12,width:"100%",border:"1px solid var(--border2)",background:"transparent",color:"var(--white2)",padding:"7px 8px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer"}}>Abrir {first.id}</button>}
            </Card>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:14}}>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase"}}>Fila cruzada de pedidos</span>
            <Badge label="SLA por área" color="var(--amber)"/>
          </div>
          {activeOrders.slice(0,6).map(o=>(
            <div key={o.id} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",display:"grid",gridTemplateColumns:"90px 1fr 130px 110px",gap:12,alignItems:"center"}}>
              <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)"}}>{o.id}</span>
              <div>
                <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:800,textTransform:"uppercase"}}>{o.product}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{o.client} · entrega {o.deadline}</div>
              </div>
              <Badge label={o.status} color={STATUS_COLORS[o.status]||"var(--amber)"}/>
              <button onClick={()=>goOrder(o,o.status==="Aguardando coleta"||o.status==="Em transporte"?"logistica":"status")} style={{border:"1px solid var(--border2)",background:"transparent",color:"var(--white2)",padding:"7px 8px",fontFamily:"var(--mono)",fontSize:9,textTransform:"uppercase",cursor:"pointer"}}>Acompanhar</button>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase"}}>Matriz de permissões</span>
          </div>
          {matrix.map(row=>(
            <div key={row[0]} style={{padding:"11px 18px",borderBottom:"1px solid var(--border)"}}>
              <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:800,textTransform:"uppercase",color:"var(--amber)",marginBottom:5}}>{row[0]}</div>
              {row.slice(1).map(p=><div key={p} style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",lineHeight:1.7,textTransform:"uppercase"}}>{p}</div>)}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── VERIFICAÇÃO EMPRESARIAL ──────────────────────────────────────────────────
function VerificacaoEmpresarial({userType}){
  const {onboardStripeCompany}=useApp();
  const {user}=useAuth();
  const [docs,setDocs]=useState([]);
  const [docViewer,setDocViewer]=useState(null);
  const fileRef=useRef(null);
  const [uploadingId,setUploadingId]=useState(null);
  useEffect(()=>{
    apiGet("/verification").then(rows=>setDocs(Array.isArray(rows)?rows:[]));
  },[]);
  const statusGeral=docs.filter(d=>d.obrigatorio&&d.status!=="Aprovado").length===0?"Aprovado":docs.some(d=>d.status==="Em análise"||d.status==="Enviado")?"Em análise":"Pendente";
  const handleUpload=(id)=>{
    setUploadingId(id);
    fileRef.current?.click();
  };
  const onFileChosen=async(e)=>{
    const f=e.target.files?.[0];
    if(!f||!uploadingId) return;
    const fd=new FormData();
    fd.append("file",f);
    const res=await apiFetch(`/verification/${uploadingId}/upload`,{method:"POST",body:fd});
    if(res.ok){
      const updated=await res.json();
      setDocs(d=>d.map(x=>x.id===uploadingId?{...x,...updated}:x));
      toast.success(`${f.name} enviado! Aguardando análise.`);
    } else {
      toast.error("Erro ao enviar documento.");
    }
    setUploadingId(null);
    e.target.value="";
  };
  return(
    <div>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={onFileChosen} style={{display:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Verificação <span style={{color:"var(--amber)"}}>Empresarial</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",marginTop:3}}>CNPJ 12.345.678/0001-90 · METALÚRGICA NORDESTE LTDA</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {userType==="fornecedor"&&<Btn small variant="ghost" icon={CreditCard} onClick={()=>onboardStripeCompany(user?.company_id||user?.companyId)}>Configurar Repasse</Btn>}
          <Badge label={statusGeral} color={STATUS_COLORS[statusGeral]||"var(--amber)"}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {[["Obrigatórios",docs.filter(d=>d.obrigatorio).length,"total","var(--white)"],["Aprovados",docs.filter(d=>d.status==="Aprovado").length,"docs","var(--green)"],["Em análise",docs.filter(d=>d.status==="Em análise").length,"aguardando","var(--amber)"],["Pendentes",docs.filter(d=>d.status==="Pendente").length,"enviar","var(--orange)"]].map(([l,v,s,c])=>(
          <Stat key={l} label={l} value={String(v)} sub={s} color={c}/>
        ))}
      </div>
      {statusGeral==="Aprovado"&&(
        <div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.3)",padding:"16px 20px",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <BadgeCheck size={20} color="var(--green)"/>
          <div>
            <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",color:"var(--green)"}}>Empresa Verificada</div>
            <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)"}}>Todos os documentos obrigatórios foram aprovados. O selo de Empresa Verificada está ativo no seu perfil público.</div>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>Documentos</span>
          </div>
          {docs.map(d=>(
            <div key={d.id} style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:600,textTransform:"uppercase"}}>{d.nome}</span>
                    {d.obrigatorio&&<Badge label="Obrig." color="var(--red)"/>}
                  </div>
                  {d.arquivo&&<div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{d.arquivo} · {d.enviado}</div>}
                </div>
                <Badge label={d.status} color={STATUS_COLORS[d.status]||"var(--white3)"}/>
              </div>
              {!d.arquivo?(
                <button onClick={()=>handleUpload(d.id)} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",background:"transparent",border:"1px dashed var(--border2)",color:"var(--white3)",padding:"8px 14px",cursor:"pointer",width:"100%",justifyContent:"center"}}>
                  <Upload size={12}/> Clique para enviar
                </button>
              ):(
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setDocViewer(d)} style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"5px 10px",cursor:"pointer"}}>
                    <Eye size={10}/> Visualizar
                  </button>
                  {d.status==="Pendente"&&<button onClick={()=>handleUpload(d.id)} style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:9,textTransform:"uppercase",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"5px 10px",cursor:"pointer"}}>
                    <RotateCcw size={10}/> Substituir
                  </button>}
                </div>
              )}
            </div>
          ))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:"20px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:14}}>Status da Análise</div>
            {[{label:"Documentação enviada",done:true,date:"29/04/2026"},{label:"Análise iniciada pelo admin",done:true,date:"30/04/2026"},{label:"Documentos obrigatórios aprovados",done:true,date:"01/05/2026"},{label:"Certificações opcionais",done:false,date:"Em análise"},{label:"Verificação completa",done:false,date:"—"}].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",paddingBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:s.done?"var(--green)":"var(--bg4)",border:`1px solid ${s.done?"var(--green)":"var(--border2)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {s.done&&<Check size={10} color="var(--bg)"/>}
                  </div>
                  {i<4&&<div style={{width:1,height:12,background:s.done?"var(--green)":"var(--border)",marginTop:2}}/>}
                </div>
                <div>
                  <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:s.done?600:400,textTransform:"uppercase",color:s.done?"var(--white)":"var(--white3)"}}>{s.label}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:1}}>{s.date}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{padding:"20px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:12}}>Selos Conquistados</div>
            {[["✓ Empresa Verificada","Documentação aprovada pelo admin","var(--green)"],["🏭 CNPJ Ativo","Situação regular na Receita Federal","var(--blue)"],["ISO 9001","Certificado enviado e em análise","var(--amber)"]].map(([s,d,c])=>(
              <div key={s} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                <Badge label={s} color={c}/>
                <span style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)"}}>{d}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <DocViewerModal open={!!docViewer} onClose={()=>setDocViewer(null)} doc={docViewer}/>
    </div>
  );
}

// ─── VERIFICAÇÃO ADMIN ────────────────────────────────────────────────────────
function VerificacaoAdmin(){
  const {companies,approveCompany,rejectCompany}=useApp();
  const {user}=useAuth();
  const [rejectModal,setRejectModal]=useState(null);
  const [rejectMotivo,setRejectMotivo]=useState("");
  const [docViewer,setDocViewer]=useState(null);
  const [verificationNotes,setVerificationNotes]=useState(()=>DB.get("verification_notes")||{});
  const saveVerificationNote=(id,patch)=>{
    const next={...verificationNotes,[id]:{...(verificationNotes[id]||{}),...patch,updatedBy:user?.name||"Admin CapaCity",updatedAt:nowPtBr()}};
    setVerificationNotes(next);
    DB.set("verification_notes",next);
  };
  const docsForCompany=(e)=>[
    {nome:"Contrato social",arquivo:`contrato_social_${e.id}.pdf`,status:e.status==="Reprovado"?"Revisar":"Aprovado",obrigatorio:true,enviado:"29/04/2026",responsavel:e.name},
    {nome:"Cartao CNPJ",arquivo:`cnpj_${e.id}.pdf`,status:"Aprovado",obrigatorio:true,enviado:"29/04/2026",responsavel:e.name},
    {nome:"Comprovante bancario",arquivo:`banco_${e.id}.pdf`,status:e.status==="Suspenso"?"Pendente":"Em analise",obrigatorio:true,enviado:"30/04/2026",responsavel:"Financeiro"},
  ];
  const pendentes=companies.filter(c=>c.status!=="Aprovado"&&c.status!=="Reprovado");
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Verificações <span style={{color:"var(--amber)"}}>Empresariais</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{pendentes.length} empresas aguardando análise</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
        <Stat label="Aguardando" value={pendentes.length} sub="verificação" icon={Clock} color="var(--orange)"/>
        <Stat label="Aprovadas" value={companies.filter(c=>c.status==="Aprovado").length} icon={CheckCircle} color="var(--green)"/>
        <Stat label="Reprovadas" value={companies.filter(c=>c.status==="Reprovado").length} icon={X} color="var(--red)"/>
      </div>
      {rejectModal&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setRejectModal(null)}}>
          <div className="modal-box" style={{maxWidth:420,padding:24}}>
            <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Motivo da Rejeição</div>
            <FormField label="Informe o motivo"><textarea rows={3} value={rejectMotivo} onChange={e=>setRejectMotivo(e.target.value)} placeholder="Descreva o motivo da rejeição..."/></FormField>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn variant="ghost" onClick={()=>setRejectModal(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={X} onClick={()=>{rejectCompany(rejectModal,user,rejectMotivo);saveVerificationNote(rejectModal,{status:"Reprovado",reason:rejectMotivo||"Motivo nao informado."});setRejectModal(null);setRejectMotivo("");toast.warning("Empresa reprovada.");}}>Rejeitar empresa</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {companies.map(e=>{
          const note=verificationNotes[e.id]||{};
          const effectiveStatus=note.status||e.status;
          const docs=docsForCompany(e);
          return(
          <Card key={e.id} style={{padding:"18px 22px",opacity:e.status==="Reprovado"?.6:1,borderColor:effectiveStatus==="Reprovado"?"rgba(239,68,68,.35)":effectiveStatus==="Em espera"?"rgba(232,160,32,.35)":"var(--border)"}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:17,fontWeight:700,textTransform:"uppercase"}}>{e.name}</span>
                  <Badge label={e.type} color="var(--blue)"/>
                  <Badge label={effectiveStatus} color={STATUS_COLORS[effectiveStatus]||"var(--amber)"}/>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)"}}>{e.cnpj} · {e.city}</div>
                {(note.reason||e.motivoRejeicao)&&<div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",marginTop:5}}>Motivo: {note.reason||e.motivoRejeicao}</div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:12}}>
                  {docs.map(doc=>(
                    <button key={doc.nome} onClick={()=>setDocViewer(doc)} style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:"9px 10px",textAlign:"left",cursor:"pointer"}}>
                      <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{doc.nome}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                        <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.arquivo}</span>
                        <Badge label={doc.status} color={STATUS_COLORS[doc.status]||"var(--amber)"}/>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(220px,1.4fr)",gap:8,marginTop:10}}>
                  <select value={effectiveStatus} onChange={ev=>saveVerificationNote(e.id,{status:ev.target.value})} style={{fontSize:10}}>
                    {["Aprovado","Em analise","Em espera","Suspenso","Reprovado"].map(s=><option key={s}>{s}</option>)}
                  </select>
                  <input value={note.reason||""} onChange={ev=>saveVerificationNote(e.id,{reason:ev.target.value})} placeholder="Motivo, documento pendente ou observacao da analise" style={{fontSize:11}}/>
                </div>
                {note.updatedAt&&<div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:6}}>Ultima acao: {note.updatedBy} · {note.updatedAt}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr",gap:7,flexShrink:0,minWidth:132}}>
                <Btn small variant="ghost" icon={Eye} onClick={()=>setDocViewer({nome:`Documentos · ${e.name}`,arquivo:"docs_empresa.pdf",status:e.status,obrigatorio:true,enviado:"29/04/2026"})}>Ver docs</Btn>
                <Btn small variant="green" icon={Check} disabled={effectiveStatus==="Aprovado"} onClick={()=>{approveCompany(e.id,user);saveVerificationNote(e.id,{status:"Aprovado",reason:"Documentos aprovados e cadastro liberado."});toast.success(`${e.name} aprovada!`);}}>Aprovar</Btn>
                <Btn small variant="ghost" icon={Clock} disabled={effectiveStatus==="Em espera"} onClick={()=>{saveVerificationNote(e.id,{status:"Em espera",reason:"Aguardando documento complementar ou validacao externa."});toast.info(`${e.name} colocada em espera.`);}}>Em espera</Btn>
                <Btn small variant="danger" icon={X} disabled={effectiveStatus==="Reprovado"} onClick={()=>{setRejectModal(e.id);setRejectMotivo(note.reason||"");}}>Rejeitar</Btn>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
      <DocViewerModal open={!!docViewer} onClose={()=>setDocViewer(null)} doc={docViewer}/>
    </div>
  );
}

// ─── LISTA DE DEMANDAS ────────────────────────────────────────────────────────
function ListaDemandas({setPage,fornecedor,searchProp=""}){
  const {demands}=useApp();
  const [search,setSearch]=useState(searchProp);
  const [filterUrg,setFilterUrg]=useState("");
  const [filterStatus,setFilterStatus]=useState("");
  const [filterNDA,setFilterNDA]=useState("");
  const [detalhes,setDetalhes]=useState(null);
  const filtered=demands.filter(d=>{
    if(search&&!d.title?.toLowerCase().includes(search.toLowerCase())&&!d.process?.toLowerCase().includes(search.toLowerCase())&&!d.id?.includes(search)) return false;
    if(filterUrg&&d.urgency!==filterUrg) return false;
    if(filterStatus&&d.status!==filterStatus) return false;
    if(filterNDA==="sim"&&!d.nda) return false;
    if(filterNDA==="nao"&&d.nda) return false;
    return true;
  });
  if(detalhes) return <DetalhesDemanda demand={detalhes} onBack={()=>setDetalhes(null)} onComparar={()=>{setDetalhes(null);setPage&&setPage("comparar");}} fornecedor={fornecedor}/>;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>{fornecedor?"Oportunidades":"Minhas Demandas"} <span style={{color:"var(--amber)"}}>Disponíveis</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{filtered.length} de {demands.length} demandas</div>
        </div>
        {!fornecedor&&<Btn icon={Plus} onClick={()=>setPage&&setPage("nova-demanda")}>Nova Demanda</Btn>}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:360}}>
          <Search size={12} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--white3)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, processo ou ID..." style={{paddingLeft:34}}/>
        </div>
        <select value={filterUrg} onChange={e=>setFilterUrg(e.target.value)} style={{width:"auto",minWidth:130}}>
          <option value="">Urgência</option>
          {["Baixa","Média","Alta","Crítica"].map(u=><option key={u}>{u}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{width:"auto",minWidth:160}}>
          <option value="">Status</option>
          {["Publicado","Em cotação","Em negociação","Contratado"].map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={filterNDA} onChange={e=>setFilterNDA(e.target.value)} style={{width:"auto",minWidth:120}}>
          <option value="">NDA</option>
          <option value="sim">Com NDA</option>
          <option value="nao">Sem NDA</option>
        </select>
        {(filterUrg||filterStatus||filterNDA)&&<button onClick={()=>{setFilterUrg("");setFilterStatus("");setFilterNDA("");}} style={{fontFamily:"var(--mono)",fontSize:9,background:"transparent",border:"none",color:"var(--red)",cursor:"pointer"}}>Limpar</button>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<Card style={{padding:0}}><EmptyState
          icon={<ClipboardList size={48}/>}
          title="Nenhuma demanda encontrada"
          message={filterUrg||filterStatus||filterNDA?"Tente ajustar os filtros acima.":"Quando uma demanda for publicada e bater com seu perfil, ela aparecerá aqui."}
        /></Card>}
        {filtered.map(d=>(
          <Card key={d.id} style={{padding:"18px 22px",cursor:"pointer",transition:"border-color .2s"}} onClick={()=>setDetalhes(d)}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(232,160,32,.3)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{d.id}</span>
                  <Badge label={d.urgency} color={URG_COLORS[d.urgency]}/>
                  <Badge label={d.status} color={STATUS_COLORS[d.status]||"var(--white2)"}/>
                  {d.nda&&<Badge label="🔒 NDA" color="var(--purple)"/>}
                  {d.cert&&d.cert!=="Nenhuma"&&<Badge label={d.cert} color="var(--blue)"/>}
                </div>
                <div style={{fontFamily:"var(--cond)",fontSize:17,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>{d.title}</div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[[Wrench,d.process],[Layers,d.material],[Package,d.qty],[MapPin,d.location],[Clock,d.deadline],[DollarSign,d.budget]].filter(([,t])=>t).map(([Icon,text])=>(
                    <span key={text} style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",display:"flex",alignItems:"center",gap:4}}><Icon size={10}/>{text}</span>
                  ))}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <div style={{fontFamily:"var(--cond)",fontSize:26,fontWeight:800,color:"var(--amber)"}}>{d.proposals||0}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Propostas</div>
                <div style={{display:"flex",gap:5,flexDirection:"column"}}>
                  <Btn small variant="ghost" onClick={()=>setDetalhes(d)}>Ver detalhes</Btn>
                  {!fornecedor&&(d.proposals||0)>1&&<Btn small onClick={()=>setPage&&setPage("comparar")}>Comparar</Btn>}
                  {fornecedor&&d.status==="Publicado"&&<Btn small onClick={()=>setDetalhes(d)}>Enviar proposta</Btn>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── DETALHES DEMANDA ─────────────────────────────────────────────────────────
function DetalhesDemanda({demand,onBack,onComparar,fornecedor}){
  const {ndas,demands}=useApp();
  const {user}=useAuth();
  const [showProposta,setShowProposta]=useState(false);
  const d=demands.find(x=>x.id===demand?.id)||demand;
  if(!d) return null;
  if(showProposta) return <EnviarProposta demand={d} onBack={()=>setShowProposta(false)}/>;
  const ndaSigned=ndas.some(n=>n.demanda===d.id&&n.contraparte===user?.company);
  return(
    <div>
      <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:24}}>
        <button onClick={onBack} style={{background:"transparent",border:"1px solid var(--border)",padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",flexShrink:0}}>← Voltar</button>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{d.id}</span>
            <Badge label={d.urgency} color={URG_COLORS[d.urgency]}/>
            <Badge label={d.status} color={STATUS_COLORS[d.status]||"var(--amber)"}/>
            {d.nda&&<Badge label="🔒 NDA Exigido" color="var(--purple)"/>}
            {d.cert&&d.cert!=="Nenhuma"&&<Badge label={d.cert} color="var(--blue)"/>}
          </div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:28,fontWeight:800,textTransform:"uppercase",marginBottom:4}}>{d.title}</h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)"}}>Publicado em {d.created||"—"} · {d.proposals||0} propostas recebidas</div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          {!fornecedor&&(d.proposals||0)>1&&<Btn variant="ghost" icon={BarChart2} onClick={onComparar}>Comparar propostas</Btn>}
          {fornecedor&&d.status==="Publicado"&&<Btn icon={Send} onClick={()=>{if(d.nda&&!ndaSigned){toast.warning("Assine o NDA antes de enviar proposta.");}else{setShowProposta(true);}}}>Enviar Proposta</Btn>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Especificação Técnica</div>
            {[["Processo",d.process],["Material",d.material],["Quantidade",d.qty],["Dimensões",d.dims||"—"],["Tolerâncias",d.tolerance||"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500}}>{v||"—"}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Condições Comerciais</div>
            {[["Orçamento",d.budget],["Prazo",d.deadline],["Urgência",d.urgency],["Local de entrega",d.location],["Certificação exigida",d.cert||"Não"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500}}>{v||"—"}</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Arquivos Técnicos</div>
            {d.nda&&!ndaSigned?(
              <div style={{padding:"16px",background:"rgba(168,85,247,.08)",border:"1px solid rgba(168,85,247,.3)",textAlign:"center"}}>
                <Lock size={24} color="var(--purple)" style={{margin:"0 auto 8px"}}/>
                <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",color:"var(--purple)",marginBottom:4}}>Arquivos bloqueados</div>
                <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",marginBottom:12}}>Esta demanda exige NDA antes de liberar os arquivos técnicos.</div>
                {fornecedor&&<Btn variant="purple" icon={FileSignature} small onClick={()=>toast.info("Acesse NDA & Contratos para assinar.")}>Assinar NDA para desbloquear</Btn>}
              </div>
            ):(
              [["desenho_tecnico_v2.PDF","1.2 MB","Desenho técnico"],["modelo_3d_peca.STEP","8.4 MB","Modelo 3D"],["especificacao_material.PDF","0.4 MB","Especificação"]].map(([n,s,t])=>(
                <div key={n} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                  <FileText size={13} color="var(--amber)"/>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white)"}}>{n}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>{t} · {s}</div>
                  </div>
                  <button onClick={()=>toast.success(`Download de ${n} iniciado.`)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"4px 8px",cursor:"pointer"}}>Baixar</button>
                </div>
              ))
            )}
          </Card>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:12}}>Requisitos Adicionais</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Badge label={d.nda?"🔒 NDA obrigatório":"Sem NDA"} color={d.nda?"var(--purple)":"var(--white3)"}/>
              <Badge label={d.cert&&d.cert!=="Nenhuma"?`✓ ${d.cert} exigida`:"Sem certificação exigida"} color={d.cert&&d.cert!=="Nenhuma"?"var(--blue)":"var(--white3)"}/>
            </div>
          </Card>
          {d.obs&&<Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Observações</div>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.65}}>{d.obs}</div>
          </Card>}
        </div>
      </div>
    </div>
  );
}

// ─── ENVIAR PROPOSTA ──────────────────────────────────────────────────────────
function EnviarProposta({demand,onBack}){
  const {sendProposal}=useApp();
  const {user}=useAuth();
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({preco:"",prazo:"",inicio:"",frete:"",pagamento:"30 dias",cert:"ISO 9001",obs:"",maquina:"",turno:"Tarde",capacidade:""});
  const [quoteFile,setQuoteFile]=useState(null);
  const up=k=>e=>setForm(f=>({...f,[k]:typeof e==="string"?e:e.target.value}));
  const score=Math.floor(75+Math.random()*20);
  const submit=()=>{
    if(!form.preco||!form.prazo){toast.error("Preencha preço e prazo.");return;}
    sendProposal({demandId:demand.id,total:`R$ ${form.preco}`,gross:parseFloat(form.preco)||0,unit:`R$ ${Math.round(parseInt(form.preco)/(parseInt(demand.qty)||1))}`,days:parseInt(form.prazo),start:form.inicio,frete:`R$ ${form.frete||0}`,payment:form.pagamento,cert:form.cert,obs:form.obs,score,risk:"Baixo",riskFactors:[],rating:4.8,file:quoteFile},user);
    toast.success(`Proposta enviada para ${demand.id}!`);
    onBack();
  };
  return(
    <div style={{maxWidth:680}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>← Voltar</button>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:28,fontWeight:800,textTransform:"uppercase"}}>Enviar <span style={{color:"var(--amber)"}}>Proposta</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{demand.id} · {demand.title?.substring(0,50)}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid var(--border)"}}>
        {["Precificação","Capacidade","Revisão"].map((s,i)=>(
          <div key={s} style={{flex:1,padding:"11px 8px",background:step===i+1?"var(--amber-dim2)":step>i+1?"rgba(34,197,94,.05)":"var(--bg2)",borderRight:i<2?"1px solid var(--border)":"none",textAlign:"center",borderBottom:step===i+1?"2px solid var(--amber)":"2px solid transparent",cursor:step>i+1?"pointer":"default"}} onClick={()=>step>i+1&&setStep(i+1)}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:step===i+1?"var(--amber)":step>i+1?"var(--green)":"var(--white3)"}}>{step>i+1?"✓ ":""}{s}</div>
          </div>
        ))}
      </div>
      {step===1&&<Card style={{padding:28}}>
        <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Precificação & Condições Comerciais</div>
        <div style={{padding:"12px 16px",background:"var(--bg3)",border:"1px solid var(--border)",marginBottom:18}}>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",marginBottom:3}}>{demand.id}</div>
          <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>{demand.title}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",marginTop:4}}>{demand.process} · {demand.material} · {demand.qty} · {demand.budget}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FormField label="Preço total (R$) *"><input type="number" min="0" value={form.preco} onChange={up("preco")} placeholder="Ex: 25000"/></FormField>
          <FormField label="Prazo de entrega (dias) *"><input type="number" min="1" value={form.prazo} onChange={up("prazo")} placeholder="Ex: 14"/></FormField>
          <FormField label="Data de início possível"><input type="date" value={form.inicio} onChange={up("inicio")}/></FormField>
          <FormField label="Frete estimado (R$)"><input type="number" min="0" value={form.frete} onChange={up("frete")} placeholder="Ex: 800"/></FormField>
          <FormField label="Condição de pagamento"><select value={form.pagamento} onChange={up("pagamento")}>{["À vista","7 dias","14 dias","30 dias","50% adiantado","60 dias"].map(o=><option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Certificação disponível"><select value={form.cert} onChange={up("cert")}>{["Nenhuma","ISO 9001","ISO 9001 + IATF","ANVISA","AS9100"].map(o=><option key={o}>{o}</option>)}</select></FormField>
        </div>
        <FormField label="Observações técnicas"><textarea value={form.obs} onChange={up("obs")} rows={3} placeholder="Descreva diferenciais técnicos ou restrições..."/></FormField>
        <FormField label="PDF da cotacao detalhada"><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e=>setQuoteFile(e.target.files?.[0]||null)}/></FormField>
        <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{if(!form.preco||!form.prazo){toast.error("Preencha preço e prazo.");return;}setStep(2);}}>Próximo →</Btn></div>
      </Card>}
      {step===2&&<Card style={{padding:28}}>
        <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Capacidade Disponível</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FormField label="Máquina que será utilizada"><input value={form.maquina} onChange={up("maquina")} placeholder="Ex: Torno CNC Romi Centur 30D"/></FormField>
          <FormField label="Turno de produção"><select value={form.turno} onChange={up("turno")}>{["Manhã","Tarde","Noite","Manhã + Tarde","3 Turnos"].map(o=><option key={o}>{o}</option>)}</select></FormField>
        </div>
        <FormField label="Capacidade técnica para esta demanda"><textarea value={form.capacidade} onChange={up("capacidade")} rows={3} placeholder="Ex: Tolerância ±0,03mm. Ø máx. 300mm."/></FormField>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
          <Btn variant="ghost" onClick={()=>setStep(1)}>← Voltar</Btn>
          <Btn onClick={()=>setStep(3)}>Próximo →</Btn>
        </div>
      </Card>}
      {step===3&&<Card style={{padding:28}}>
        <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Revisão da Proposta</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[["Preço total",`R$ ${form.preco}`],["Prazo",`${form.prazo} dias`],["Início",form.inicio||"A combinar"],["Frete",form.frete?`R$ ${form.frete}`:"—"],["Pagamento",form.pagamento],["Certificação",form.cert]].map(([k,v])=>(
            <div key={k} style={{padding:"10px 14px",background:"var(--bg3)"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
              <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{padding:"12px 16px",background:"var(--amber-dim)",border:"1px solid rgba(232,160,32,.3)",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <Target size={18} color="var(--amber)"/>
          <div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".08em",textTransform:"uppercase"}}>Score de compatibilidade estimado</div>
            <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:900,color:"var(--amber)"}}>{score}/100</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <Btn variant="ghost" onClick={()=>setStep(2)}>← Voltar</Btn>
          <Btn icon={Send} onClick={submit}>Enviar Proposta</Btn>
        </div>
      </Card>}
    </div>
  );
}

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
const ORDER_ROUTE_SECTIONS=[
  {id:"status",label:"Status",icon:Activity},
  {id:"aprovacoes",label:"Aprovações",icon:UserCheck},
  {id:"atualizacoes",label:"Atualizações",icon:Radio},
  {id:"logistica",label:"Logística",icon:Truck},
  {id:"financeiro",label:"Financeiro",icon:DollarSign},
  {id:"documentos",label:"Documentos",icon:FileText},
];
const ORDER_SECTION_IDS=new Set(ORDER_ROUTE_SECTIONS.map(s=>s.id));
const ORDER_FLOW_STEPS=["Contratado","Em setup","Em produção","Em inspeção","Aguardando coleta","Em transporte","Entregue","Finalizado"];
const ORDER_BACKEND_STATUSES=new Set(ORDER_FLOW_STEPS.concat(["Cancelado"]));
const ORDER_OPERATION_STATUSES=["Contratado","Em setup","Em produção","Em inspeção","Aguardando coleta","Em transporte","Entregue","Finalizado","Em espera","Renegociando","Cancelado"];
const ORDER_SECTOR_APPROVALS=[
  {id:"engenharia",label:"Engenharia",owner:"Lider tecnico",color:"#22D3EE"},
  {id:"logistica",label:"Logistica",owner:"Coordenacao logistica",color:"#60A5FA"},
  {id:"comercial",label:"Comercial",owner:"Inside sales",color:"var(--amber)"},
  {id:"manutencao",label:"Manutencao",owner:"PCM",color:"var(--orange)"},
  {id:"gerencia",label:"Gerencia",owner:"Gestao",color:"var(--green)"},
];
function nowPtBr(){
  return new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function pctForOrderStatus(status,current=0){
  const map={"Contratado":5,"Em setup":15,"Em produção":50,"Em inspeção":85,"Aguardando coleta":100,"Em transporte":100,"Entregue":100,"Finalizado":100,"Cancelado":current};
  return map[status]??current;
}
function orderRouteFromPath(){
  const parts=window.location.pathname.split("/").filter(Boolean);
  if(parts[0]!=="pedidos") return {id:null,section:"status"};
  const id=parts[1]?decodeURIComponent(parts[1]):null;
  const section=parts[2]&&ORDER_SECTION_IDS.has(parts[2])?parts[2]:"status";
  return {id,section};
}
function orderPath(id,section="status"){
  if(!id) return "/pedidos";
  const suffix=section&&section!=="status"?`/${section}`:"";
  return `/pedidos/${encodeURIComponent(id)}${suffix}`;
}

function Pedidos({userType}){
  const {orders,transactions,contracts,demands,updateOrderStatus,openDispute}=useApp();
  const {user}=useAuth();
  const initialRoute=orderRouteFromPath();
  const [sel,setSel]=useState(initialRoute.id);
  const [activeSection,setActiveSection]=useState(initialRoute.section);
  const [disputeModal,setDisputeModal]=useState(false);
  const [disputeForm,setDisputeForm]=useState({type:"Qualidade",desc:"",impact:"Médio",file:null});
  const [orderOps,setOrderOps]=useState(()=>DB.get("order_operation_log")||{});
  const [statusDraft,setStatusDraft]=useState({sector:"engenharia",status:"Em inspeção",comment:""});
  const selOrder=(sel&&orders.find(o=>o.id===sel))||orders[0]||null;
  const selectedDemand=selOrder?.demand_id?demands.find(d=>d.id===selOrder.demand_id):null;
  const selectedContract=contracts.find(c=>(c.order_id||c.pedido||c.order)===selOrder?.id);
  const selectedTransaction=transactions.find(t=>(t.order||t.order_id)===selOrder?.id);
  const STATUS_NEXT={"Contratado":"Em setup","Em setup":"Em produção","Em produção":"Em inspeção","Em inspeção":"Aguardando coleta","Aguardando coleta":"Em transporte","Em transporte":"Entregue","Entregue":"Finalizado"};
  const getOrderOps=(order=selOrder)=>{
    if(!order) return [];
    const saved=orderOps[order.id]||[];
    if(saved.length) return saved;
    return [
      {id:`seed-${order.id}-gerencia`,sector:"gerencia",status:order.status,approved:true,by:"Sistema",at:"01/05/2026 16:00",comment:"Contrato assinado e ordem aberta."},
      {id:`seed-${order.id}-engenharia`,sector:"engenharia",status:order.status,approved:order.pct>=50,by:"Engenharia",at:"02/05/2026 08:45",comment:"Setup e requisitos tecnicos conferidos."},
    ];
  };
  const saveOrderOperation=(entry)=>{
    if(!selOrder) return;
    const next={...orderOps,[selOrder.id]:[entry,...getOrderOps(selOrder).filter(x=>!String(x.id).startsWith("seed-"))]};
    setOrderOps(next);
    DB.set("order_operation_log",next);
  };
  const registerOrderOperation=(approve=false,sectorOverride=null)=>{
    if(!selOrder) return;
    const sector=ORDER_SECTOR_APPROVALS.find(s=>s.id===(sectorOverride||statusDraft.sector))||ORDER_SECTOR_APPROVALS[0];
    const entry={id:`op-${Date.now()}`,sector:sector.id,status:approve?"Aprovado pelo setor":statusDraft.status,approved:approve,by:user?.name||"Admin CapaCity",at:nowPtBr(),comment:statusDraft.comment||`${sector.label} registrou acompanhamento do pedido.`};
    saveOrderOperation(entry);
    if(!approve&&ORDER_BACKEND_STATUSES.has(statusDraft.status)){
      updateOrderStatus(selOrder.id,statusDraft.status,pctForOrderStatus(statusDraft.status,selOrder.pct),user);
    }
    toast.success(approve?`${sector.label} aprovou ${selOrder.id}.`:`Status operacional registrado em ${selOrder.id}.`);
    setStatusDraft(d=>({...d,comment:""}));
  };
  const latestSectorEntry=(sectorId)=>getOrderOps(selOrder).find(op=>op.sector===sectorId);
  const navigateOrder=(id,section=activeSection)=>{
    setSel(id);
    setActiveSection(section);
    const nextPath=orderPath(id,section);
    if(window.location.pathname!==nextPath) window.history.pushState({}, "", nextPath);
  };
  useEffect(()=>{
    const sync=()=>{
      const route=orderRouteFromPath();
      if(window.location.pathname.startsWith("/pedidos")){
        setSel(route.id);
        setActiveSection(route.section);
      }
    };
    window.addEventListener("popstate", sync);
    return()=>window.removeEventListener("popstate", sync);
  },[]);
  useEffect(()=>{
    if(!orders.length) return;
    const route=orderRouteFromPath();
    if(route.id&&orders.some(o=>o.id===route.id)){
      setSel(route.id);
      setActiveSection(route.section);
    }else if(!sel){
      setSel(orders[0].id);
    }
  },[orders.length]);
  const advanceStatus=(o)=>{
    const next=STATUS_NEXT[o.status]; if(!next) return;
    const pctMap={"Em setup":15,"Em produção":50,"Em inspeção":85,"Aguardando coleta":100,"Em transporte":100,"Entregue":100,"Finalizado":100};
    updateOrderStatus(o.id,next,pctMap[next]||o.pct,user);
    toast.info(`Status atualizado: ${next}`);
  };
  const stepIdx=ORDER_FLOW_STEPS.indexOf(selOrder?.status||"");
  const orderUpdates=[
    ["Agora",`${selOrder?.status||"Status"} registrado no caminho operacional.`,activeSection==="status"?"●":"✓"],
    ["03/05 13:20",`${selOrder?.pct||0}% concluído. Lote liberado para a próxima área.`,"✓"],
    ["02/05 08:45","Setup finalizado. Produção iniciada.","⚙"],
    ["01/05 16:00","Contrato assinado. MP recebida e conferida.","□"],
  ];
  const approvalUpdates=getOrderOps(selOrder);
  const panelBox={border:"1px solid var(--border)",background:"var(--bg3)",padding:"12px 14px"};
  const renderSection=()=>{
    if(!selOrder) return null;
    if(activeSection==="atualizacoes") return(
      <Card style={{padding:"18px 22px"}}>
        <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase",marginBottom:10}}>Atualizações em tempo real</div>
        {orderUpdates.map(([t,tx,ic])=>(
          <div key={`${t}-${tx}`} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
            <div style={{width:24,height:24,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,color:"var(--amber)"}}>{ic}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",lineHeight:1.5}}>{tx}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:2}}>{t}</div>
            </div>
          </div>
        ))}
        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",margin:"14px 0 6px"}}>Aprovacoes e responsaveis por setor</div>
        {approvalUpdates.map(op=>{
          const sector=ORDER_SECTOR_APPROVALS.find(s=>s.id===op.sector);
          return(
            <div key={op.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 160px",gap:10,padding:"10px 0",borderTop:"1px solid var(--border)",alignItems:"center"}}>
              <Badge label={sector?.label||op.sector} color={sector?.color||"var(--amber)"}/>
              <div>
                <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",lineHeight:1.45}}>{op.comment}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:2}}>{op.status}</div>
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textAlign:"right"}}>{op.by}<br/>{op.at}</div>
            </div>
          );
        })}
      </Card>
    );
    if(activeSection==="aprovacoes") return(
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(320px,.8fr)",gap:12,alignItems:"start"}}>
        <Card style={{padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
            <div>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Aprovacao individual por setor</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3}}>responsavel, horario e decisao ficam registrados por area</div>
            </div>
            <Badge label={`${ORDER_SECTOR_APPROVALS.filter(s=>latestSectorEntry(s.id)?.approved).length}/${ORDER_SECTOR_APPROVALS.length} aprovadas`} color="var(--green)"/>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,.06)",marginBottom:14}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,var(--green),var(--amber))",width:`${Math.round(ORDER_SECTOR_APPROVALS.filter(s=>latestSectorEntry(s.id)?.approved).length/ORDER_SECTOR_APPROVALS.length*100)}%`}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
            {ORDER_SECTOR_APPROVALS.map(sector=>{
              const last=latestSectorEntry(sector.id);
              const approved=!!last?.approved;
              return(
                <div key={sector.id} style={{...panelBox,borderColor:approved?"rgba(34,197,94,.35)":"var(--border)",background:approved?"rgba(34,197,94,.045)":"var(--bg3)",borderTop:`3px solid ${approved?"var(--green)":sector.color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:8}}>
                    <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase",color:sector.color}}>{sector.label}</div>
                    <Badge label={approved?"Aprovado pelo setor":"Aguardando aprovação"} color={approved?"var(--green)":"var(--amber)"}/>
                  </div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textTransform:"uppercase",marginBottom:6}}>{sector.owner}</div>
                  <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",lineHeight:1.5,minHeight:36}}>{last?.comment||"Pendente de comentario e aprovacao do responsavel."}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:8}}>{last?.by||"Sem responsavel"} {last?.at?`· ${last.at}`:""}</div>
                  <button onClick={()=>registerOrderOperation(true,sector.id)} style={{marginTop:10,border:"1px solid rgba(34,197,94,.35)",background:"rgba(34,197,94,.08)",color:"var(--green)",padding:"7px 9px",fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer"}}>Aprovar setor</button>
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{padding:"18px 22px"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase",marginBottom:12}}>Registrar status operacional</div>
          <FormField label="Setor responsavel">
            <select value={statusDraft.sector} onChange={e=>setStatusDraft(d=>({...d,sector:e.target.value}))}>{ORDER_SECTOR_APPROVALS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </FormField>
          <FormField label="Status da operacao">
            <select value={statusDraft.status} onChange={e=>setStatusDraft(d=>({...d,status:e.target.value}))}>{ORDER_OPERATION_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          </FormField>
          <FormField label="Comentario / justificativa">
            <textarea rows={4} value={statusDraft.comment} onChange={e=>setStatusDraft(d=>({...d,comment:e.target.value}))} placeholder="Explique quem aprovou, pendencia, motivo ou proxima acao."/>
          </FormField>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn small variant="ghost" onClick={()=>registerOrderOperation(false)}>Registrar status</Btn>
            <Btn small variant="green" icon={Check} onClick={()=>registerOrderOperation(true)}>Aprovar setor</Btn>
          </div>
        </Card>
      </div>
    );
    if(activeSection==="logistica") return(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
          {[["Coleta",selOrder.status==="Aguardando coleta"?"Pronta":"Planejada","janela operacional"],["Entrega",selOrder.deadline||"—","prazo contratado"],["Risco",selOrder.pct>=85?"Baixo":"Médio","SLA logístico"]].map(([a,b,c])=>(
            <div key={a} style={panelBox}><div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{a}</div><div style={{fontFamily:"var(--cond)",fontSize:24,fontWeight:900,color:a==="Risco"&&b==="Baixo"?"var(--green)":"var(--amber)"}}>{b}</div><div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{c}</div></div>
          ))}
        </div>
        <Card style={{padding:"18px 22px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {["Separação e embalagem","Agendamento de coleta","Emissão fiscal","Rastreamento de transporte"].map((item,i)=>(
              <div key={item} style={panelBox}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:i<=Math.max(stepIdx-3,0)?"var(--green)":"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>{i<=Math.max(stepIdx-3,0)?"Liberado":"Pendente"}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase",marginTop:4}}>{item}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
    if(activeSection==="financeiro") return(
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
        {[["Pedido",selOrder.value||"—","valor contratado"],["Transação",selectedTransaction?.status||"Sem vínculo",selectedTransaction?.id||"aguardando checkout"],["Contrato",selectedContract?.status||"Pendente",selectedContract?.id||"geração automática"]].map(([a,b,c])=>(
          <div key={a} style={panelBox}><div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{a}</div><div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:900,color:a==="Pedido"?"var(--green)":"var(--amber)"}}>{b}</div><div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{c}</div></div>
        ))}
      </div>
    );
    if(activeSection==="documentos"){
      const docs=[
        {name:"Contrato digital",status:selectedContract?.status||"Aguardando assinatura",ref:selectedContract?.id||selOrder.id,owner:"Gerencia",date:selectedContract?.gerado||"01/05/2026",icon:FileSignature},
        {name:"Ordem de producao",status:selOrder.status,ref:"OP-"+selOrder.id.replace("PD-",""),owner:"Engenharia",date:"02/05/2026",icon:ClipboardList},
        {name:"Laudo de qualidade",status:selOrder.pct>=85?"Em revisao":"Pendente",ref:"QA-"+selOrder.id.replace("PD-",""),owner:"Qualidade",date:selOrder.pct>=85?"17/05/2026":"Aguardando",icon:FileCheck},
        {name:"Nota fiscal",status:selOrder.status==="Entregue"||selOrder.status==="Finalizado"?"Emitida":"Aguardando entrega",ref:"NF-"+selOrder.id.replace("PD-",""),owner:"Logistica",date:selOrder.status==="Entregue"?"20/05/2026":"Pendente",icon:FileText},
      ];
      return(
        <Card style={{padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
            <div>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Documentos do pedido</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3}}>contrato, ordem, qualidade e fiscal com responsavel e acao</div>
            </div>
            <Badge label={`${selOrder.id} · trilha documental`} color="var(--amber)"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
            {docs.map(doc=>{
              const Icon=doc.icon;
              const done=["Assinado","Emitida","Finalizado","Entregue"].includes(doc.status);
              return(
                <div key={doc.name} style={{...panelBox,display:"flex",flexDirection:"column",gap:12,borderTop:`3px solid ${done?"var(--green)":STATUS_COLORS[doc.status]||"var(--amber)"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:34,height:34,background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon size={16} color="var(--amber)"/>
                      </div>
                      <div>
                        <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>{doc.name}</div>
                        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:2}}>{doc.ref}</div>
                      </div>
                    </div>
                    <Badge label={doc.status} color={STATUS_COLORS[doc.status]||"var(--amber)"}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["Responsavel",doc.owner],["Data",doc.date]].map(([label,value])=>(
                      <div key={label} style={{background:"rgba(255,255,255,.025)",border:"1px solid var(--border)",padding:"8px 10px"}}>
                        <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textTransform:"uppercase"}}>{label}</div>
                        <div style={{fontFamily:"var(--body)",fontSize:12,color:"var(--white2)",marginTop:2}}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <Btn small variant="ghost" icon={Eye} onClick={()=>toast.info(`Visualizando ${doc.ref}`)}>Ver</Btn>
                    <Btn small variant="ghost" icon={Download} onClick={()=>toast.success(`Download de ${doc.ref} iniciado.`)}>Baixar</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      );
    }
    if(activeSection==="documentos") return(
      <Card style={{padding:"18px 22px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
          {[
            ["Contrato digital",selectedContract?.status||"Aguardando assinatura",selectedContract?.id||selOrder.id],
            ["Ordem de produção",selOrder.status,"OP-"+selOrder.id.replace("PD-","")],
            ["Laudo de qualidade",selOrder.pct>=85?"Em revisão":"Pendente","QA-"+selOrder.id.replace("PD-","")],
            ["Nota fiscal",selOrder.status==="Entregue"||selOrder.status==="Finalizado"?"Emitida":"Aguardando entrega","NF-"+selOrder.id.replace("PD-","")],
          ].map(([name,status,ref])=>(
            <div key={name} style={{...panelBox,display:"flex",justifyContent:"space-between",gap:12}}>
              <div>
                <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase"}}>{name}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:3}}>{ref}</div>
              </div>
              <Badge label={status} color={status==="Pendente"?"var(--amber)":"var(--green)"}/>
            </div>
          ))}
        </div>
      </Card>
    );
    return(
      <Card style={{padding:"20px 24px"}}>
        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>Status da produção</div>
        {ORDER_FLOW_STEPS.map((s,i)=>{
          const done=i<=stepIdx; const active=i===stepIdx+1;
          return(
            <div key={s} style={{display:"flex",gap:12,paddingBottom:i<ORDER_FLOW_STEPS.length-1?10:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:done?"var(--green)":active?"var(--amber)":"var(--bg4)",border:`1px solid ${done?"var(--green)":active?"var(--amber)":"var(--border2)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {done&&<Check size={9} color="var(--bg)"/>}
                </div>
                {i<ORDER_FLOW_STEPS.length-1&&<div style={{width:1,height:10,background:done?"var(--green)":"var(--border)",marginTop:1}}/>}
              </div>
              <div style={{paddingTop:1}}>
                <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:done||active?600:400,textTransform:"uppercase",color:done?"var(--green)":active?"var(--amber)":"var(--white3)"}}>{s}</div>
              </div>
            </div>
          );
        })}
      </Card>
    );
  };
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Gestão de <span style={{color:"var(--amber)"}}>Pedidos</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{orders.filter(o=>o.pct<100).length} em andamento · rota {selOrder?orderPath(selOrder.id,activeSection):"/pedidos"}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(280px,.9fr) minmax(0,1.5fr)",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {orders.map(o=>(
            <Card key={o.id} style={{padding:"14px 18px",cursor:"pointer",borderColor:selOrder?.id===o.id?"rgba(232,160,32,.4)":"var(--border)"}} onClick={()=>navigateOrder(o.id,"status")}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{o.id}</span>
                <Badge label={o.status} color={STATUS_COLORS[o.status]||"var(--amber)"}/>
              </div>
              <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{o.product}</div>
              <div style={{background:"rgba(255,255,255,.05)",height:4,marginBottom:3}}>
                <div style={{height:"100%",background:o.pct===100?"var(--green)":"var(--amber)",width:`${o.pct}%`}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{o.pct}%</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--green)"}}>{o.value}</span>
              </div>
            </Card>
          ))}
          {!orders.length&&<EmptyState icon={Package} title="Nenhum pedido encontrado" description="Quando uma proposta for aceita, o caminho completo do pedido aparece aqui."/>}
        </div>
        {selOrder&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:"20px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",marginBottom:3}}>{selOrder.id}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,textTransform:"uppercase"}}>{selOrder.product}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:2}}>{selOrder.client}{selectedDemand?.id?` · ${selectedDemand.id}`:""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"var(--cond)",fontSize:26,fontWeight:800,color:"var(--green)"}}>{selOrder.value}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>Entrega: {selOrder.deadline}</div>
                <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-end"}}>
                  {STATUS_NEXT[selOrder.status]&&<Btn small variant="ghost" onClick={()=>advanceStatus(selOrder)}>Avançar →</Btn>}
                  {userType!=="admin"&&selOrder.pct<100&&<Btn small variant="danger" icon={AlertTriangle} onClick={()=>setDisputeModal(true)}>Abrir disputa</Btn>}
                </div>
              </div>
            </div>
          </Card>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ORDER_ROUTE_SECTIONS.map(section=>{
              const Icon=section.icon;
              const active=activeSection===section.id;
              return(
                <button key={section.id} onClick={()=>navigateOrder(selOrder.id,section.id)} style={{display:"inline-flex",alignItems:"center",gap:6,border:`1px solid ${active?"rgba(232,160,32,.55)":"var(--border)"}`,background:active?"var(--amber-dim2)":"var(--bg2)",color:active?"var(--amber)":"var(--white2)",padding:"8px 10px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer"}}>
                  <Icon size={12}/>{section.label}
                </button>
              );
            })}
          </div>
          {renderSection()}
        </div>}
      </div>
      <Modal open={disputeModal} onClose={()=>setDisputeModal(false)} title={`Abrir Disputa · ${selOrder?.id}`}>
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
          <AlertTriangle size={16} color="var(--red)"/>
          <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>Uma disputa notifica a outra parte e entra em mediação pelo admin.</span>
        </div>
        <FormField label="Tipo de problema">
          <select value={disputeForm.type} onChange={e=>setDisputeForm(f=>({...f,type:e.target.value}))}>{["Qualidade","Atraso","Quantidade","Quebra de confidencialidade","Cancelamento indevido","Acabamento incorreto"].map(t=><option key={t}>{t}</option>)}</select>
        </FormField>
        <FormField label="Impacto">
          <select value={disputeForm.impact} onChange={e=>setDisputeForm(f=>({...f,impact:e.target.value}))}>{["Baixo","Médio","Alto"].map(t=><option key={t}>{t}</option>)}</select>
        </FormField>
        <FormField label="Descrição do problema (obrigatório)">
          <textarea value={disputeForm.desc} onChange={e=>setDisputeForm(f=>({...f,desc:e.target.value}))} rows={4} placeholder="Descreva o problema detalhadamente..."/>
        </FormField>
        <FormField label="Evidência fotográfica ou PDF"><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setDisputeForm(f=>({...f,file:e.target.files?.[0]||null}))}/></FormField>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn variant="ghost" onClick={()=>setDisputeModal(false)}>Cancelar</Btn>
          <Btn variant="danger" icon={AlertTriangle} onClick={()=>{
            if(!disputeForm.desc.trim()){toast.error("Descreva o problema.");return;}
            openDispute({order:selOrder?.id,demandante:selOrder?.client||user?.company,fornecedor:selOrder?.supplier||"Fornecedor",type:disputeForm.type,impact:disputeForm.impact,desc:disputeForm.desc,file:disputeForm.file},user);
            toast.warning("Disputa aberta. O admin irá mediar.");
            setDisputeModal(false);setDisputeForm({type:"Qualidade",desc:"",impact:"Médio",file:null});
          }}>Abrir Disputa</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── CADASTRO MÁQUINAS ────────────────────────────────────────────────────────
function CadastroMaquinas(){
  const {machines,addMachine}=useApp();
  const {user}=useAuth();
  const [showForm,setShowForm]=useState(false);
  const [mForm,setMForm]=useState({name:"",type:"",brand:"",model:"",year:"",cost:"",maxProd:"",turns:[],photoFile:null});
  const mUp=k=>v=>setMForm(f=>({...f,[k]:v}));
  const toggleTurn=(t)=>setMForm(f=>({...f,turns:f.turns.includes(t)?f.turns.filter(x=>x!==t):[...f.turns,t]}));
  const saveMachine=()=>{
    if(!mForm.name||!mForm.type){toast.error("Nome e tipo de processo são obrigatórios.");return;}
    addMachine({...mForm,turns:mForm.turns.join(", ")||"—",cost:`R$ ${mForm.cost||0}/h`,monthly:parseInt(mForm.maxProd)||300},user);
    toast.success(`Máquina ${mForm.name} cadastrada!`);
	    setShowForm(false);setMForm({name:"",type:"",brand:"",model:"",year:"",cost:"",maxProd:"",turns:[],photoFile:null});
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Cadastro de <span style={{color:"var(--amber)"}}>Máquinas</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{machines.length} máquinas · {machines.filter(m=>m.status==="Disponível").length} disponíveis</div>
        </div>
        <Btn icon={Plus} onClick={()=>setShowForm(!showForm)}>{showForm?"Cancelar":"Adicionar"}</Btn>
      </div>
      {showForm&&<Card style={{padding:24,marginBottom:16}}>
        <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:16}}>Nova Máquina</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          <FormField label="Nome / ID *"><input value={mForm.name} onChange={e=>mUp("name")(e.target.value)} placeholder="Ex: Torno CNC Romi 30D"/></FormField>
          <FormField label="Tipo de processo *"><select value={mForm.type} onChange={e=>mUp("type")(e.target.value)}><option value="">Selecione...</option>{["Torneamento","Fresamento","Corte Laser","Soldagem","Injeção","Estamparia","Dobra CNC","Impressão 3D"].map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Marca"><input value={mForm.brand} onChange={e=>mUp("brand")(e.target.value)} placeholder="Ex: Romi"/></FormField>
          <FormField label="Modelo"><input value={mForm.model} onChange={e=>mUp("model")(e.target.value)} placeholder="Ex: Centur 30D"/></FormField>
          <FormField label="Ano de fabricação"><input value={mForm.year} onChange={e=>mUp("year")(e.target.value)} type="number" placeholder="Ex: 2022"/></FormField>
          <FormField label="Custo/hora (R$)"><input value={mForm.cost} onChange={e=>mUp("cost")(e.target.value)} type="number" placeholder="Ex: 180"/></FormField>
        </div>
        <FormField label="Prod. máxima/mês"><input value={mForm.maxProd} onChange={e=>mUp("maxProd")(e.target.value)} placeholder="Ex: 300 horas"/></FormField>        <FormField label="Foto da máquina"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>mUp("photoFile")(e.target.files?.[0]||null)}/></FormField>
        <FormField label="Turnos disponíveis">
          <div style={{display:"flex",gap:12,marginTop:4}}>
            {["Manhã","Tarde","Noite"].map(t=>(
              <label key={t} style={{display:"flex",gap:6,cursor:"pointer",fontFamily:"var(--body)",fontSize:13,color:"var(--white2)"}}>
                <input type="checkbox" checked={mForm.turns.includes(t)} onChange={()=>toggleTurn(t)} style={{width:"auto",accentColor:"var(--amber)"}}/>{t}
              </label>
            ))}
          </div>
        </FormField>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={saveMachine}>Salvar máquina</Btn>
        </div>
      </Card>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {machines.map(m=>(
          <Card key={m.id} style={{padding:"18px 22px"}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,marginBottom:5}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{m.id}</span>
                  <Badge label={m.status} color={m.status==="Disponível"?"var(--green)":m.status==="Parcial"?"var(--orange)":"var(--red)"}/>
                  <Badge label={m.type} color="var(--blue)"/>
                </div>
                <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{m.name}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[[Award,`${m.brand} ${m.model}`],[Calendar,`Ano ${m.year}`],[Clock,m.turns],[DollarSign,m.cost]].map(([Icon,text])=>(
                    <span key={text} style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",display:"flex",alignItems:"center",gap:4}}><Icon size={10}/>{text}</span>
                  ))}
                </div>
              </div>
              <div style={{minWidth:180}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>Ociosidade — {m.idle}%</div>
                <div style={{background:"rgba(255,255,255,.06)",height:6,marginBottom:4}}>
                  <div style={{height:"100%",background:m.idle>50?"var(--orange)":"var(--amber)",width:`${m.idle}%`}}/>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>{m.monthly-m.used}h disponíveis / {m.monthly}h mês</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── CALENDÁRIO DE CAPACIDADE ─────────────────────────────────────────────────
function CalendarioCapacidade(){
  const {machines}=useApp();
  const STATUS_CAL={"Livre":"var(--green)","Parcial":"var(--orange)","Ocupado":"var(--red)","Fechado":"var(--bg4)"};
  const [activeMachine,setActiveMachine]=useState(0);
  const [view,setView]=useState("mensal");
  const YEAR=2026; const MONTH=5;
  const initSlots=()=>({});
  // Convert flat API rows to {day: {turn: status}} shape
  const apiRowsToSlots=(rows)=>{
    const s={};
    (rows||[]).forEach(r=>{if(!s[r.day])s[r.day]={};s[r.day][r.turn]=r.status;});
    return s;
  };
  const [slots,setSlots]=useState(initSlots);
  // Load calendar slots from API when machine changes
  useEffect(()=>{
    const machine=machines[activeMachine];
    if(!machine) return;
    apiGet(`/calendar?machineId=${machine.id}&year=${YEAR}&month=${MONTH}`)
      .then(rows=>setSlots(apiRowsToSlots(rows)));
  },[activeMachine,machines]);
  const switchMachine=(idx)=>setActiveMachine(idx);
  // Persist slot change to API
  const updateSlot=async(machine,day,turn,newStatus)=>{
    await apiFetch("/calendar",{method:"PUT",body:JSON.stringify({slots:[{machine_id:machine.id,year:YEAR,month:MONTH,day,turn,status:newStatus}]})});
  };
  const cycle={"Livre":"Parcial","Parcial":"Ocupado","Ocupado":"Fechado","Fechado":"Livre"};
  const days=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const SEMANA=[{data:"05/05 Seg",dia:5},{data:"06/05 Ter",dia:6},{data:"07/05 Qua",dia:7},{data:"08/05 Qui",dia:8},{data:"09/05 Sex",dia:9},{data:"10/05 Sáb",dia:10}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Calendário <span style={{color:"var(--amber)"}}>de Capacidade</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>MAIO 2026 · Clique em um turno para alterar disponibilidade</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["mensal","Mensal"],["semanal","Semanal"]].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",padding:"7px 14px",border:"1px solid",background:view===k?"var(--amber-dim2)":"transparent",borderColor:view===k?"rgba(232,160,32,.4)":"var(--border)",color:view===k?"var(--amber)":"var(--white3)",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {machines.map((m,i)=>(
          <button key={m.id} onClick={()=>switchMachine(i)} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",padding:"7px 14px",border:"1px solid",background:activeMachine===i?"var(--amber-dim2)":"transparent",borderColor:activeMachine===i?"rgba(232,160,32,.4)":"var(--border)",color:activeMachine===i?"var(--amber)":"var(--white3)",cursor:"pointer"}}>{m.id}</button>
        ))}
        <div style={{display:"flex",gap:10,marginLeft:"auto",alignItems:"center"}}>
          {Object.entries(STATUS_CAL).map(([s,c])=>(
            <div key={s} style={{display:"flex",gap:5,alignItems:"center"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
              <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      {view==="mensal"&&(
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--border)"}}>
            {days.map(d=><div key={d} style={{padding:"9px 0",textAlign:"center",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",color:"var(--white3)",textTransform:"uppercase",borderRight:"1px solid var(--border)"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
            {Array.from({length:28},(_,i)=>{
              const d=i+1; const daySlots=slots[d]||{};
              return(
                <div key={d} style={{minHeight:88,padding:6,borderRight:(i+1)%7!==0?"1px solid var(--border)":"none",borderBottom:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,color:d===5?"var(--amber)":"var(--white2)",marginBottom:4}}>{d}</div>
                  {Object.entries(daySlots).map(([turno,status])=>(
                    <button key={turno} onClick={()=>{const ns=cycle[status]||"Livre";setSlots(s=>({...s,[d]:{...s[d],[turno]:ns}}));updateSlot(machines[activeMachine],d,turno,ns);}} style={{display:"flex",gap:3,alignItems:"center",marginBottom:3,background:"transparent",border:"none",cursor:"pointer",padding:"2px 4px",width:"100%"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:STATUS_CAL[status]||"var(--bg4)",flexShrink:0}}/>
                      <span style={{fontFamily:"var(--mono)",fontSize:7,color:"var(--white3)"}}>{turno}·{(status||"")[0]}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {view==="semanal"&&(
        <Card>
          <div style={{padding:"12px 18px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase"}}>Semana 05–10 Maio 2026 · {machines[activeMachine]?.name||"—"}</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--border)"}}>
              {["Data","Turno","Máquina","Horas disponíveis","Status",""].map(h=><th key={h} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",padding:"9px 14px",textAlign:"left",fontWeight:400}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {SEMANA.flatMap(({data,dia})=>
                Object.entries(slots[dia]||{M:"Livre",T:"Livre",N:"Livre"}).map(([turno,status])=>{
                  const turnLabel={"M":"Manhã (06h–14h)","T":"Tarde (14h–22h)","N":"Noite (22h–06h)"}[turno];
                  const horas=status==="Livre"?8:status==="Parcial"?4:0;
                  return(
                    <tr key={`${dia}-${turno}`} style={{borderBottom:"1px solid var(--border)"}}>
                      <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)"}}>{data}</td>
                      <td style={{padding:"10px 14px",fontFamily:"var(--body)",fontSize:13,fontWeight:300}}>{turnLabel}</td>
                      <td style={{padding:"10px 14px",fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{machines[activeMachine]?.id||"—"}</td>
                      <td style={{padding:"10px 14px",fontFamily:"var(--cond)",fontSize:16,fontWeight:700,color:horas>0?"var(--green)":"var(--red)"}}>{horas}h</td>
                      <td style={{padding:"10px 14px"}}><Badge label={status} color={STATUS_CAL[status]||"var(--white3)"}/></td>
                      <td style={{padding:"10px 14px"}}>
                        <button onClick={()=>{const ns=cycle[status]||"Livre";setSlots(s=>({...s,[dia]:{...s[dia],[turno]:ns}}));updateSlot(machines[activeMachine],dia,turno,ns);}} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"4px 8px",cursor:"pointer"}}>Alterar</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function Chat(){
  const {demands,orders,ndas,proposals:appProposals}=useApp();
  const {user}=useAuth();
  const [convs,setConvs]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [search,setSearch]=useState("");
  const [newThread,setNewThread]=useState(false);
  const [propostaModal,setPropostaModal]=useState(false);
  const endRef=useRef(null);
  const uploadRef=useRef(null);
  // Load conversations from API
  useEffect(()=>{
    apiGet("/messages/conversations").then(rows=>{
      if(Array.isArray(rows)&&rows.length>0){
        setConvs(rows);
        setActiveId(rows[0].id);
      }
    });
  },[]);
  // Load messages when active conversation changes
  useEffect(()=>{
    if(!activeId)return;
    apiGet(`/messages/${activeId}`).then(rows=>{
      setMsgs((Array.isArray(rows)?rows:[]).map(m=>({
        ...m,
        text:m.msg||m.text||"",
        mine:m.sender_id===user?.userId,
        from:m.sender_name||"",
        time:m.created_at?new Date(m.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):m.time||"",
      })));
    });
  },[activeId]);
  const activeConv=convs.find(c=>c.id===activeId)||convs[0];
  const convLabel=(c)=>c.label||c.demand_id||`Conversa ${String(c.id).slice(-4)}`;
  const filteredConvs=convs.filter(c=>!search||convLabel(c).toLowerCase().includes(search.toLowerCase()));
  const ndaSigned=activeConv?.demand_id&&ndas.some(n=>n.demanda===activeConv.demand_id);
  const send=async()=>{
    if(!input.trim()||!activeId)return;
    const text=input;
    setInput("");
    const res=await apiFetch(`/messages/${activeId}`,{method:"POST",body:JSON.stringify({msg:text})});
    if(res.ok){
      const m=await res.json();
      setMsgs(prev=>[...prev,{...m,text:m.msg||text,mine:true,from:user?.name||"Você",time:new Date(m.created_at||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}]);
    } else {
      setMsgs(prev=>[...prev,{id:Date.now(),text,mine:true,from:user?.name||"Você",time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}]);
    }
  };
  const sendAttachment=async(e)=>{
    const f=e.target.files?.[0];
    e.target.value="";
    if(!f||!activeId)return;
    const fd=new FormData();
    fd.append("file",f);
    fd.append("msg",f.name);
    const res=await apiFetch(`/messages/${activeId}/attachments`,{method:"POST",body:fd});
    if(res.ok){
      const data=await res.json();
      const m=data.message;
      setMsgs(prev=>[...prev,{...m,text:m.msg||f.name,mine:true,from:user?.name||"Você",time:new Date(m.created_at||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}]);
      toast.success("Anexo enviado.");
    }else toast.error("Erro ao enviar anexo.");
  };
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);
  return(
    <div style={{height:"calc(100vh - 140px)",display:"flex",gap:0,border:"1px solid var(--border)"}}>
      <div style={{width:268,background:"var(--bg2)",borderRight:"1px solid var(--border)",flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px",borderBottom:"1px solid var(--border)",display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}>
            <Search size={11} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--white3)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{fontSize:12,paddingLeft:30}}/>
          </div>
          <button onClick={()=>setNewThread(true)} style={{background:"var(--amber)",border:"none",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <Plus size={14} color="var(--bg)"/>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filteredConvs.map(c=>{
            const lastMsg=c.last_message;
            const unread=c.unread_count||0;
            const label=convLabel(c);
            const lastTime=c.last_message_at?new Date(c.last_message_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";
            return(
              <div key={c.id} onClick={()=>setActiveId(c.id)} style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",cursor:"pointer",background:activeId===c.id?"var(--amber-dim2)":"transparent",borderLeft:activeId===c.id?"2px solid var(--amber)":"2px solid transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:12,fontWeight:700,textTransform:"uppercase",color:activeId===c.id?"var(--amber)":"var(--white)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginLeft:6,flexShrink:0}}>{lastTime}</span>
                </div>
                {lastMsg&&<div style={{fontFamily:"var(--body)",fontSize:11,fontWeight:300,color:"var(--white3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{String(lastMsg).substring(0,40)}...</div>}
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {unread>0&&<span style={{background:"var(--amber)",color:"var(--bg)",fontFamily:"var(--mono)",fontSize:8,padding:"1px 6px",borderRadius:8,fontWeight:700}}>{unread}</span>}
                  {c.demand_id&&<Badge label="NDA" color="var(--purple)"/>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",background:"var(--bg2)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeConv?convLabel(activeConv):"—"}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:1}}>
              {ndaSigned&&<span style={{color:"var(--green)"}}>✓ NDA assinado · </span>}
              {msgs.length} mensagens
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <Btn small variant="ghost" icon={FileText} onClick={()=>setPropostaModal(true)}>Ver propostas</Btn>
            {!ndaSigned&&activeConv?.demand_id&&<Btn small variant="purple" icon={Lock} onClick={()=>toast.info("Acesse NDA & Contratos para assinar.")}>Assinar NDA</Btn>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.length===0&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><EmptyState
            icon={<MessageCircle size={48}/>}
            title="Nenhuma mensagem ainda"
            message="Inicie a conversa enviando uma mensagem abaixo."
          /></div>}
          {msgs.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:m.mine?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"68%"}}>
                {!m.mine&&<div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--amber)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>{m.from}</div>}
                <div style={{background:m.mine?"var(--amber-dim2)":"var(--bg2)",border:`1px solid ${m.mine?"rgba(232,160,32,.3)":"var(--border)"}`,padding:"10px 14px"}}>
                  <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white)",lineHeight:1.55}}>{m.text}</div>
                  {m.attachment&&<a href={m.attachment} target="_blank" rel="noreferrer" style={{display:"inline-flex",marginTop:8,fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",textTransform:"uppercase",letterSpacing:".08em"}}>Baixar anexo</a>}
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:5,textAlign:m.mine?"right":"left"}}>{m.time}</div>
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"12px 14px",borderTop:"1px solid var(--border)",display:"flex",gap:8,background:"var(--bg2)",flexShrink:0}}>
          <input ref={uploadRef} type="file" onChange={sendAttachment} style={{display:"none"}}/>
          <button onClick={()=>uploadRef.current?.click()} style={{background:"transparent",border:"1px solid var(--border)",padding:"0 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><Upload size={13} color="var(--white3)"/></button>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Digite sua mensagem... (Enter para enviar)" style={{flex:1}}/>
          <button onClick={send} style={{background:"var(--amber)",border:"none",padding:"0 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <Send size={13} color="var(--bg)"/>
            <span style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"var(--bg)"}}>Enviar</span>
          </button>
        </div>
      </div>
      <Modal open={newThread} onClose={()=>setNewThread(false)} title="Nova Negociação">
        <FormField label="Relacionado a">
          <select>
            <option value="">Selecione...</option>
            <optgroup label="Demandas abertas">{demands.filter(d=>d.status==="Publicado"||d.status==="Em cotação").map(d=><option key={d.id} value={d.id}>{d.id} · {d.title?.substring(0,40)}</option>)}</optgroup>
            <optgroup label="Pedidos ativos">{orders.filter(o=>o.pct<100).map(o=><option key={o.id} value={o.id}>{o.id} · {o.product?.substring(0,40)}</option>)}</optgroup>
          </select>
        </FormField>
        <FormField label="Mensagem inicial"><textarea rows={3} placeholder="Descreva o assunto da negociação..."/></FormField>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="ghost" onClick={()=>setNewThread(false)}>Cancelar</Btn>
          <Btn icon={Send} onClick={()=>{toast.success("Conversa iniciada!");setNewThread(false);}}>Iniciar conversa</Btn>
        </div>
      </Modal>
      <PropostaDetailModal open={propostaModal} onClose={()=>setPropostaModal(false)} demandId={activeConv?.demand_id} proposals={appProposals||[]}/>
    </div>
  );
}

// ─── QUALIDADE ────────────────────────────────────────────────────────────────
function Qualidade(){
  const [cl,setCl]=useState([
    {item:"Conferência dimensional",done:true,obs:"Ø 50,02mm ✓",resp:"Carlos Silva",data:"03/05/2026 08:10"},
    {item:"Conferência visual",done:true,obs:"Sem trincas ou rebarbas",resp:"Ana Técnica",data:"03/05/2026 08:25"},
    {item:"Conferência de material",done:true,obs:"Certificado de material OK",resp:"Carlos Silva",data:"03/05/2026 08:40"},
    {item:"Conferência de acabamento",done:false,obs:"",resp:"—",data:"—"},
    {item:"Teste funcional",done:false,obs:"",resp:"—",data:"—"},
    {item:"Aprovação de primeira peça",done:true,obs:"Aprovada em 02/05/2026",resp:"Carlos Silva",data:"02/05/2026 16:00"},
    {item:"Inspeção por amostragem (AQL 2.5)",done:false,obs:"",resp:"—",data:"—"},
  ]);
  const [ncs,setNcs]=useState([{id:"NC-001",tipo:"Dimensional",gravidade:"Alta",desc:"8 peças com Ø fora de tolerância (±0,08mm medido vs ±0,05mm especificado).",acao:"Reprocessamento no torno.",prazo:"04/05/2026",resp:"Carlos Silva",status:"Em tratamento",aberta:"03/05/2026"}]);
  const [encerrado,setEncerrado]=useState(false);
  const [laudoModal,setLaudoModal]=useState(false);
  const [ncModal,setNcModal]=useState(false);
  const toggle=(i)=>setCl(c=>c.map((x,j)=>j===i?{...x,done:!x.done,resp:x.done?"—":"Carlos Silva",data:x.done?"—":new Date().toLocaleDateString("pt-BR")+" "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}:x));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Controle de <span style={{color:"var(--amber)"}}>Qualidade</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>PD-4821 · Lote 1 de 5 · 3.250 peças</div>
        </div>
        {!encerrado
          ?<div style={{display:"flex",gap:8}}>
            <Btn variant="ghost" icon={FileCheck} onClick={()=>setLaudoModal(true)}>Gerar Laudo</Btn>
            <Btn icon={CheckCircle} variant="green" onClick={()=>setEncerrado(true)}>Encerrar Inspeção</Btn>
          </div>
          :<div style={{display:"flex",gap:8}}>
            <Btn variant="ghost" icon={FileCheck} onClick={()=>setLaudoModal(true)}>Gerar Laudo</Btn>
            <Badge label="✓ Inspeção encerrada" color="var(--green)"/>
          </div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{padding:"20px 24px"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Checklist de Inspeção</div>
          {cl.map((c,i)=>(
            <div key={i} style={{padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:c.done?6:0}}>
                <button onClick={()=>!encerrado&&toggle(i)} style={{width:20,height:20,background:c.done?"rgba(34,197,94,.15)":"var(--bg4)",border:`1px solid ${c.done?"var(--green)":"var(--border2)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,cursor:encerrado?"not-allowed":"pointer"}}>
                  {c.done&&<Check size={10} color="var(--green)"/>}
                </button>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500,color:c.done?"var(--white)":"var(--white3)"}}>{c.item}</div>
                  {c.done&&c.obs&&<div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:2}}>{c.obs}</div>}
                </div>
              </div>
              {c.done&&<div style={{display:"flex",gap:12,marginLeft:30,marginTop:4}}>
                <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",display:"flex",gap:4,alignItems:"center"}}><Users size={8}/>{c.resp}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",display:"flex",gap:4,alignItems:"center"}}><Clock size={8}/>{c.data}</span>
              </div>}
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:8}}>
            <Btn variant="danger" small icon={AlertCircle} onClick={()=>setNcModal(true)}>Abrir NC</Btn>
            <Btn variant="ghost" small icon={Upload}>Anexar evidência</Btn>
          </div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",marginBottom:12}}>Relatório do Lote</div>
            {[["Qtd. inspecionada","3.250 peças"],["Qtd. aprovada","3.242 peças","var(--green)"],["Qtd. reprovada","8 peças","var(--orange)"],["% aprovação","99,75%","var(--green)"],["Critério","Dimensional + Visual"],["Resultado",<Badge key="r" label="APROVADO" color="var(--green)"/>]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".06em",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:typeof v==="string"?"var(--mono)":"inherit",fontSize:10,color:c||"var(--white)"}}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Não Conformidades ({ncs.length})</div>
            {ncs.map(nc=>(
              <div key={nc.id} style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.25)",padding:"12px",marginBottom:10}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                  <span>{nc.id} · {nc.tipo}</span>
                  <Badge label={nc.status} color="var(--orange)"/>
                </div>
                <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)",marginBottom:4}}>{nc.desc}</div>
                {nc.acao&&<div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>Ação: {nc.acao} · Prazo: {nc.prazo} · {nc.resp}</div>}
              </div>
            ))}
            {ncs.length===0&&<div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",textAlign:"center",padding:12}}>Nenhuma NC registrada</div>}
          </Card>
          <Card style={{padding:"20px 24px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Evidências Anexadas</div>
            {[["foto_dim_01.jpg","Photo","02/05/2026"],["cert_material_sae1020.pdf","PDF","29/04/2026"]].map(([n,t,d])=>(
              <div key={n} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
                <FileText size={12} color="var(--amber)"/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white)"}}>{n}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)"}}>{t} · {d}</div>
                </div>
                <Btn small variant="ghost" icon={Eye} onClick={()=>toast.info("Visualizando evidência.")}>Ver</Btn>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <LaudoModal open={laudoModal} onClose={()=>setLaudoModal(false)} checklist={cl} lotInfo="PD-4821"/>
      <NCModal open={ncModal} onClose={()=>setNcModal(false)} onSave={(nc)=>setNcs(n=>[nc,...n])}/>
    </div>
  );
}

// ─── FINANCEIRO ───────────────────────────────────────────────────────────────
function Financeiro({userType}){
  const {transactions:txns_raw,releaseTransaction,checkoutTransaction,refundTransaction}=useApp();
  const txns=(txns_raw||[]).map(t=>({...t,commission:Math.round(t.gross*0.07)}));
  const [filterStatus,setFilterStatus]=useState("Todos");
  const filtered=filterStatus==="Todos"?txns:txns.filter(t=>t.status===filterStatus);
  const statusColor={"Retido":"var(--amber)","Liberado":"var(--green)","Pendente":"var(--blue)","Em disputa":"var(--red)","Cancelado":"var(--white3)"};
  const totalBruto=txns.filter(t=>t.status!=="Cancelado").reduce((a,b)=>a+b.gross,0);
  const aReceber=txns.filter(t=>t.status==="Retido"||t.status==="Pendente").reduce((a,b)=>a+b.gross,0);
  const liberado=txns.filter(t=>t.status==="Liberado").reduce((a,b)=>a+b.gross,0);
  const comissoes=txns.filter(t=>t.status!=="Cancelado").reduce((a,b)=>a+b.commission,0);
  const fmt=v=>`R$ ${v.toLocaleString("pt-BR")}`;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Financeiro <span style={{color:"var(--amber)"}}>{userType==="admin"?"da Plataforma":"& Pagamentos"}</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{txns.length} transações</div>
        </div>
        <Btn small variant="ghost" icon={Download} onClick={()=>exportCSV(txns.map(t=>({ID:t.id,Pedido:t.order,Empresa:t.party,Bruto:fmt(t.gross),Comissao:fmt(t.commission),Liquido:t.status==="Cancelado"?"—":fmt(t.gross-t.commission),Status:t.status,Data:t.date})),"financeiro_capacity")}>Exportar CSV</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label={userType==="admin"?"GMV total":"Volume bruto"} value={fmt(totalBruto)} icon={DollarSign} color="var(--green)"/>
        <Stat label="A receber / retido" value={fmt(aReceber)} sub="Aguardando liberação" icon={TrendingUp} color="var(--amber)"/>
        <Stat label="Valor liberado" value={fmt(liberado)} icon={CheckCircle} color="var(--green)"/>
        <Stat label="Comissões (7%)" value={fmt(comissoes)} sub="7% sobre bruto" icon={BarChart2}/>
      </div>
      <Card>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>Transações</span>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {["Todos","Liberado","Retido","Pendente","Em disputa","Cancelado"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:filterStatus===s?"var(--amber-dim2)":"transparent",border:`1px solid ${filterStatus===s?"rgba(232,160,32,.4)":"var(--border)"}`,color:filterStatus===s?"var(--amber)":"var(--white3)",padding:"5px 10px",cursor:"pointer"}}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr style={{borderBottom:"1px solid var(--border)"}}>
              {["ID","Pedido","Empresa","Bruto","Comissão 7%","Líquido","Status","Data",""].map(h=>(
                <th key={h} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",padding:"9px 14px",textAlign:"left",fontWeight:400}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id} style={{borderBottom:"1px solid var(--border)",opacity:t.status==="Cancelado"?.5:1}}>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{t.id}</td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)"}}>{t.order}</td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{t.party}</td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11,fontWeight:600}}>{fmt(t.gross)}</td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:10,color:"var(--orange)"}}>{fmt(t.commission)}</td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11,fontWeight:600,color:"var(--green)"}}>{t.status==="Cancelado"?"—":fmt(t.gross-t.commission)}</td>
                  <td style={{padding:"10px 14px"}}><Badge label={t.status} color={statusColor[t.status]||"var(--white3)"}/></td>
                  <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",whiteSpace:"nowrap"}}>{t.date}</td>
                  <td style={{padding:"10px 14px"}}>
                    {t.status==="Pendente"&&userType==="demandante"&&<button onClick={()=>checkoutTransaction(t.id)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",color:"var(--blue)",padding:"4px 8px",cursor:"pointer",marginRight:4}}>Pagar</button>}
                    {t.status==="Retido"&&<button onClick={()=>releaseTransaction(t.id)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",color:"var(--green)",padding:"4px 8px",cursor:"pointer",marginRight:4}}>Liberar</button>}
                    {t.checkout_url&&t.status==="Pendente"&&<button onClick={()=>{window.location.href=t.checkout_url}} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"4px 8px",cursor:"pointer",marginRight:4}}>Checkout</button>}
                    {userType==="admin"&&["Pendente","Retido","Em disputa","Liberado"].includes(t.status)&&<button onClick={()=>refundTransaction(t.id)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",textTransform:"uppercase",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",color:"var(--red)",padding:"4px 8px",cursor:"pointer",marginRight:4}}>Reembolsar</button>}
                    <button onClick={()=>toast.info(`Detalhes de ${t.id}`)} style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:".08em",background:"transparent",border:"1px solid var(--border)",color:"var(--white3)",padding:"4px 8px",cursor:"pointer"}}>Detalhes</button>
                    {t.transfer_status&&<div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:4}}>Repasse: {t.transfer_status}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {false&&activeLog&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
          <Card style={{padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Detalhes do evento</div>
              <Badge label={riskForLog(activeLog)} color={riskForLog(activeLog)==="Critico"?"var(--red)":riskForLog(activeLog)==="Alto"?"var(--orange)":"var(--green)"}/>
            </div>
            {[
              ["Evento",activeLog.evento],
              ["Usuario",activeLog.usuario],
              ["Empresa",activeLog.empresa],
              ["Endereco IP",activeLog.ip],
              ["Referencia",activeLog.ref||"sem referencia"],
              ["Data/Hora",activeLog.data],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"18px 22px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Rastreamento</div>
            {[
              ["Origem","Web admin · 127.0.0.1"],
              ["Sessao","sess-"+String(activeLog.id).padStart(4,"0")],
              ["Assinatura","sha256-"+String(activeLog.id).padStart(6,"0")+"-ok"],
              ["Retencao","5 anos · LGPD/auditoria"],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── AVALIAÇÕES ───────────────────────────────────────────────────────────────
function Avaliacoes(){
  const {reviews,orders,addReview}=useApp();
  const {user}=useAuth();
  const [showForm,setShowForm]=useState(false);
  const [newRating,setNewRating]=useState(5);
  const [critRatings,setCritRatings]=useState({qt:5,cp:5,co:5,dc:5});
  const [selectedOrder,setSelectedOrder]=useState("");
  const [comment,setComment]=useState("");
  const avgRating=reviews.length?Math.round(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length*10)/10:0;
  const publishReview=()=>{
    if(!selectedOrder){toast.error("Selecione um pedido.");return;}
    if(!comment.trim()){toast.error("Escreva um comentário.");return;}
    addReview({order:selectedOrder,rating:newRating,comment,criterios:[["Qualidade técnica",critRatings.qt],["Cumprimento de prazo",critRatings.cp],["Comunicação",critRatings.co],["Documentação",critRatings.dc]]},user);
    toast.success("Avaliação publicada!");
    setShowForm(false);setComment("");setNewRating(5);setCritRatings({qt:5,cp:5,co:5,dc:5});setSelectedOrder("");
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Avaliações <span style={{color:"var(--amber)"}}>& Reputação</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{reviews.length} avaliações · nota média {avgRating}★</div>
        </div>
        <Btn icon={Plus} onClick={()=>setShowForm(!showForm)}>Deixar Avaliação</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Nota média" value={`${avgRating}★`} icon={Star}/>
        <Stat label="Total de avaliações" value={reviews.length} icon={FileText}/>
        <Stat label="Nota máxima" value={`${Math.max(...reviews.map(r=>r.rating),0)}★`} icon={Award} color="var(--green)"/>
        <Stat label="Avaliações 5★" value={reviews.filter(r=>r.rating===5).length} icon={Star} color="var(--green)"/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["✓ Empresa Verificada","★ Fornecedor Confiável","📦 Entrega no Prazo","🏆 Alta Qualidade","⚡ Resposta Rápida","🔄 Baixo Retrabalho"].map(s=><Badge key={s} label={s} color="var(--amber)"/>)}
      </div>
      {showForm&&(
        <Card style={{padding:24,marginBottom:16}}>
          <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:16}}>Nova Avaliação</div>
          <FormField label="Pedido avaliado">
            <select value={selectedOrder} onChange={e=>setSelectedOrder(e.target.value)}>
              <option value="">Selecione um pedido...</option>
              {orders.map(o=><option key={o.id} value={o.id}>{o.id} · {o.product}</option>)}
            </select>
          </FormField>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Nota geral</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setNewRating(n)} style={{fontSize:28,background:"none",border:"none",cursor:"pointer",color:n<=newRating?"var(--amber)":"var(--white3)"}}>★</button>
              ))}
              <span style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:700,color:"var(--amber)",marginLeft:8}}>{newRating}/5</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[["Qualidade técnica","qt"],["Cumprimento de prazo","cp"],["Comunicação","co"],["Documentação","dc"]].map(([label,key])=>(
              <div key={key}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setCritRatings(r=>({...r,[key]:n}))} style={{fontSize:16,background:"none",border:"none",cursor:"pointer",color:n<=critRatings[key]?"var(--amber)":"var(--white3)"}}>★</button>)}
                </div>
              </div>
            ))}
          </div>
          <FormField label="Comentário (obrigatório)"><textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Descreva sua experiência com este fornecedor..."/></FormField>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn>
            <Btn icon={Send} onClick={publishReview}>Publicar avaliação</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {reviews.length===0&&<Card style={{padding:28,textAlign:"center"}}><div style={{fontFamily:"var(--cond)",fontSize:16,color:"var(--white3)",textTransform:"uppercase"}}>Nenhuma avaliação ainda</div></Card>}
        {reviews.map((r,i)=>(
          <Card key={r.id||i} style={{padding:"20px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",marginRight:10}}>{r.order}</span>
                <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>{r.from}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,color:"var(--amber)"}}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{r.date}</span>
              </div>
            </div>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.6,marginBottom:12}}>{r.comment}</div>
            {r.criterios&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"12px 0",borderTop:"1px solid var(--border)"}}>
              {r.criterios.map(([k,v])=>(
                <div key={k} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:800,color:"var(--amber)"}}>{v}<span style={{fontSize:10,color:"var(--white3)"}}>/5</span></div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".06em",textTransform:"uppercase",marginTop:2}}>{k}</div>
                </div>
              ))}
            </div>}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── DISPUTAS ─────────────────────────────────────────────────────────────────
function disputeRouteId(){
  const parts=window.location.pathname.split("/").filter(Boolean);
  return parts[0]==="disputas"&&parts[1]?decodeURIComponent(parts[1]):null;
}
function disputePath(id){
  return id?`/disputas/${encodeURIComponent(id)}`:"/disputas";
}
function Disputas(){
  const {disputes,resolveDispute}=useApp();
  const {user}=useAuth();
  const [sel,setSel]=useState(disputeRouteId());
  const [parecer,setParecer]=useState("");
  const selItem=(sel?disputes.find(d=>d.id===sel):null)||disputes.find(d=>d.id===disputeRouteId())||disputes[0]||null;
  const selectDispute=(d)=>{
    if(!d) return;
    setSel(d.id);
    setParecer(d.parecer||"");
    const nextPath=disputePath(d.id);
    if(window.location.pathname!==nextPath) window.history.pushState({}, "", nextPath);
  };
  useEffect(()=>{
    const sync=()=>{
      const id=disputeRouteId();
      if(id) setSel(id);
    };
    window.addEventListener("popstate",sync);
    return()=>window.removeEventListener("popstate",sync);
  },[]);
  useEffect(()=>{
    if(!disputes.length) return;
    const routed=disputeRouteId();
    if(routed&&disputes.some(d=>d.id===routed)){
      selectDispute(disputes.find(d=>d.id===routed));
    }else if(!sel){
      selectDispute(disputes[0]);
    }
  },[disputes.length]);
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Sistema de <span style={{color:"var(--red)"}}>Disputas</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>Mediação de conflitos · {disputes.filter(d=>d.status!=="Resolvida").length} casos ativos</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Disputas abertas" value={disputes.filter(d=>d.status==="Aberta").length} icon={AlertTriangle} color="var(--red)"/>
        <Stat label="Em análise" value={disputes.filter(d=>d.status==="Em análise").length} icon={Eye} color="var(--orange)"/>
        <Stat label="Resolvidas" value={disputes.filter(d=>d.status==="Resolvida").length} icon={CheckCircle} color="var(--green)"/>
        <Stat label="Taxa de disputa" value={`${disputes.length>0?Math.round(disputes.filter(d=>d.status!=="Resolvida").length/disputes.length*100):0}%`} sub="casos ativos" icon={Shield}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {disputes.map(d=>(
            <Card key={d.id} style={{padding:"14px 18px",cursor:"pointer",borderColor:sel===d.id?"rgba(232,160,32,.4)":"var(--border)",opacity:d.status==="Resolvida"?.7:1}} onClick={()=>selectDispute(d)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectDispute(d);}}}>
              <div style={{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)"}}>{d.id}</span>
                <Badge label={d.type} color="var(--orange)"/>
                <Badge label={d.impact} color={d.impact==="Alto"?"var(--red)":d.impact==="Médio"?"var(--orange)":"var(--white3)"}/>
                <Badge label={d.status} color={d.status==="Resolvida"?"var(--green)":d.status==="Em análise"?"var(--amber)":"var(--red)"}/>
              </div>
              <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{d.demandante} ↔ {d.fornecedor}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:6}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{d.order} · {d.date}</div>
                <button onClick={e=>{e.stopPropagation();selectDispute(d);}} style={{border:"1px solid var(--border2)",background:"transparent",color:"var(--white2)",padding:"5px 8px",fontFamily:"var(--mono)",fontSize:8,textTransform:"uppercase",cursor:"pointer"}}>Selecionar</button>
              </div>
            </Card>
          ))}
        </div>
        {selItem?(
          <Card style={{padding:"22px 26px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",marginBottom:4}}>{selItem.id} · {selItem.order}</div>
                <div style={{fontFamily:"var(--cond)",fontSize:20,fontWeight:800,textTransform:"uppercase",marginBottom:6}}>{selItem.type}</div>
                <div style={{display:"flex",gap:8}}>
                  <Badge label={selItem.impact} color={selItem.impact==="Alto"?"var(--red)":"var(--orange)"}/>
                  <Badge label={selItem.status} color={selItem.status==="Resolvida"?"var(--green)":selItem.status==="Em análise"?"var(--amber)":"var(--red)"}/>
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",cursor:"pointer"}}><X size={16} color="var(--white3)"/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Demandante",selItem.demandante],["Fornecedor",selItem.fornecedor],["Pedido",selItem.order],["Data abertura",selItem.date]].map(([k,v])=>(
                <div key={k} style={{padding:"10px 14px",background:"var(--bg3)"}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
                  <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"14px 16px",background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",marginBottom:14}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>Descrição da disputa</div>
              <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.6}}>{selItem.desc}</div>
            </div>
            {selItem.status==="Resolvida"?(
              <div style={{padding:"14px 16px",background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)"}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--green)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>✓ Parecer — Resolvida em {selItem.resolvidoEm}</div>
                <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",lineHeight:1.6}}>{selItem.parecer}</div>
              </div>
            ):(
              <>
                <FormField label="Parecer do administrador">
                  <textarea value={parecer} onChange={e=>setParecer(e.target.value)} rows={3} placeholder="Descreva a análise, documentos analisados e decisão final..."/>
                </FormField>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <Btn small variant="ghost" onClick={()=>toast.info("Notificação enviada às partes.")}>Solicitar documentos</Btn>
                  <Btn small variant="green" icon={Check} disabled={!parecer.trim()} onClick={()=>{
                    if(!parecer.trim()){toast.error("Escreva o parecer.");return;}
                    resolveDispute(selItem.id,parecer,user).then(ok=>{
                      if(ok){setSel(null);setParecer("");}
                    });
                  }}>Registrar resolução</Btn>
                </div>
              </>
            )}
          </Card>
        ):(
          <Card style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
            <div style={{textAlign:"center"}}>
              <AlertTriangle size={32} color="var(--white3)" style={{margin:"0 auto 10px"}}/>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:600,textTransform:"uppercase",color:"var(--white3)"}}>Selecione uma disputa</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN EMPRESAS ───────────────────────────────────────────────────────────
function AdminEmpresas(){
  const {companies,approveCompany,rejectCompany}=useApp();
  const {user}=useAuth();
  const [rejectModal,setRejectModal]=useState(null);
  const [motivo,setMotivo]=useState("");
  const [companyTab,setCompanyTab]=useState("cadastro");
  const [companyOps,setCompanyOps]=useState(()=>DB.get("company_operation_status")||{});
  const [operationDraft,setOperationDraft]=useState({});
  const operationOptions=["Operação ativa","Aguardando aprovação","Em análise","Em espera","Renegociando","Suspenso","Reprovado"];
  const companyOperation=(c)=>companyOps[c.id]||{
    status:c.status==="Aprovado"?"Operação ativa":c.status==="Reprovado"?"Reprovado":"Aguardando aprovação",
    by:"Sistema",
    at:"15/05/2026 09:00",
    reason:"Status sincronizado do cadastro empresarial.",
  };
  const setCompanyDraft=(id,patch)=>setOperationDraft(d=>({...d,[id]:{...(d[id]||{}),...patch}}));
  const saveCompanyOperation=(c)=>{
    const current=companyOperation(c);
    const draft=operationDraft[c.id]||{};
    const record={status:draft.status||current.status,reason:draft.reason||current.reason||"Atualizacao operacional registrada.",by:user?.name||"Admin CapaCity",at:nowPtBr()};
    const next={...companyOps,[c.id]:record};
    setCompanyOps(next);
    DB.set("company_operation_status",next);
    setOperationDraft(d=>({...d,[c.id]:{}}));
    toast.success(`Status operacional atualizado: ${c.name}.`);
  };
  const resetCompanyDraft=(c)=>{
    const current=companyOperation(c);
    setOperationDraft(d=>({...d,[c.id]:{status:current.status,reason:current.reason}}));
  };
  return(
    <div>
      <div style={{marginBottom:24}}><h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Empresas <span style={{color:"var(--amber)"}}>Cadastradas</span></h1></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Total cadastradas" value={companies.length} icon={Factory}/>
        <Stat label="Aprovadas" value={companies.filter(c=>c.status==="Aprovado").length} icon={CheckCircle} color="var(--green)"/>
        <Stat label="Pendentes análise" value={companies.filter(c=>c.status!=="Aprovado"&&c.status!=="Reprovado").length} icon={Clock} color="var(--orange)"/>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:"1px solid var(--border)"}}>
        {[["cadastro","Cadastro"],["operacao","Status da operação"]].map(([k,l])=>(
          <button key={k} onClick={()=>setCompanyTab(k)} className="tab-btn" style={{borderBottomColor:companyTab===k?"var(--amber)":"transparent",color:companyTab===k?"var(--amber)":"var(--white3)"}}>{l}</button>
        ))}
      </div>
      {companyTab==="cadastro"&&<Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid var(--border)"}}>{["Empresa","CNPJ","Tipo","Localização","Pedidos","Status","Ações"].map(h=><th key={h} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",padding:"10px 14px",textAlign:"left",fontWeight:400}}>{h}</th>)}</tr></thead>
          <tbody>{companies.map(c=>(
            <tr key={c.id} style={{borderBottom:"1px solid var(--border)"}}>
              <td style={{padding:"11px 14px",fontFamily:"var(--cond)",fontSize:14,fontWeight:600,textTransform:"uppercase"}}>{c.name}</td>
              <td style={{padding:"11px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{c.cnpj}</td>
              <td style={{padding:"11px 14px"}}><Badge label={c.type} color="var(--blue)"/></td>
              <td style={{padding:"11px 14px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)"}}>{c.city}</td>
              <td style={{padding:"11px 14px",fontFamily:"var(--cond)",fontSize:16,fontWeight:700,color:"var(--amber)"}}>{c.orders||0}</td>
              <td style={{padding:"11px 14px"}}><Badge label={c.status} color={STATUS_COLORS[c.status]||"var(--white3)"}/></td>
              <td style={{padding:"11px 14px"}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Btn small variant="ghost" icon={Eye} onClick={()=>toast.info(`Documentos de ${c.name}`)}>Ver</Btn>
                  {c.status!=="Aprovado"&&c.status!=="Reprovado"&&<>
                    <Btn small variant="green" icon={Check} onClick={()=>{approveCompany(c.id,user);toast.success(`${c.name} aprovada!`);}}>Aprovar</Btn>
                    <Btn small variant="danger" icon={X} onClick={()=>setRejectModal(c)}>Rejeitar</Btn>
                  </>}
                  {c.status==="Reprovado"&&<span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)"}}>Reprovada</span>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>}
      {companyTab==="operacao"&&<Card>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Status da operação por empresa</span>
          <Badge label="Em espera · Renegociando · Suspenso" color="var(--amber)"/>
        </div>
        {companies.map(c=>{
          const op=companyOperation(c);
          const draft=operationDraft[c.id]||{};
          const status=draft.status||op.status;
          return(
            <div key={c.id} style={{display:"grid",gridTemplateColumns:"minmax(210px,1fr) 180px minmax(260px,1.2fr) 230px",gap:12,alignItems:"stretch",padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
              <div>
                <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:800,textTransform:"uppercase"}}>{c.name}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:2}}>{c.cnpj} · cadastro {c.status}</div>
              </div>
              <select value={status} onChange={e=>setCompanyDraft(c.id,{status:e.target.value})} style={{fontSize:10}}>
                {operationOptions.map(s=><option key={s}>{s}</option>)}
              </select>
              <input value={draft.reason??op.reason??""} onChange={e=>setCompanyDraft(c.id,{reason:e.target.value})} placeholder="Motivo, pendencia ou proxima acao" style={{fontSize:11}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,background:"rgba(255,255,255,.025)",border:"1px solid var(--border)",padding:"7px 9px"}}>
                  <Badge label={status} color={STATUS_COLORS[status]||"var(--amber)"}/>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textAlign:"right",lineHeight:1.35}}>{op.by}<br/>{op.at}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <Btn small variant="ghost" icon={RotateCcw} onClick={()=>resetCompanyDraft(c)}>Reverter</Btn>
                  <Btn small variant="green" icon={Check} onClick={()=>saveCompanyOperation(c)}>Salvar</Btn>
                </div>
              </div>
            </div>
          );
        })}
      </Card>}
      <Modal open={!!rejectModal} onClose={()=>{setRejectModal(null);setMotivo("");}} title={`Rejeitar · ${rejectModal?.name}`}>
        <FormField label="Motivo da rejeição (obrigatório)"><textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={3} placeholder="Ex: Contrato social ilegível. Reenvie com resolução mínima de 300dpi."/></FormField>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="ghost" onClick={()=>setRejectModal(null)}>Cancelar</Btn>
          <Btn variant="danger" icon={X} disabled={!motivo.trim()} onClick={()=>{if(!motivo.trim()){toast.error("Informe o motivo.");return;}rejectCompany(rejectModal.id,user,motivo);toast.error(`${rejectModal.name} rejeitada.`);setRejectModal(null);setMotivo("");}}>Confirmar rejeição</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function Configuracoes(){
  const {user,logout,updateUser}=useAuth();
  const {addAudit}=useApp();
  const [tab,setTab]=useState("perfil");
  const avatarRef=useRef(null);
  const logoRef=useRef(null);
  const initials=(user?.name||"U").split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase();
  const [perfil,setPerfil]=useState({name:user?.name||"",cargo:"Gerente Comercial",email:user?.email||"",tel:"+55 81 98765-4321",idioma:"pt-BR",tz:"America/Recife"});
  const [empresa,setEmpresa]=useState({razao:user?.company||"",cnpj:user?.cnpj||"",city:user?.city||"",address:"Rua da Indústria, 1000 – Distrito Industrial",site:`https://empresa.com.br`});
  const [pw,setPw]=useState({current:"",next:"",confirm:""});
  const [pwErr,setPwErr]=useState("");
  const [twofa,setTwofa]=useState({secret:"",url:"",token:"",enabled:false});
  const NOTIF_DEFAULT={"Nova proposta recebida":[true,true],"Demanda compatível":[true,false],"Prazo se aproximando":[true,true],"Atualização de status":[true,false],"Pedido entregue":[true,true],"Atraso detectado":[true,true],"Pagamento liberado":[true,true],"Disputa aberta":[true,true],"Novo login detectado":[true,true],"Login de IP desconhecido":[true,true]};
  const [notifPrefs,setNotifPrefs]=useState(()=>DB.get("notif_prefs")||NOTIF_DEFAULT);
  const toggleNotif=(label,idx)=>{
    setNotifPrefs(p=>{const cur=p[label]||[false,false];const next={...p,[label]:cur.map((v,i)=>i===idx?!v:v)};DB.set("notif_prefs",next);return next;});
  };
  const save=(section)=>{addAudit({evento:`Configurações atualizadas: ${section}`,tipo:"auth"},user);toast.success("Configurações salvas com sucesso.");};
  const changePw=()=>{
    if(!pw.current){setPwErr("Informe a senha atual.");return;}
    if(pw.next.length<8){setPwErr("Nova senha deve ter ao menos 8 caracteres.");return;}
    if(pw.next!==pw.confirm){setPwErr("Senhas não conferem.");return;}
    setPwErr("");addAudit({evento:"Senha alterada",tipo:"auth"},user);
    toast.success("Senha alterada com sucesso!");setPw({current:"",next:"",confirm:""});
  };
  const uploadAvatar=async(file)=>{
    if(!file) return;
    const fd=new FormData(); fd.append("file",file);
    const res=await apiFetch("/users/me/avatar",{method:"PATCH",body:fd});
    if(res.ok){const data=await res.json();updateUser?.({avatar_url:data.avatar_url,avatar:data.avatar});toast.success("Foto atualizada.");}
    else toast.error("Não foi possível enviar a foto.");
  };
  const uploadLogo=async(file)=>{
    const companyId=user?.company_id||user?.companyId;
    if(!file||!companyId) return;
    const fd=new FormData(); fd.append("file",file);
    const res=await apiFetch(`/companies/${companyId}/logo`,{method:"PATCH",body:fd});
    if(res.ok){const data=await res.json();setEmpresa(e=>({...e,logo_url:data.logo_url}));toast.success("Logo atualizada.");}
    else toast.error("Não foi possível enviar o logo.");
  };
  const enable2FA=async()=>{
    const res=await apiFetch("/users/me/2fa/enable",{method:"POST"});
    if(!res.ok){toast.error("Não foi possível iniciar 2FA.");return;}
    const data=await res.json();
    setTwofa(t=>({...t,secret:data.base32,url:data.otpauth_url,enabled:false}));
    toast.info("Adicione a chave no app autenticador e confirme o código.");
  };
  const confirm2FA=async()=>{
    const res=await apiFetch("/users/me/2fa/confirm",{method:"POST",body:JSON.stringify({token:twofa.token})});
    if(res.ok){setTwofa(t=>({...t,enabled:true,token:""}));toast.success("2FA habilitado.");}
    else toast.error("Código 2FA inválido.");
  };
  const disable2FA=async()=>{
    const res=await apiFetch("/users/me/2fa",{method:"DELETE",body:JSON.stringify({token:twofa.token})});
    if(res.ok){setTwofa({secret:"",url:"",token:"",enabled:false});toast.success("2FA desabilitado.");}
    else toast.error("Informe um código válido para desabilitar.");
  };
  const tabs=[["perfil","Perfil"],["empresa","Empresa & Plano"],["notificacoes","Notificações"],["seguranca","Segurança"]];
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Configurações <span style={{color:"var(--amber)"}}>da Conta</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{user?.email} · {user?.company}</div>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:"1px solid var(--border)"}}>
        {tabs.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"11px 20px",background:"transparent",border:"none",borderBottom:tab===k?"2px solid var(--amber)":"2px solid transparent",fontFamily:"var(--mono)",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:tab===k?"var(--amber)":"var(--white3)",cursor:"pointer",marginBottom:-1}}>{l}</button>
        ))}
      </div>
      {tab==="perfil"&&(
        <div style={{maxWidth:600}}>
          <Card style={{padding:28}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Dados do Responsável</div>
            <div style={{display:"flex",gap:14,marginBottom:20,alignItems:"center"}}>
              <div style={{width:72,height:72,background:"var(--amber-dim2)",border:"1px solid rgba(232,160,32,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--cond)",fontSize:28,fontWeight:800,color:"var(--amber)",overflow:"hidden"}}>{user?.avatar_url?<img src={user.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}</div>
              <div>
                <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadAvatar(e.target.files?.[0])} style={{display:"none"}}/>
                <Btn small variant="ghost" icon={Upload} onClick={()=>avatarRef.current?.click()}>Alterar foto</Btn>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:4}}>PNG, JPG · Máx. 2MB</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <FormField label="Nome completo"><input value={perfil.name} onChange={e=>setPerfil(p=>({...p,name:e.target.value}))}/></FormField>
              <FormField label="Cargo"><input value={perfil.cargo} onChange={e=>setPerfil(p=>({...p,cargo:e.target.value}))}/></FormField>
              <FormField label="E-mail corporativo"><input value={perfil.email} onChange={e=>setPerfil(p=>({...p,email:e.target.value}))}/></FormField>
              <FormField label="Telefone / WhatsApp"><input value={perfil.tel} onChange={e=>setPerfil(p=>({...p,tel:e.target.value}))}/></FormField>
            </div>
            <FormField label="Idioma"><select value={perfil.idioma} onChange={e=>setPerfil(p=>({...p,idioma:e.target.value}))}><option value="pt-BR">Português (Brasil)</option><option value="en">English</option></select></FormField>
            <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}><Btn icon={Check} onClick={()=>save("perfil")}>Salvar perfil</Btn></div>
          </Card>
        </div>
      )}
      {tab==="empresa"&&(
        <div style={{maxWidth:660,display:"flex",flexDirection:"column",gap:14}}>
	          <Card style={{padding:28}}>
	            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Dados da Empresa</div>
	            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:18}}>
	              <div style={{width:56,height:56,background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{empresa.logo_url?<img src={empresa.logo_url} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<Factory size={20} color="var(--white3)"/>}</div>
	              <div>
	                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadLogo(e.target.files?.[0])} style={{display:"none"}}/>
	                <Btn small variant="ghost" icon={Upload} onClick={()=>logoRef.current?.click()}>Enviar logo</Btn>
	              </div>
	            </div>
	            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <FormField label="Razão social"><input value={empresa.razao} onChange={e=>setEmpresa(p=>({...p,razao:e.target.value}))}/></FormField>
              <FormField label="CNPJ"><input value={empresa.cnpj} onChange={e=>setEmpresa(p=>({...p,cnpj:e.target.value}))}/></FormField>
              <FormField label="Cidade/UF"><input value={empresa.city} onChange={e=>setEmpresa(p=>({...p,city:e.target.value}))}/></FormField>
              <FormField label="Site institucional"><input value={empresa.site} onChange={e=>setEmpresa(p=>({...p,site:e.target.value}))}/></FormField>
            </div>
            <FormField label="Endereço completo"><input value={empresa.address} onChange={e=>setEmpresa(p=>({...p,address:e.target.value}))}/></FormField>
            <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}><Btn icon={Check} onClick={()=>save("empresa")}>Salvar dados</Btn></div>
          </Card>
          <Card style={{padding:28}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:16}}>Plano Atual</div>
            <div style={{display:"flex",gap:16,padding:"18px",background:"var(--amber-dim)",border:"1px solid rgba(232,160,32,.3)",marginBottom:16}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--cond)",fontSize:24,fontWeight:800,textTransform:"uppercase",marginBottom:4}}>Profissional</div>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)"}}>R$297/mês · Comissão 7% · 3 usuários</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:4}}>Renova em: 01/06/2026</div>
              </div>
              <Btn variant="ghost" small onClick={()=>toast.info("Entre em contato para fazer upgrade.")}>Upgrade</Btn>
            </div>
            {[["Propostas enviadas este mês","47 / ilimitadas"],["Usuários ativos","2 / 3"],["Score de risco","✓ Incluído"],["Contratos digitais","✓ Incluído"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--green)"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab==="notificacoes"&&(
        <div style={{maxWidth:560}}>
          <Card style={{padding:28}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Preferências de Notificação</div>
            {[
              {cat:"Propostas & Demandas",items:["Nova proposta recebida","Demanda compatível","Prazo se aproximando"]},
              {cat:"Produção & Pedidos",items:["Atualização de status","Pedido entregue","Atraso detectado"]},
              {cat:"Financeiro",items:["Pagamento liberado","Disputa aberta"]},
              {cat:"Segurança",items:["Novo login detectado","Login de IP desconhecido"]},
            ].map(group=>(
              <div key={group.cat} style={{marginBottom:20}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:10}}>{group.cat}</div>
                {group.items.map(label=>{
                  const [plat,email]=(notifPrefs[label]||NOTIF_DEFAULT[label]||[false,false]);
                  return(
                  <div key={label} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)",gap:16}}>
                    <span style={{flex:1,fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}>{label}</span>
                    <label style={{display:"flex",gap:5,alignItems:"center",cursor:"pointer"}}>
                      <input type="checkbox" checked={plat} onChange={()=>toggleNotif(label,0)} style={{width:"auto",accentColor:"var(--amber)"}}/>
                      <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textTransform:"uppercase"}}>Plataforma</span>
                    </label>
                    <label style={{display:"flex",gap:5,alignItems:"center",cursor:"pointer"}}>
                      <input type="checkbox" checked={email} onChange={()=>toggleNotif(label,1)} style={{width:"auto",accentColor:"var(--amber)"}}/>
                      <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",textTransform:"uppercase"}}>E-mail</span>
                    </label>
                  </div>
                );})}
              </div>
            ))}
            <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}><Btn icon={Check} onClick={()=>save("notificações")}>Salvar preferências</Btn></div>
          </Card>
        </div>
      )}
      {tab==="seguranca"&&(
        <div style={{maxWidth:540,display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:28}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Alterar Senha</div>
            <FormField label="Senha atual"><input type="password" value={pw.current} onChange={e=>setPw(p=>({...p,current:e.target.value}))}/></FormField>
            <FormField label="Nova senha (mín. 8 caracteres)"><input type="password" value={pw.next} onChange={e=>setPw(p=>({...p,next:e.target.value}))}/></FormField>
            <FormField label="Confirmar nova senha"><input type="password" value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))}/></FormField>
	            {pwErr&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",padding:"8px 12px",fontFamily:"var(--mono)",fontSize:10,color:"var(--red)",marginBottom:8}}>{pwErr}</div>}
	            <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}><Btn icon={Shield} onClick={changePw}>Alterar senha</Btn></div>
	          </Card>
	          <Card style={{padding:28}}>
	            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Autenticação em 2 fatores</div>
	            {twofa.secret&&<div style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:"12px 14px",marginBottom:12}}>
	              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Chave TOTP</div>
	              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--amber)",wordBreak:"break-all"}}>{twofa.secret}</div>
	            </div>}
	            <FormField label="Código do app autenticador"><input value={twofa.token} onChange={e=>setTwofa(t=>({...t,token:e.target.value.replace(/\D/g,"").slice(0,6)}))} inputMode="numeric" placeholder="000000"/></FormField>
	            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
	              {!twofa.secret&&<Btn icon={Fingerprint} onClick={enable2FA}>Iniciar 2FA</Btn>}
	              {twofa.secret&&!twofa.enabled&&<Btn icon={Check} onClick={confirm2FA}>Confirmar 2FA</Btn>}
	              {twofa.enabled&&<Btn variant="danger" icon={Unlock} onClick={disable2FA}>Desabilitar</Btn>}
	            </div>
	          </Card>
	          <Card style={{padding:28}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Sessões Ativas</div>
            {[{d:`Chrome · ${navigator.platform||"Windows"}`,ip:"IP atual (simulado)",t:"Agora",flag:"current"},{d:"Safari · iPhone",ip:"IP (simulado)",t:"2h atrás",flag:""}].map(s=>(
              <div key={s.d} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.flag==="current"?"var(--green)":"var(--white3)",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500}}>{s.d} {s.flag==="current"&&<span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--green)"}}>ATUAL</span>}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",marginTop:1}}>{s.ip} · {s.t}</div>
                </div>
                {s.flag!=="current"&&<Btn small variant="danger" onClick={()=>toast.success("Sessão encerrada.")}>Encerrar</Btn>}
              </div>
            ))}
            <div style={{marginTop:14}}>
              <Btn variant="danger" icon={LogOut} onClick={()=>{addAudit({evento:"Logout",tipo:"auth"},user);logout();}}>Sair da conta</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── PLACEHOLDER ──────────────────────────────────────────────────────────────
function PlaceholderPage({title}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:12}}>
      <div style={{fontFamily:"var(--cond)",fontSize:44,fontWeight:900,WebkitTextStroke:"1px rgba(232,160,32,.3)",color:"transparent",textTransform:"uppercase"}}>{title}</div>
      <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",letterSpacing:".1em"}}>Em desenvolvimento</div>
    </div>
  );
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
let _addToast=null;
function ToastHost(){
  const [toasts,setToasts]=useState([]);
  _addToast=(type,msg)=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,type,msg}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  };
  const col={success:"var(--green)",error:"var(--red)",info:"var(--amber)",warning:"var(--orange)"};
  const ico={success:"\u2713",error:"\u2715",info:"\u2139",warning:"\u26A0"};
  return(
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:"var(--bg2)",border:`1px solid ${col[t.type]||"var(--amber)"}60`,padding:"12px 18px",display:"flex",gap:10,alignItems:"center",minWidth:280,maxWidth:400,boxShadow:"0 4px 24px rgba(0,0,0,.4)",animation:"fadeup .2s ease"}}>
          <span style={{fontFamily:"var(--mono)",fontSize:14,color:col[t.type]||"var(--amber)",flexShrink:0}}>{ico[t.type]||"\u2139"}</span>
          <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white)",lineHeight:1.4}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
const toast={success:(m)=>_addToast?.("success",m),error:(m)=>_addToast?.("error",m),info:(m)=>_addToast?.("info",m),warning:(m)=>_addToast?.("warning",m)};

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
function exportCSV(rows,filename){
  if(!rows||!rows.length){toast.error("Sem dados para exportar.");return;}
  const headers=Object.keys(rows[0]);
  const csv=[headers.join(","),...rows.map(r=>headers.map(h=>`"${String(r[h]||"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`${filename}.csv`;a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename}.csv exportado.`);
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=CSS;
    document.head.appendChild(s);
    return()=>document.head.removeChild(s);
  },[]);
  return(
    <AuthProvider>
      <AppProvider>
        <AppRoot/>
      </AppProvider>
    </AuthProvider>
  );
}

function AppRoot(){
  const {user,authLoading}=useAuth();
  const routeScene=()=>{
    const path=window.location.pathname;
    if(path.includes("forgot-password")||path.includes("forgot")) return "forgot";
    if(path.includes("reset-password")) return "reset";
    if(path.includes("verify-email")) return "verify";
    return user?"app":"landing";
  };
  const [scene,setScene]=useState(routeScene);
  useEffect(()=>{if(authLoading)return;if(user) setScene("app"); else setScene(s=>s==="app"?"landing":s);},[user,authLoading]);
  if(authLoading&&scene!=="reset"&&scene!=="verify"){
    return(
      <>
        <ToastHost/>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--white2)",letterSpacing:".12em",textTransform:"uppercase"}}>Carregando sessao...</div>
      </>
    );
  }
  return(
    <>
      <ToastHost/>
      {user&&<ModularFeedbackWidget/>}
      {scene==="landing"&&<Landing onLogin={()=>setScene("login")} onRegister={()=>setScene("register")}/>}
      {scene==="login"&&<LoginPage onBack={()=>setScene("landing")} onRegister={()=>setScene("register")} onForgot={()=>setScene("forgot")}/>}
      {scene==="register"&&<RegisterWizardAdapter onLogin={()=>setScene("login")}/>}
      {scene==="forgot"&&<ForgotPasswordPage onBack={()=>setScene("login")}/>}
      {scene==="reset"&&<ResetPasswordPage onLogin={()=>setScene("login")}/>}
      {scene==="verify"&&<VerifyEmailPage onLogin={()=>setScene("login")}/>}
      {scene==="app"&&user&&<AppShell/>}
    </>
  );
}

// ─── Adapter: RegisterWizard (módulo tipado) → register do AuthContext legacy ───
function RegisterWizardAdapter({onLogin}){
  const {register,loginErr}=useAuth();
  return(
    <RegisterWizard
      onLogin={onLogin}
      onSubmit={async(form)=>{
        const ok=await register(form);
        return { ok:Boolean(ok), error: ok ? undefined : (loginErr || "Erro no cadastro.") };
      }}
    />
  );
}

// ─── NDA & CONTRATOS ─────────────────────────────────────────────────────────
function FeedbackWidget(){
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [type,setType]=useState("feedback");
  const send=async()=>{
    if(!message.trim()){toast.error("Descreva o feedback.");return;}
    const res=await apiFetch("/feedback",{method:"POST",body:JSON.stringify({type,message,page:window.location.pathname,metadata:{userAgent:navigator.userAgent,viewport:[window.innerWidth,window.innerHeight]}})});
    if(res.ok){toast.success("Feedback enviado. Obrigado!");setMessage("");setOpen(false);}
    else toast.error("Erro ao enviar feedback.");
  };
  return(
    <div style={{position:"fixed",right:20,bottom:20,zIndex:9998}}>
      {open&&<div style={{width:320,background:"var(--bg2)",border:"1px solid var(--border2)",padding:14,boxShadow:"0 8px 30px rgba(0,0,0,.45)",marginBottom:8}}>
        <div style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase",marginBottom:10}}>Feedback beta</div>
        <select value={type} onChange={e=>setType(e.target.value)} style={{marginBottom:8}}>
          <option value="feedback">Feedback</option>
          <option value="bug">Bug</option>
          <option value="feature">Ideia</option>
        </select>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} placeholder="O que aconteceu?" style={{width:"100%",marginBottom:10}}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn small variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Btn>
          <Btn small icon={Send} onClick={send}>Enviar</Btn>
        </div>
      </div>}
      <button onClick={()=>setOpen(o=>!o)} style={{background:"var(--amber)",color:"var(--bg)",border:"none",padding:"10px 14px",fontFamily:"var(--mono)",fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 6px 20px rgba(0,0,0,.35)"}}>Feedback</button>
    </div>
  );
}

function ContratosNDA({userType}){
  const {contracts,ndas,signContract,signNDA,demands}=useApp();
  const {user}=useAuth();
  const [ndaModal,setNdaModal]=useState(false);
  const [selectedDemand,setSelectedDemand]=useState(null);
  const [activeTab,setActiveTab]=useState("nda");
  const [contratoViewer,setContratoViewer]=useState(null);
  const ndaDemands=demands.filter(d=>d.nda);
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>NDA & <span style={{color:"var(--amber)"}}>Contratos Digitais</span></h1>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid var(--border)"}}>
        {[["nda","🔒 NDAs"],["contratos","📄 Contratos Digitais"]].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{flex:1,padding:"12px",background:activeTab===k?"var(--amber-dim2)":"transparent",border:"none",borderBottom:activeTab===k?"2px solid var(--amber)":"2px solid transparent",fontFamily:"var(--mono)",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:activeTab===k?"var(--amber)":"var(--white3)",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {activeTab==="nda"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            <Stat label="NDAs assinados" value={ndas.length} sub="Ativos" icon={FileSignature}/>
            <Stat label="Arquivos protegidos" value="7" sub="Com watermark" icon={Shield}/>
            <Stat label="Acessos registrados" value="23" sub="Este mês" icon={Eye}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>Demandas com NDA</span>
              </div>
              {ndaDemands.length===0&&<div style={{padding:20,fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)"}}>Nenhuma demanda com NDA</div>}
              {ndaDemands.map(d=>(
                <div key={d.id} style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",marginBottom:2}}>{d.id}</div>
                      <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase"}}>{d.title.substring(0,36)}...</div>
                    </div>
                    <Badge label="🔒 NDA" color="var(--purple)"/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn small variant="purple" icon={FileSignature} onClick={()=>{setSelectedDemand(d);setNdaModal(true);}}>
                      {ndas.some(n=>n.demanda===d.id)?"NDA Assinado ✓":"Assinar NDA"}
                    </Btn>
                    {ndas.some(n=>n.demanda===d.id)&&<Btn small variant="ghost" icon={Unlock}>Acessar arquivos</Btn>}
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>NDAs Assinados</span>
              </div>
              {ndas.map(n=>(
                <div key={n.id} style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)"}}>{n.id} · {n.demanda}</span>
                    <Badge label={n.status} color="var(--green)"/>
                  </div>
                  <div style={{fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>{n.contraparte}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{n.assinado} · IP {n.ip}</div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
      {activeTab==="contratos"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            <Stat label="Contratos gerados" value={contracts.length} icon={FileText}/>
            <Stat label="Assinados" value={contracts.filter(c=>c.status==="Assinado").length} icon={CheckCircle} color="var(--green)"/>
            <Stat label="Aguardando assinatura" value={contracts.filter(c=>c.status==="Aguardando assinatura").length} icon={Clock} color="var(--orange)"/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {contracts.map(c=>(
              <Card key={c.id} style={{padding:"20px 24px"}}>
                <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)"}}>{c.id} · {c.pedido}</span>
                      <Badge label={c.status} color={STATUS_COLORS[c.status]||"var(--white2)"}/>
                    </div>
                    <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{c.demandante} ↔ {c.fornecedor}</div>
                    <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",marginBottom:4}}>{c.escopo}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)"}}>Gerado: {c.gerado} · Valor: {c.valor} · Prazo: {c.prazo}</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <Btn small variant="ghost" icon={Eye} onClick={()=>setContratoViewer(c)}>Ver contrato</Btn>
                    {c.status==="Aguardando assinatura"&&<Btn small icon={Fingerprint} onClick={()=>{signContract(c.id,user);toast.success(`Contrato ${c.id} assinado!`);}}>Assinar</Btn>}
                    {c.status==="Assinado"&&<Btn small variant="green" icon={FileCheck}>Assinado ✓</Btn>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <NDAModal open={ndaModal} onClose={()=>setNdaModal(false)} demand={selectedDemand} onSign={()=>signNDA(selectedDemand?.id,user)}/>
      <ContratoViewerModal open={!!contratoViewer} onClose={()=>setContratoViewer(null)} contrato={contratoViewer} onSign={signContract} user={user}/>
    </div>
  );
}

// ─── CONTRATOS RECORRENTES ────────────────────────────────────────────────────
function ContratosRecorrentes(){
  const {recurringContracts,createRecurringContract,toggleRecurringStatus}=useApp();
  const {user}=useAuth();
  const [showForm,setShowForm]=useState(false);
  const [detalheModal,setDetalheModal]=useState(null);
  const [form,setForm]=useState({demandante:"",tipo:"Mensal fixo",processo:"",volume:"",valor:"",sla:"",inicio:"",vigencia:"",renovacao:"Automática"});
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const tipoColor={"Mensal fixo":"var(--green)","Capacidade reservada":"var(--blue)","Emergencial":"var(--orange)","Por volume":"var(--purple)"};
  const ativos=recurringContracts.filter(c=>c.status==="Ativo");
  const receitaTotal=ativos.reduce((a,c)=>{const v=parseInt((c.valor||"0").replace(/\D/g,""))||0;return a+v;},0);
  const submitForm=()=>{
    if(!form.demandante||!form.processo){toast.error("Preencha ao menos empresa e processo.");return;}
    createRecurringContract({...form,valor:form.valor?`R$ ${form.valor}/mês`:form.valor},user);
    toast.success("Contrato recorrente criado!");
    setShowForm(false);setForm({demandante:"",tipo:"Mensal fixo",processo:"",volume:"",valor:"",sla:"",inicio:"",vigencia:"",renovacao:"Automática"});
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Contratos <span style={{color:"var(--amber)"}}>Recorrentes</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{ativos.length} contratos ativos</div>
        </div>
        <Btn icon={Plus} onClick={()=>setShowForm(!showForm)}>Novo Contrato Recorrente</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Contratos ativos" value={ativos.length} icon={Repeat} color="var(--green)"/>
        <Stat label="Total contratos" value={recurringContracts.length} icon={FileText}/>
        <Stat label="Pausados" value={recurringContracts.filter(c=>c.status==="Pausado").length} icon={AlertCircle} color="var(--orange)"/>
        <Stat label="Receita recorrente" value={receitaTotal>0?`R$${(receitaTotal/1000).toFixed(0)}k`:"—"} sub="/mês garantido" icon={DollarSign} color="var(--green)"/>
      </div>
      {showForm&&(
        <Card style={{padding:24,marginBottom:16}}>
          <div style={{fontFamily:"var(--cond)",fontSize:17,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:18}}>Novo Contrato Recorrente</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FormField label="Tipo de contrato"><select value={form.tipo} onChange={up("tipo")}>{["Mensal fixo","Capacidade reservada","Por volume","Emergencial"].map(t=><option key={t}>{t}</option>)}</select></FormField>
            <FormField label="Empresa contratante *"><input value={form.demandante} onChange={up("demandante")} placeholder="Nome da empresa demandante"/></FormField>
            <FormField label="Processo / Máquina *"><input value={form.processo} onChange={up("processo")} placeholder="Ex: Torneamento CNC – Romi Centur 30D"/></FormField>
            <FormField label="Volume / Capacidade"><input value={form.volume} onChange={up("volume")} placeholder="Ex: 5.000 pçs/mês"/></FormField>
            <FormField label="Valor mensal (R$)"><input value={form.valor} onChange={up("valor")} placeholder="Ex: 24500" type="number" min="0"/></FormField>
            <FormField label="SLA de entrega"><input value={form.sla} onChange={up("sla")} placeholder="Ex: 98% entregas no prazo"/></FormField>
            <FormField label="Vigência — início"><input type="date" value={form.inicio} onChange={up("inicio")}/></FormField>
            <FormField label="Vigência — fim"><input type="date" value={form.vigencia} onChange={up("vigencia")}/></FormField>
          </div>
          <FormField label="Renovação"><select value={form.renovacao} onChange={up("renovacao")}><option>Automática</option><option>Manual</option></select></FormField>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Btn>
            <Btn icon={FileSignature} onClick={submitForm}>Gerar Contrato Recorrente</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {recurringContracts.map(c=>(
          <Card key={c.id} style={{padding:"20px 24px"}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{c.id}</span>
                  <Badge label={c.tipo} color={tipoColor[c.tipo]||"var(--amber)"}/>
                  <Badge label={c.status} color={STATUS_COLORS[c.status]||"var(--white3)"}/>
                  <Badge label={`Renov: ${c.renovacao}`} color="var(--white3)"/>
                </div>
                <div style={{fontFamily:"var(--cond)",fontSize:17,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{c.demandante}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[[Wrench,c.processo],[Layers,c.volume],[DollarSign,c.valor],[Calendar,`${c.inicio}→${c.vigencia}`],[Shield,c.sla]].filter(([,t])=>t).map(([Icon,text])=>(
                    <span key={text} style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",display:"flex",alignItems:"center",gap:5}}><Icon size={10}/>{text}</span>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <Btn small variant="ghost" icon={Eye} onClick={()=>setDetalheModal(c)}>Detalhes</Btn>
                <Btn small variant={c.status==="Ativo"?"ghost":"green"} icon={c.status==="Ativo"?AlertCircle:RefreshCw} onClick={()=>{toggleRecurringStatus(c.id,user);toast.success(`Contrato ${c.id} ${c.status==="Ativo"?"pausado":"reativado"}.`);}}>{c.status==="Ativo"?"Pausar":"Reativar"}</Btn>
              </div>
            </div>
            {c.cumprimento&&<div style={{marginTop:14,background:"var(--bg3)",padding:"12px 16px"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>Histórico de cumprimento de SLA</div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:32}}>
                {c.cumprimento.map((v,i)=>(
                  <div key={i} style={{flex:1,background:"rgba(232,160,32,.15)",borderTop:"2px solid var(--amber)",height:`${v}%`}}/>
                ))}
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:4}}>últimos {c.cumprimento.length} meses</div>
            </div>}
          </Card>
        ))}
      </div>
      {/* Detalhe do contrato recorrente */}
      <Modal open={!!detalheModal} onClose={()=>setDetalheModal(null)} title={`Detalhes · ${detalheModal?.id}`} width={580}>
        {detalheModal&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[["Tipo",detalheModal.tipo],["Status",detalheModal.status],["Empresa",detalheModal.demandante],["Processo",detalheModal.processo],["Volume",detalheModal.volume||"—"],["Valor",detalheModal.valor||"—"],["Início",detalheModal.inicio||"—"],["Fim vigência",detalheModal.vigencia||"—"],["SLA",detalheModal.sla||"—"],["Renovação",detalheModal.renovacao]].map(([k,v])=>(
                <div key={k} style={{padding:"10px 14px",background:"var(--bg3)"}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{k}</div>
                  <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700}}>{v}</div>
                </div>
              ))}
            </div>
            {detalheModal.cumprimento&&(
              <div style={{padding:"14px 16px",background:"var(--bg3)",border:"1px solid var(--border)",marginBottom:14}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Histórico de cumprimento mensal</div>
                <div style={{display:"flex",gap:4,alignItems:"flex-end",height:48}}>
                  {detalheModal.cumprimento.map((v,i)=>(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <span style={{fontFamily:"var(--mono)",fontSize:7,color:"var(--white3)"}}>{v}%</span>
                      <div style={{width:"100%",background:"rgba(232,160,32,.15)",borderTop:"2px solid var(--amber)",height:`${(v/100)*40}px`}}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn variant="ghost" onClick={()=>setDetalheModal(null)}>Fechar</Btn>
              <Btn icon={Download} onClick={()=>exportCSV([detalheModal],"contrato_recorrente_"+detalheModal.id)}>Exportar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── LOGS DE AUDITORIA ────────────────────────────────────────────────────────
function LogsAuditoria(){
  const {audit}=useApp();
  const [filterTipo,setFilterTipo]=useState("");
  const [filterEmpresa,setFilterEmpresa]=useState("");
  const [search,setSearch]=useState("");
  const [selectedLog,setSelectedLog]=useState(null);
  const filtered=audit.filter(l=>{
    if(filterTipo&&l.tipo!==filterTipo) return false;
    if(filterEmpresa&&!l.empresa.toLowerCase().includes(filterEmpresa.toLowerCase())) return false;
    if(search&&!l.evento.toLowerCase().includes(search.toLowerCase())&&!l.usuario.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const tipoLabels={auth:"Autenticação",proposta:"Proposta",nda:"NDA",contrato:"Contrato",demanda:"Demanda",producao:"Produção",disputa:"Disputa",arquivo:"Arquivo",auth_fail:"Auth Falha"};
  const tipoIcon={auth:"🔑",proposta:"📬",nda:"🔒",contrato:"📄",demanda:"📋",producao:"⚙️",disputa:"⚠️",arquivo:"📂",auth_fail:"🚨"};
  const activeLog=selectedLog||filtered[0]||audit[0]||null;
  const riskForLog=(l)=>l?.tipo==="auth_fail"?"Critico":l?.tipo==="disputa"?"Alto":l?.tipo==="arquivo"?"Medio":"Normal";
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Logs de <span style={{color:"var(--amber)"}}>Auditoria</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{filtered.length} eventos · rastreabilidade completa</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <Stat label="Total de eventos" value={audit.length} icon={Activity}/>
        <Stat label="Eventos de auth" value={audit.filter(l=>l.tipo==="auth"||l.tipo==="auth_fail").length} icon={Users}/>
        <Stat label="Auth failures" value={audit.filter(l=>l.tipo==="auth_fail").length} sub="IPs suspeitos" icon={AlertTriangle} color="var(--red)"/>
        <Stat label="Acessos a arquivo" value={audit.filter(l=>l.tipo==="arquivo").length} icon={FileText}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr .8fr",gap:10,marginBottom:16}}>
        {[
          ["Fila investigativa",`${filtered.length} eventos filtrados`,"Clique em um evento para abrir o dossie completo.","var(--amber)"],
          ["Risco selecionado",riskForLog(activeLog),activeLog?.ref||"sem referencia",riskForLog(activeLog)==="Critico"?"var(--red)":"var(--orange)"],
          ["Integridade","Hash OK","trilha imutavel simulada","var(--green)"],
        ].map(([title,value,sub,color])=>(
          <div key={title} style={{background:"var(--bg2)",border:"1px solid var(--border)",padding:"14px 16px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{title}</div>
            <div style={{fontFamily:"var(--cond)",fontSize:22,fontWeight:900,color}}>{value}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",marginTop:4}}>{sub}</div>
          </div>
        ))}
      </div>
      {activeLog&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <Card style={{padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase"}}>Detalhes do evento</div>
              <Badge label={riskForLog(activeLog)} color={riskForLog(activeLog)==="Critico"?"var(--red)":riskForLog(activeLog)==="Alto"?"var(--orange)":"var(--green)"}/>
            </div>
            {[["Evento",activeLog.evento],["Usuario",activeLog.usuario],["Empresa",activeLog.empresa],["Endereco IP",activeLog.ip],["Referencia",activeLog.ref||"sem referencia"],["Data/Hora",activeLog.data]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:"18px 22px"}}>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:900,textTransform:"uppercase",marginBottom:14}}>Rastreamento</div>
            {[["Origem","Web admin · 127.0.0.1"],["Sessao","sess-"+String(activeLog.id).padStart(4,"0")],["Assinatura","sha256-"+String(activeLog.id).padStart(6,"0")+"-ok"],["Retencao","5 anos · LGPD/auditoria"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textTransform:"uppercase"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:300}}>
          <Search size={12} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--white3)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar evento ou usuário..." style={{paddingLeft:34}}/>
        </div>
        <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)} style={{width:"auto",minWidth:160}}>
          <option value="">Todos os tipos</option>
          {Object.entries(tipoLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <input value={filterEmpresa} onChange={e=>setFilterEmpresa(e.target.value)} placeholder="Filtrar empresa..." style={{width:"auto",maxWidth:200}}/>
        <Btn small variant="ghost" icon={Download} onClick={()=>exportCSV(filtered.map(l=>({ID:l.id,Evento:l.evento,Usuario:l.usuario,Empresa:l.empresa,IP:l.ip,"Data/Hora":l.data,Tipo:l.tipo,Referencia:l.ref||"—"})),"auditoria_capacity")}>Exportar CSV</Btn>
      </div>
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid var(--border)"}}>
              {["","Evento","Usuário","Empresa","IP","Data/Hora","Referência"].map(h=>(
                <th key={h} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",padding:"10px 14px",textAlign:"left",fontWeight:400}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l=>(
              <tr key={l.id} onClick={()=>setSelectedLog(l)} style={{borderBottom:"1px solid var(--border)",background:(activeLog?.id===l.id?"rgba(232,160,32,.07)":l.tipo==="auth_fail"?"rgba(239,68,68,.04)":"transparent"),cursor:"pointer"}}>
                <td style={{padding:"10px 14px",fontSize:14}}>{tipoIcon[l.tipo]||"•"}</td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500,color:l.tipo==="auth_fail"?"var(--red)":"var(--white)"}}>{l.evento}</div>
                  <div style={{display:"inline-block",fontFamily:"var(--mono)",fontSize:8,letterSpacing:".1em",textTransform:"uppercase",color:LOG_COLORS[l.tipo]||"var(--white3)",marginTop:2}}>{tipoLabels[l.tipo]||l.tipo}</div>
                </td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:10,color:"var(--white2)"}}>{l.usuario}</td>
                <td style={{padding:"10px 14px",fontFamily:"var(--cond)",fontSize:13,fontWeight:600,textTransform:"uppercase"}}>{l.empresa}</td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{l.ip}</td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",whiteSpace:"nowrap"}}>{l.data}</td>
                <td style={{padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)"}}>{l.ref||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── COMPARAR PROPOSTAS ───────────────────────────────────────────────────────
function CompararPropostas(){
  const {acceptProposal,createCounterProposal,demands,proposals:appProposals}=useApp();
  const {user}=useAuth();
  const [selectedDemand,setSelectedDemand]=useState(null);
  const [selected,setSelected]=useState(null);
  const [scoreModal,setScoreModal]=useState(null);
  const [riskModal,setRiskModal]=useState(null);
  const allProposals=appProposals||[];
  const activeDemand=selectedDemand?demands.find(d=>d.id===selectedDemand):demands.find(d=>(d.proposals||0)>0)||demands[0];
  const proposals=activeDemand?allProposals.filter(p=>!p.demand_id||p.demand_id===activeDemand.id):allProposals;
  return(
    <div>
      <div style={{marginBottom:20,display:"flex",gap:16,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Comparar <span style={{color:"var(--amber)"}}>Propostas</span></h1>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{proposals.length} propostas · Matching explicável + Score de risco</div>
        </div>
        <select value={selectedDemand||""} onChange={e=>setSelectedDemand(e.target.value||null)} style={{width:"auto",minWidth:280}}>
          <option value="">{activeDemand?.id} · {activeDemand?.title?.substring(0,40)}</option>
          {demands.filter(d=>(d.proposals||0)>0).map(d=>(
            <option key={d.id} value={d.id}>{d.id} · {d.title?.substring(0,45)}</option>
          ))}
        </select>
      </div>
      {proposals.length===0&&(
        <Card style={{padding:28}}>
          <EmptyState
            icon={<BarChart2 size={48}/>}
            title="Comparador pronto"
            message="Selecione uma demanda com propostas recebidas para comparar preco, prazo, frete, risco, certificacao e score."
            action={{label:"Abrir demandas",onClick:()=>{window.history.pushState({}, "", "/demandas");window.dispatchEvent(new PopStateEvent("popstate"));}}}
          />
        </Card>
      )}
      {proposals.length>0&&(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
            <thead>
              <tr>
                <th style={{background:"var(--bg2)",border:"1px solid var(--border)",padding:"12px 14px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--white3)",textAlign:"left",fontWeight:400,width:140}}>Critério</th>
                {proposals.map(p=>(
                  <th key={p.id} style={{background:selected===p.id?"var(--amber-dim2)":"var(--bg2)",border:"1px solid var(--border)",padding:"12px 14px",borderBottom:selected===p.id?"2px solid var(--amber)":"1px solid var(--border)",cursor:"pointer",minWidth:180}} onClick={()=>setSelected(p.id===selected?null:p.id)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div>
                        <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",color:selected===p.id?"var(--amber)":"var(--white)",marginBottom:2}}>{p.supplier}</div>
                        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{p.city||"—"}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"var(--cond)",fontSize:24,fontWeight:900,color:"var(--amber)"}}>{p.score||"—"}</div>
                        <button onClick={e=>{e.stopPropagation();setScoreModal(p)}} style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",background:"transparent",border:"none",cursor:"pointer",letterSpacing:".08em",display:"flex",alignItems:"center",gap:3,marginLeft:"auto"}}>
                          <Info size={9}/>detalhes
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Preço total",p=>p.total,null],
                ["Preço unitário",p=>p.unit||"—",null],
                ["Prazo",p=>`${p.days} dias`,null],
                ["Frete",p=>p.frete||"—",null],
                ["Custo total",p=>{const t=parseInt((p.total||"0").replace(/\D/g,""));const f=parseInt((p.frete||"0").replace(/\D/g,""));return`R$ ${(t+f).toLocaleString("pt-BR")}`;},null],
                ["Avaliação",p=>p.rating?`${"★".repeat(Math.floor(p.rating))} ${p.rating}`:"—",null],
                ["Certificação",p=>p.cert||"—",null],
                ["Risco",p=>p,"risk"],
                ["Pagamento",p=>p.payment||"—",null],
              ].map(([label,fn,special])=>(
                <tr key={label} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{background:"var(--bg2)",border:"1px solid var(--border)",padding:"10px 14px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",color:"var(--white3)"}}>{label}</td>
                  {proposals.map(p=>{
                    if(special==="risk"){
                      return(
                        <td key={p.id} style={{background:selected===p.id?"rgba(232,160,32,.05)":"var(--bg)",border:"1px solid var(--border)",padding:"10px 14px"}}>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <Badge label={p.risk||"—"} color={RISK_COLORS[p.risk]||"var(--white3)"}/>
                            {p.riskFactors?.length>0&&<button onClick={()=>setRiskModal(p)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex"}}><Info size={12} color="var(--white3)"/></button>}
                          </div>
                        </td>
                      );
                    }
                    const v=fn(p);
                    const costs=proposals.map(x=>{const t=parseInt((x.total||"0").replace(/\D/g,""));const f=parseInt((x.frete||"0").replace(/\D/g,""));return t+f;});
                    const myTotal=parseInt((p.total||"0").replace(/\D/g,""))+parseInt((p.frete||"0").replace(/\D/g,""));
                    const isBest=label==="Custo total"&&myTotal===Math.min(...costs);
                    return(
                      <td key={p.id} style={{background:selected===p.id?"rgba(232,160,32,.05)":"var(--bg)",border:"1px solid var(--border)",padding:"10px 14px",fontFamily:"var(--mono)",fontSize:11,color:isBest?"var(--green)":"var(--white2)"}}>
                        {isBest&&<span style={{color:"var(--green)",marginRight:4}}>✓</span>}{v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td style={{background:"var(--bg2)",border:"1px solid var(--border)",padding:12}}/>
                {proposals.map(p=>(
                  <td key={p.id} style={{background:selected===p.id?"var(--amber-dim2)":"var(--bg)",border:"1px solid var(--border)",padding:12,textAlign:"center"}}>
                    <button
                      style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",background:"transparent",color:"var(--blue)",border:"1px solid rgba(59,130,246,.25)",padding:"8px 12px",cursor:"pointer",width:"100%",marginBottom:6}}
                      onClick={async()=>{
                        const raw=window.prompt("Valor da contraproposta em R$");
                        const value=Number(String(raw||"").replace(/\./g,"").replace(",","."));
                        if(!value||value<=0) return;
                        const total=`R$ ${value.toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
                        const prop=await createCounterProposal(p,{total,total_raw:value,obs:"Contraproposta enviada pelo demandante."});
                        if(prop) toast.success("Contraproposta enviada.");
                      }}>Contraproposta</button>
                    <button
                      style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",background:selected===p.id?"var(--amber)":"transparent",color:selected===p.id?"var(--bg)":"var(--white2)",border:`1px solid ${selected===p.id?"var(--amber)":"var(--border2)"}`,padding:"10px 18px",cursor:p.risk==="Crítico"?"not-allowed":"pointer",width:"100%",opacity:p.risk==="Crítico"?.5:1}}
                      onClick={()=>{
                        if(p.risk==="Crítico") return;
                        if(selected===p.id){acceptProposal(p,activeDemand||demands[0],user);toast.success(`Proposta aceita! Pedido criado para ${p.supplier}.`);setSelected(null);}
                        else setSelected(p.id);
                      }}>
                      {selected===p.id?"✓ Confirmar aceite":p.risk==="Crítico"?"⛔ Risco crítico":"Selecionar"}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <ScoreModal supplier={scoreModal} open={!!scoreModal} onClose={()=>setScoreModal(null)}/>
      <RiskModal proposal={riskModal} open={!!riskModal} onClose={()=>setRiskModal(null)}/>
    </div>
  );
}

// ─── BUSCAR FORNECEDORES (filtros funcionais) ─────────────────────────────────
function BuscarFornecedores({searchProp=""}){
  const {demands,companies,reviews}=useApp();
  const [scoreModal,setScoreModal]=useState(null);
  const [cotacaoModal,setCotacaoModal]=useState(null);
  const [demandaSel,setDemandaSel]=useState("");
  const [showFilters,setShowFilters]=useState(false);
  const [filterProcesso,setFilterProcesso]=useState("");
  const [filterLocal,setFilterLocal]=useState("");
  const [filterCert,setFilterCert]=useState("");
  const [filterRating,setFilterRating]=useState("");
  const [filterRisk,setFilterRisk]=useState("");
  const [searchText,setSearchText]=useState(searchProp);

  const BASE_SUPPLIERS=[
    {id:"PR-901",supplier:"MetalPrime Usinagem",city:"Recife/PE",segs:["Usinagem CNC","Torneamento"],rating:4.8,orders:32,idle:62,cert:["ISO 9001"],verified:true,score:91,machines:4,reply:"< 2h",risk:"Baixo",riskFactors:[]},
    {id:"PR-902",supplier:"Indfab Nordeste",city:"João Pessoa/PB",segs:["CNC","Corte Laser","Dobra"],rating:4.6,orders:18,idle:45,cert:["ISO 9001"],verified:true,score:87,machines:3,reply:"4h",risk:"Médio",riskFactors:["Prazo abaixo da média"]},
    {id:"PR-903",supplier:"Precisão Tech SP",city:"São Paulo/SP",segs:["Usinagem","Fresamento 5X"],rating:4.9,orders:67,idle:25,cert:["ISO 9001","IATF 16949"],verified:true,score:82,machines:8,reply:"1h",risk:"Alto",riskFactors:["Distância logística alta","Frete elevado"]},
    {id:"PR-904",supplier:"Usinagem Noroeste",city:"Caruaru/PE",segs:["Torneamento","Soldagem"],rating:3.8,orders:9,idle:78,cert:[],verified:false,score:72,machines:2,reply:"8h",risk:"Crítico",riskFactors:["Poucas avaliações","Sem certificação"]},
    {id:"PR-905",supplier:"Injetora Plásticos SA",city:"Mauá/SP",segs:["Injeção Plástica","Extrusão"],rating:4.7,orders:41,idle:40,cert:["ISO 9001"],verified:true,score:88,machines:6,reply:"2h",risk:"Baixo",riskFactors:[]},
    {id:"PR-906",supplier:"Confecção Têxtil NE",city:"Fortaleza/CE",segs:["Confecção","Costura"],rating:4.5,orders:22,idle:55,cert:[],verified:true,score:79,machines:10,reply:"3h",risk:"Médio",riskFactors:["Sem certificação ISO"]},
  ];
  // Enriquecer com companies aprovadas do contexto que não estejam na lista base
  const baseNames=BASE_SUPPLIERS.map(s=>s.supplier.toLowerCase());
  const extraSuppliers=(companies||[]).filter(c=>c.type==="Fornecedor"&&c.status==="Aprovado"&&!baseNames.includes(c.name.toLowerCase())).map(c=>{
    const compReviews=(reviews||[]).filter(r=>r.from===c.name);
    const avgR=compReviews.length?(compReviews.reduce((a,r)=>a+r.rating,0)/compReviews.length):4.0;
    return{id:c.id,supplier:c.name,city:c.city||"—",segs:["Processo Industrial"],rating:parseFloat(avgR.toFixed(1)),orders:c.orders||0,idle:50,cert:[],verified:c.status==="Aprovado",score:70,machines:1,reply:"—",risk:"Médio",riskFactors:["Novo na plataforma"]};
  });
  const SUPPLIERS=[...BASE_SUPPLIERS,...extraSuppliers];

  const filteredSuppliers=SUPPLIERS.filter(s=>{
    if(searchText&&!s.supplier.toLowerCase().includes(searchText.toLowerCase())&&!s.segs.join(" ").toLowerCase().includes(searchText.toLowerCase())) return false;
    if(filterProcesso&&!s.segs.some(sg=>sg.toLowerCase().includes(filterProcesso.toLowerCase()))) return false;
    if(filterLocal&&!s.city.toLowerCase().includes(filterLocal.toLowerCase())) return false;
    if(filterCert&&filterCert!=="Qualquer"&&(filterCert==="Com certificação"?s.cert.length===0:s.cert.length>0)) return false;
    if(filterRating&&s.rating<parseFloat(filterRating)) return false;
    if(filterRisk&&s.risk!==filterRisk) return false;
    return true;
  });

  const hasFilters=filterProcesso||filterLocal||(filterCert&&filterCert!=="Qualquer")||filterRating||filterRisk;

  const clearFilters=()=>{setFilterProcesso("");setFilterLocal("");setFilterCert("");setFilterRating("");setFilterRisk("");setSearchText("");};

  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Buscar <span style={{color:"var(--amber)"}}>Fornecedores</span></h1>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:3}}>{filteredSuppliers.length} de {SUPPLIERS.length} fábricas</div>
      </div>
      {/* Barra de busca e filtros rápidos */}
      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:300}}>
          <Search size={12} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--white3)"}}/>
          <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Buscar por nome ou processo..." style={{paddingLeft:34}}/>
        </div>
        <select value={filterProcesso} onChange={e=>setFilterProcesso(e.target.value)} style={{width:"auto",minWidth:150,fontSize:12}}>
          <option value="">Processo</option>
          {["Usinagem CNC","Torneamento","Fresamento","Injeção Plástica","Corte Laser","Soldagem","Confecção","Dobra"].map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} style={{width:"auto",minWidth:130,fontSize:12}}>
          <option value="">Nível de risco</option>
          {["Baixo","Médio","Alto","Crítico"].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={()=>setShowFilters(!showFilters)} style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",background:hasFilters?"var(--amber-dim2)":"transparent",border:`1px solid ${hasFilters?"rgba(232,160,32,.4)":"var(--border)"}`,color:hasFilters?"var(--amber)":"var(--white3)",padding:"0 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,height:40}}>
          <SlidersHorizontal size={11}/>{hasFilters?"Filtros ativos":"Mais filtros"}
        </button>
        {hasFilters&&<button onClick={clearFilters} style={{fontFamily:"var(--mono)",fontSize:9,background:"transparent",border:"none",color:"var(--red)",cursor:"pointer"}}>Limpar</button>}
      </div>
      {showFilters&&(
        <div style={{display:"flex",gap:10,padding:"14px",background:"var(--bg2)",border:"1px solid var(--border)",marginBottom:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180}}>
            <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:4}}>Localização</label>
            <input value={filterLocal} onChange={e=>setFilterLocal(e.target.value)} placeholder="Ex: Recife, SP, Nordeste..." style={{height:36,fontSize:12}}/>
          </div>
          <div style={{flex:1,minWidth:160}}>
            <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:4}}>Certificação</label>
            <select value={filterCert} onChange={e=>setFilterCert(e.target.value)} style={{height:36,fontSize:12}}>
              <option value="">Qualquer</option>
              <option value="Com certificação">Com certificação</option>
              <option value="Sem certificação">Sem certificação</option>
            </select>
          </div>
          <div style={{flex:1,minWidth:160}}>
            <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:4}}>Avaliação mínima</label>
            <select value={filterRating} onChange={e=>setFilterRating(e.target.value)} style={{height:36,fontSize:12}}>
              <option value="">Qualquer</option>
              {["3.0","3.5","4.0","4.5","4.8"].map(r=><option key={r} value={r}>{r}★ ou mais</option>)}
            </select>
          </div>
        </div>
      )}
      {filteredSuppliers.length===0&&(
        <Card style={{padding:40,textAlign:"center"}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",color:"var(--white3)"}}>Nenhum fornecedor encontrado</div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--white3)",marginTop:4}}>Ajuste os filtros para ampliar a busca</div>
          <div style={{marginTop:14}}><Btn small variant="ghost" onClick={clearFilters}>Limpar filtros</Btn></div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {filteredSuppliers.map(s=>(
          <Card key={s.id} style={{padding:"18px 22px",cursor:"pointer",transition:"border-color .2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(232,160,32,.3)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{display:"flex",gap:14,marginBottom:12}}>
              <div style={{width:42,height:42,background:"var(--amber-dim2)",border:"1px solid rgba(232,160,32,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--cond)",fontSize:18,fontWeight:800,color:"var(--amber)",flexShrink:0}}>{s.supplier.charAt(0)}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontFamily:"var(--cond)",fontSize:15,fontWeight:700,textTransform:"uppercase"}}>{s.supplier}</span>
                  {s.verified&&<Badge label="✓" color="var(--green)"/>}
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}><MapPin size={9}/> {s.city} · {s.machines} máq. · resp. {s.reply}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"var(--cond)",fontSize:28,fontWeight:900,color:"var(--amber)"}}>{s.score}</div>
                <button onClick={()=>setScoreModal(s)} style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--amber)",background:"transparent",border:"none",cursor:"pointer",letterSpacing:".08em",display:"flex",alignItems:"center",gap:3,marginLeft:"auto"}}>
                  <Info size={9}/>explicar
                </button>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
              {s.segs.map(sg=><Badge key={sg} label={sg} color="var(--blue)"/>)}
              {s.cert.map(c=><Badge key={c} label={c} color="var(--purple)"/>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
              {[["Avaliação",`${s.rating}★`],["Pedidos",s.orders],["Ocioso",`${s.idle}%`],["Risco",s.risk]].map(([l,v])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:700,color:l==="Risco"?RISK_COLORS[v]:"var(--amber)"}}>{v}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--white3)",letterSpacing:".08em",textTransform:"uppercase"}}>{l}</div>
                </div>
              ))}
            </div>
            <Btn full small variant="ghost" onClick={()=>setCotacaoModal(s)}>Solicitar cotação</Btn>
          </Card>
        ))}
      </div>
      <ScoreModal supplier={scoreModal} open={!!scoreModal} onClose={()=>setScoreModal(null)}/>
      <Modal open={!!cotacaoModal} onClose={()=>setCotacaoModal(null)} title={`Solicitar cotação · ${cotacaoModal?.supplier}`}>
        <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)",marginBottom:16}}>Selecione qual demanda você quer que <strong style={{color:"var(--white)"}}>{cotacaoModal?.supplier}</strong> responda.</div>
        <FormField label="Demanda para cotar">
          <select value={demandaSel} onChange={e=>setDemandaSel(e.target.value)}>
            <option value="">Selecione uma demanda...</option>
            {demands.filter(d=>d.status==="Publicado"||d.status==="Em cotação").map(d=>(
              <option key={d.id} value={d.id}>{d.id} · {d.title?.substring(0,50)}</option>
            ))}
          </select>
        </FormField>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn variant="ghost" onClick={()=>setCotacaoModal(null)}>Cancelar</Btn>
          <Btn icon={Send} onClick={()=>{if(!demandaSel){toast.error("Selecione uma demanda.");return;}toast.success(`Convite enviado para ${cotacaoModal?.supplier}!`);setCotacaoModal(null);setDemandaSel("");}}>Enviar convite</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── NOVA DEMANDA ─────────────────────────────────────────────────────────────
function NovaDemanda({setPage}){
  const {createDemand}=useApp();
  const {user}=useAuth();
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({title:"",cat:"",process:"",qty:"",unit:"peças",material:"",deadline:"",urgency:"Média",budget:"",location:"",nda:false,cert:false,type:"Preço fechado",obs:""});
  const up=k=>v=>setForm(f=>({...f,[k]:v}));
  const [uploadedFiles,setUploadedFiles]=useState([]);
  const fileRef=useRef(null);
  const procs=["Usinagem CNC","Torneamento","Fresamento","Corte a Laser","Dobra CNC","Soldagem MIG/TIG","Injeção Plástica","Estamparia","Pintura Industrial","Tratamento Térmico","Impressão 3D","Fundição","Caldeiraria"];
  const steps=["Especificação","Detalhes técnicos","Arquivos","Requisitos","Revisão"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <h1 style={{fontFamily:"var(--cond)",fontSize:30,fontWeight:800,textTransform:"uppercase"}}>Nova <span style={{color:"var(--amber)"}}>Demanda</span></h1>
        <Btn variant="ghost" small onClick={()=>setPage("demandas")}>Cancelar</Btn>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:24,border:"1px solid var(--border)"}}>
        {steps.map((s,i)=>(
          <div key={s} onClick={()=>i+1<step&&setStep(i+1)} style={{flex:1,padding:"12px 8px",background:step===i+1?"var(--amber-dim2)":step>i+1?"rgba(34,197,94,.05)":"var(--bg2)",borderRight:i<steps.length-1?"1px solid var(--border)":"none",cursor:i+1<step?"pointer":"default",textAlign:"center",borderBottom:step===i+1?"2px solid var(--amber)":"2px solid transparent"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:step===i+1?"var(--amber)":step>i+1?"var(--green)":"var(--white3)"}}>{step>i+1?"✓ ":""}{s}</div>
          </div>
        ))}
      </div>
      <div style={{maxWidth:680}}>
        {step===1&&<Card style={{padding:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Dados Básicos</div>
          <FormField label="Título da demanda *"><input value={form.title} onChange={e=>up("title")(e.target.value)} placeholder="Ex: Produção de 5.000 suportes metálicos aço carbono"/></FormField>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FormField label="Categoria"><select value={form.cat} onChange={e=>up("cat")(e.target.value)}><option value="">Selecione...</option>{["Usinagem","Metalurgia","Plástico","Têxtil","Caldeiraria","Eletrônica","Tratamento","Gráfica"].map(c=><option key={c}>{c}</option>)}</select></FormField>
            <FormField label="Processo necessário *"><select value={form.process} onChange={e=>up("process")(e.target.value)}><option value="">Selecione...</option>{procs.map(p=><option key={p}>{p}</option>)}</select></FormField>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            <FormField label="Quantidade"><input value={form.qty} onChange={e=>up("qty")(e.target.value)} placeholder="Ex: 5.000"/></FormField>
            <FormField label="Unidade"><select value={form.unit} onChange={e=>up("unit")(e.target.value)}>{["peças","kg","metros","lotes"].map(u=><option key={u}>{u}</option>)}</select></FormField>
          </div>
          <FormField label="Material *"><input value={form.material} onChange={e=>up("material")(e.target.value)} placeholder="Ex: Aço SAE 1020, PP copolímero..."/></FormField>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>{if(!form.title||!form.process||!form.material){toast.error("Preencha título, processo e material.");return;}setStep(2);}}>Próximo →</Btn></div>
        </Card>}
        {step===2&&<Card style={{padding:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Detalhes Técnicos e Comerciais</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FormField label="Prazo desejado"><input type="date" value={form.deadline} onChange={e=>up("deadline")(e.target.value)}/></FormField>
            <FormField label="Urgência"><select value={form.urgency} onChange={e=>up("urgency")(e.target.value)}>{["Baixa","Média","Alta","Crítica"].map(u=><option key={u}>{u}</option>)}</select></FormField>
            <FormField label="Tipo de contratação"><select value={form.type} onChange={e=>up("type")(e.target.value)}>{["Preço fechado","Hora-máquina","Por lote","Recorrente","Capacidade reservada"].map(t=><option key={t}>{t}</option>)}</select></FormField>
            <FormField label="Orçamento estimado (R$)"><input value={form.budget} onChange={e=>up("budget")(e.target.value)} placeholder="Ex: 25000"/></FormField>
          </div>
          <FormField label="Local de entrega"><input value={form.location||""} onChange={e=>up("location")(e.target.value)} placeholder="Cidade/UF onde será entregue"/></FormField>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <Btn variant="ghost" onClick={()=>setStep(1)}>← Voltar</Btn>
            <Btn onClick={()=>setStep(3)}>Próximo →</Btn>
          </div>
        </Card>}
        {step===3&&<Card style={{padding:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Arquivos Técnicos</div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.dwg,.dxf,.step,.stl,.xlsx,.png,.jpg,.jpeg" onChange={e=>{
            const files=Array.from(e.target.files||[]);
            setUploadedFiles(prev=>[...prev,...files.map(f=>({file:f,name:f.name,size:(f.size/1024/1024).toFixed(1)+" MB",confidential:false}))]);
            e.target.value="";
          }} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed var(--border2)",padding:"40px 28px",textAlign:"center",marginBottom:16,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(232,160,32,.5)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border2)"}>
            <Upload size={28} color="var(--white3)" style={{margin:"0 auto 10px"}}/>
            <div style={{fontFamily:"var(--cond)",fontSize:16,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Clique para selecionar arquivos</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".06em"}}>PDF · DWG · DXF · STEP · STL · XLSX · PNG · JPG · Máx. 50MB por arquivo</div>
          </div>
          {uploadedFiles.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"var(--bg3)",marginBottom:7}}>
              <FileText size={13} color="var(--amber)"/>
              <span style={{flex:1,fontFamily:"var(--mono)",fontSize:10}}>{f.name}</span>
              <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)"}}>{f.size}</span>
              <label style={{display:"flex",gap:5,fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",cursor:"pointer",flexShrink:0}}>
                <input type="checkbox" checked={f.confidential} onChange={e=>setUploadedFiles(fs=>fs.map((x,j)=>j===i?{...x,confidential:e.target.checked}:x))} style={{width:"auto",accentColor:"var(--amber)"}}/>🔒 Confidencial
              </label>
              <button onClick={()=>setUploadedFiles(fs=>fs.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--red)"}}><X size={12}/></button>
            </div>
          ))}
          {uploadedFiles.length===0&&<div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",textAlign:"center",paddingBottom:8}}>Nenhum arquivo selecionado. Arquivos são opcionais.</div>}
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <Btn variant="ghost" onClick={()=>setStep(2)}>← Voltar</Btn>
            <Btn onClick={()=>setStep(4)}>Próximo →</Btn>
          </div>
        </Card>}
        {step===4&&<Card style={{padding:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Requisitos Adicionais</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            {[["nda","🔒 NDA obrigatório","Fornecedores precisam assinar NDA antes de ver os arquivos confidenciais."],["cert","📋 Exige certificação","Apenas fornecedores com ISO, IATF ou outra certificação poderão cotar."]].map(([k,t,d])=>(
              <div key={k} style={{background:"var(--bg3)",border:"1px solid var(--border)",padding:16}}>
                <label style={{display:"flex",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={form[k]} onChange={e=>up(k)(e.target.checked)} style={{width:"auto",marginTop:2,accentColor:"var(--amber)"}}/>
                  <div>
                    <div style={{fontFamily:"var(--cond)",fontSize:14,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{t}</div>
                    <div style={{fontFamily:"var(--body)",fontSize:12,fontWeight:300,color:"var(--white2)"}}>{d}</div>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <FormField label="Observações gerais"><textarea value={form.obs} onChange={e=>up("obs")(e.target.value)} rows={3} placeholder="Informações adicionais..."/></FormField>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <Btn variant="ghost" onClick={()=>setStep(3)}>← Voltar</Btn>
            <Btn onClick={()=>setStep(5)}>Próximo →</Btn>
          </div>
        </Card>}
        {step===5&&<Card style={{padding:28}}>
          <div style={{fontFamily:"var(--cond)",fontSize:18,fontWeight:700,textTransform:"uppercase",marginBottom:20}}>Revisão Final</div>
          {[["Título",form.title||"—"],["Processo",form.process||"—"],["Quantidade",`${form.qty||"?"} ${form.unit}`],["Material",form.material||"—"],["Urgência",form.urgency],["NDA",form.nda?"Obrigatório":"Não"],["Certificação",form.cert?"Obrigatória":"Não"],["Arquivos",`${uploadedFiles.length} arquivo(s) selecionado(s)`]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--white3)",letterSpacing:".1em",textTransform:"uppercase"}}>{k}</span>
              <span style={{fontFamily:"var(--body)",fontSize:13,fontWeight:500}}>{v}</span>
            </div>
          ))}
          <div style={{background:"var(--amber-dim)",border:"1px solid rgba(232,160,32,.3)",padding:"14px 18px",marginTop:16,marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--amber)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>⚡ Matching automático</div>
            <div style={{fontFamily:"var(--body)",fontSize:13,fontWeight:300,color:"var(--white2)"}}><strong style={{color:"var(--white)"}}>23 fábricas compatíveis</strong> serão notificadas automaticamente.</div>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <Btn variant="ghost" onClick={()=>setStep(4)}>← Voltar</Btn>
            <Btn icon={Send} onClick={async()=>{
              if(!form.title||!form.process||!form.material){toast.error("Volte ao passo 1 e preencha título, processo e material.");return;}
              try{
                const created=await createDemand({title:form.title,category:form.cat||"Geral",process:form.process,material:form.material,qty:`${form.qty||"?"} ${form.unit}`,deadline:form.deadline||"A definir",urgency:form.urgency,budget:form.budget?`R$ ${form.budget}`:"A definir",location:form.location||"A definir",nda:form.nda,cert:form.cert?"ISO 9001":"Nenhuma",obs:form.obs},user);
                if(uploadedFiles.length){
                  const fd=new FormData();
                  uploadedFiles.forEach(f=>fd.append("files",f.file));
                  const up=await apiFetch(`/demands/${created.id}/attachments`,{method:"POST",body:fd});
                  if(!up.ok) toast.warning("Demanda publicada, mas alguns anexos não foram enviados.");
                }
              toast.success("Demanda publicada! Fornecedores compatíveis serão notificados.");
              setPage("demandas");
              }catch(e){toast.error(e.message||"Erro ao publicar demanda.");}
            }}>Publicar Demanda</Btn>
          </div>
        </Card>}
      </div>
    </div>
  );
}
