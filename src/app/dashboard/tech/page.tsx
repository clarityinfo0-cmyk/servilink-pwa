"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { collection, query, where, limit } from 'firebase/firestore';
import { useProfile } from '../layout';
import { StatusBadge, UrgencyBadge } from '@/components/dashboard-ui';
import { 
  Wrench, 
  ClipboardList, 
  Loader2, 
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export default function TechWorkspacePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { profile, isLoading: loadingProfile } = useProfile();

  // Consultas simplificadas para evitar errores de índices
  const myJobsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || profile?.role !== 'technician') return null;
    return query(
      collection(db, 'serviceTickets'), 
      where('technicianId', '==', user.uid),
      limit(50)
    );
  }, [db, user?.uid, profile?.role]);

  const availableJobsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || profile?.role !== 'technician') return null;
    return query(
      collection(db, 'serviceTickets'), 
      where('status', '==', 'pendiente'),
      limit(50)
    );
  }, [db, user?.uid, profile?.role]);

  const { data: myJobsRaw, isLoading: loadingMyJobs } = useCollection(myJobsQuery);
  const { data: availableJobsRaw, isLoading: loadingAvailable } = useCollection(availableJobsQuery);

  // Ordenamiento manual para garantizar estabilidad sin índices compuestos
  const myJobs = useMemo(() => {
    if (!myJobsRaw) return [];
    return [...myJobsRaw].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [myJobsRaw]);

  const availableJobs = useMemo(() => {
    if (!availableJobsRaw) return [];
    return [...availableJobsRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [availableJobsRaw]);

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Cargando espacio de trabajo...</p>
      </div>
    );
  }

  if (profile?.role !== 'technician') {
    return (
      <Card className="p-8 text-center bg-rose-50 border-rose-100">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-rose-800">Acceso Restringido</h2>
        <p className="text-rose-600">Este espacio es exclusivo para especialistas verificados.</p>
        <Button className="mt-6" onClick={() => router.push('/dashboard')}>Volver al Panel</Button>
      </Card>
    );
  }

  const renderTicketList = (list: any[], emptyMsg: string) => (
    <div className="grid gap-4">
      {!list || list.length === 0 ? (
        <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium italic">{emptyMsg}</p>
        </Card>
      ) : (
        list.map((ticket) => (
          <Card 
            key={ticket.id} 
            className="group hover:border-primary/40 transition-all cursor-pointer rounded-3xl overflow-hidden border-l-[6px] border-l-primary bg-white shadow-sm"
            onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] uppercase font-black">{ticket.categoryId || 'General'}</Badge>
                  {ticket.urgency && <UrgencyBadge urgency={ticket.urgency} />}
                </div>
                <h3 className="font-black text-xl text-slate-800 group-hover:text-primary transition-colors">{ticket.title}</h3>
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
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-headline font-black text-primary tracking-tight flex items-center gap-3">
          Centro de Especialistas <Wrench className="w-8 h-8 text-accent" />
        </h1>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Gestiona tu agenda y encuentra nuevos servicios</p>
      </div>

      <Tabs defaultValue="my-jobs" className="w-full">
        <TabsList className="bg-slate-100 rounded-2xl p-1 h-14 mb-8">
          <TabsTrigger value="my-jobs" className="rounded-xl font-black px-8 h-full">Mis Trabajos Activos ({myJobs.length})</TabsTrigger>
          <TabsTrigger value="available" className="rounded-xl font-black px-8 h-full">Mercado de Servicios ({availableJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-jobs">
          {loadingMyJobs ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-200" /></div>
          ) : renderTicketList(myJobs, "No tienes trabajos asignados actualmente.")}
        </TabsContent>

        <TabsContent value="available">
          {loadingAvailable ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-200" /></div>
          ) : renderTicketList(availableJobs, "No hay nuevos servicios publicados en este momento.")}
        </TabsContent>
      </Tabs>
    </div>
  );
}