"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { collection, query, where, limit } from 'firebase/firestore';
import { useProfile } from './layout';
import { StatusBadge, UrgencyBadge, WarrantyBadge, StatCard } from '@/components/dashboard-ui';
import { 
  ClipboardList, 
  PlusCircle,
  Loader2,
  ShieldCheck,
  Users,
  Banknote,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Receipt,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { profile, isLoading: loadingProfile } = useProfile();

  // Consultas globales para Admin
  const allTicketsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return collection(db, 'serviceTickets');
  }, [db, profile?.role]);

  const { data: allTickets, isLoading: loadingAll } = useCollection(allTicketsQuery);

  // Consultas específicas para Cliente/Técnico
  const clientTicketsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || profile?.role !== 'client') return null;
    return query(
      collection(db, 'serviceTickets'), 
      where('clientId', '==', user.uid),
      limit(20)
    );
  }, [db, user?.uid, profile?.role]);

  const techPendingQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || profile?.role !== 'technician') return null;
    return query(
      collection(db, 'serviceTickets'), 
      where('status', '==', 'pendiente'),
      limit(20)
    );
  }, [db, user?.uid, profile?.role]);

  const techAssignedQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || profile?.role !== 'technician') return null;
    return query(
      collection(db, 'serviceTickets'), 
      where('technicianId', '==', user.uid),
      limit(50)
    );
  }, [db, user?.uid, profile?.role]);

  const { data: clientTicketsRaw, isLoading: loadingClient } = useCollection(clientTicketsQuery);
  const { data: techPendingRaw, isLoading: loadingPending } = useCollection(techPendingQuery);
  const { data: techAssignedRaw, isLoading: loadingAssigned } = useCollection(techAssignedQuery);

  // Cálculos Financieros Detallados
  const stats = useMemo(() => {
    if (profile?.role === 'admin' && allTickets) {
      let revenue = 0;
      let profit = 0;
      let pendingToTechs = 0;

      allTickets.forEach(t => {
        const total = Number(t.totalCost || 0);
        const quote = t.formalQuotation;
        
        // Ingresos confirmados (ya validados por admin)
        if (t.adminPaymentReceived) {
          revenue += total;
          
          if (quote) {
            const laborBase = Number(quote.laborCostBase || 0);
            const materialsBase = (quote.materials || []).reduce((acc: number, m: any) => acc + Number(m.totalBase || 0), 0);
            const techGets = laborBase + materialsBase;
            const platformEarnings = total - techGets;
            
            profit += platformEarnings;
          }
        }

        // Lógica de detección de pagos pendientes (Faltan de pagar a técnicos)
        if (t.status === 'terminado' && !t.techPaidByAdmin && quote) {
          const laborBase = Number(quote.laborCostBase || 0);
          const materialsBase = (quote.materials || []).reduce((acc: number, m: any) => acc + Number(m.totalBase || 0), 0);
          pendingToTechs += (laborBase + materialsBase);
        }
      });
      return { totalRevenue: revenue, platformProfit: profit, pendingPayouts: pendingToTechs };
    }

    if (profile?.role === 'technician' && techAssignedRaw) {
      let earned = 0;
      let pending = 0;

      techAssignedRaw.forEach(t => {
        const quote = t.formalQuotation;
        if (quote) {
          const laborBase = Number(quote.laborCostBase || 0);
          const materialsBase = (quote.materials || []).reduce((acc: number, m: any) => acc + Number(m.totalBase || 0), 0);
          const techGets = laborBase + materialsBase;

          if (t.techPaidByAdmin) {
            earned += techGets;
          } else if (t.status === 'terminado') {
            // Faltan de pagarme como técnico
            pending += techGets;
          }
        }
      });
      return { techEarned: earned, techPending: pending };
    }

    return {};
  }, [allTickets, techAssignedRaw, profile?.role]);

  const sortedClientTickets = useMemo(() => {
    if (!clientTicketsRaw) return [];
    return [...clientTicketsRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clientTicketsRaw]);

  const sortedTechPending = useMemo(() => {
    if (!techPendingRaw) return [];
    return [...techPendingRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [techPendingRaw]);

  const sortedTechAssigned = useMemo(() => {
    if (!techAssignedRaw) return [];
    return [...techAssignedRaw].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [techAssignedRaw]);

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Sincronizando identidad...</p>
      </div>
    );
  }

  if (profile?.role === 'admin') {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="bg-primary text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-4xl font-headline font-black mb-2 flex items-center gap-3">
              Panel Maestro Admin <ShieldCheck className="w-8 h-8 text-accent" />
            </h1>
            <p className="opacity-80 font-medium max-w-lg">Control total de la red ServiLink. Supervisa la calidad y gestiona las liquidaciones.</p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Button onClick={() => router.push('/dashboard/admin/users')} className="bg-white text-primary rounded-2xl h-14 px-8 font-black gap-2">
                <Users className="w-5 h-5" /> Validar Usuarios
              </Button>
              <Button onClick={() => router.push('/dashboard/admin/tickets')} variant="outline" className="border-white text-white rounded-2xl h-14 px-8 font-black gap-2">
                <ClipboardList className="w-5 h-5" /> Auditoría Global
              </Button>
              <Button onClick={() => router.push('/dashboard/profile')} className="bg-accent text-white rounded-2xl h-14 px-8 font-black gap-2 shadow-lg">
                <Receipt className="w-5 h-5" /> Configurar Mis Cuentas
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Recaudación Cobrada" value={`$ ${(stats.totalRevenue || 0).toLocaleString()}`} icon={TrendingUp} color="bg-emerald-600" />
          <StatCard title="Utilidad ServiLink" value={`$ ${(stats.platformProfit || 0).toLocaleString()}`} icon={Receipt} color="bg-primary" />
          <StatCard title="Faltan de Pagar (Técnicos)" value={`$ ${(stats.pendingPayouts || 0).toLocaleString()}`} icon={Wallet} color="bg-amber-500" />
        </div>
      </div>
    );
  }

  const renderTicketList = (list: any[]) => (
    <div className="grid gap-4">
      {list.map((ticket) => (
        <Card 
          key={ticket.id} 
          className={cn(
            "hover:border-primary/40 transition-all cursor-pointer rounded-3xl overflow-hidden border-l-[6px] bg-white shadow-sm",
            ticket.status === 'garantia_reclamada' ? "border-l-rose-600 ring-2 ring-rose-100" : "border-l-primary"
          )}
          onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px] uppercase font-black">{ticket.categoryId || 'General'}</Badge>
                {ticket.urgency && <UrgencyBadge urgency={ticket.urgency} />}
                {ticket.status === 'terminado' && <WarrantyBadge ticket={ticket} />}
              </div>
              <h3 className="font-black text-xl text-slate-800">{ticket.title}</h3>
              <p className="text-sm text-slate-500 truncate mt-1 italic">{ticket.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <StatusBadge status={ticket.status} />
              <span className="text-[10px] text-slate-400 font-black uppercase">
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '--'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary tracking-tight">
            Hola, {profile?.name || profile?.firstName || 'Usuario'} 👋
          </h1>
          <Badge variant="secondary" className="uppercase text-[10px] font-black tracking-widest bg-primary/10 text-primary mt-1">
            {profile?.role === 'client' ? 'Propietario' : 'Especialista Verificado'}
          </Badge>
        </div>
        {profile?.role === 'client' && (
          <div className="flex gap-3">
             <Button 
              onClick={() => router.push('/dashboard/client/create?emergency=true')} 
              className="h-14 px-8 rounded-2xl bg-rose-600 font-black text-lg shadow-xl shadow-rose-200"
            >
              <AlertTriangle className="w-5 h-5 mr-2" /> SOS
            </Button>
            <Button onClick={() => router.push('/dashboard/client/create')} variant="outline" className="h-14 px-8 rounded-2xl border-2 border-primary text-primary font-black">
              <PlusCircle className="w-5 h-5 mr-2" /> Reportar Falla
            </Button>
          </div>
        )}
      </div>

      {profile?.role === 'technician' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Mis Cobros Recibidos" value={`$ ${(stats.techEarned || 0).toLocaleString()}`} icon={Banknote} color="bg-emerald-600" />
          <StatCard title="Faltan de Pagarme" value={`$ ${(stats.techPending || 0).toLocaleString()}`} icon={History} color="bg-amber-500" />
        </div>
      )}

      {profile?.role === 'client' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-primary flex items-center gap-2">Mis Reportes</h2>
            <Button variant="ghost" onClick={() => router.push('/dashboard/client/history')} className="text-accent font-black uppercase text-xs">Historial de la Casa →</Button>
          </div>
          {loadingClient ? <Loader2 className="w-10 h-10 animate-spin mx-auto" /> : renderTicketList(sortedClientTickets)}
        </div>
      ) : (
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="bg-slate-100 rounded-2xl p-1 h-14 mb-8">
            <TabsTrigger value="assigned" className="rounded-xl font-black px-8 h-full">Mis Trabajos ({sortedTechAssigned.length})</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl font-black px-8 h-full">Disponibles ({sortedTechPending.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">
            {loadingAssigned ? <Loader2 className="w-10 h-10 animate-spin mx-auto" /> : renderTicketList(sortedTechAssigned)}
          </TabsContent>

          <TabsContent value="pending">
            {loadingPending ? <Loader2 className="w-10 h-10 animate-spin mx-auto" /> : renderTicketList(sortedTechPending)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
