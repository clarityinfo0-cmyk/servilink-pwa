
"use client";

import { useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge, UrgencyBadge } from '@/components/dashboard-ui';
import { Loader2, Eye, ShieldAlert, Banknote, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProfile } from '../../layout';
import { cn } from '@/lib/utils';

export default function AdminTicketsPage() {
  const db = useFirestore();
  const router = useRouter();
  const { profile, isLoading: loadingProfile } = useProfile();

  useEffect(() => {
    if (!loadingProfile && profile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, loadingProfile, router]);

  const allTicketsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return query(
      collection(db, 'serviceTickets'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
  }, [db, profile?.role]);

  const { data: tickets, isLoading: isLoadingTickets } = useCollection(allTicketsQuery);

  if (loadingProfile || (isLoadingTickets && profile?.role === 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-headline font-black text-primary tracking-tight">Auditoría Global</h1>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Monitoreo de servicios y liquidaciones financieras</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden rounded-[32px]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="font-black text-[10px] uppercase">Ticket / Cliente</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Monto Total</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Liquidación Técnico</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tickets || tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-300 italic font-bold">No hay servicios registrados.</TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const laborBase = Number(ticket.formalQuotation?.laborCostBase || 0);
                  const materialsBase = (ticket.formalQuotation?.materials || []).reduce((acc: number, m: any) => acc + Number(m.totalBase || 0), 0);
                  const payoutToTech = laborBase + materialsBase;

                  return (
                    <TableRow key={ticket.id} className="hover:bg-slate-50/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm">{ticket.title}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{ticket.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell>
                        <span className="font-black text-slate-900">$ {Number(ticket.totalCost || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {ticket.status === 'terminado' ? (
                          ticket.techPaidByAdmin ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-black text-[9px] gap-1 px-3 py-1">
                              <CheckCircle2 className="w-3 h-3" /> LIQUIDADO $ {payoutToTech.toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-600 border-amber-200 font-black text-[9px] gap-1 px-3 py-1 animate-pulse">
                              <Banknote className="w-3 h-3" /> PENDIENTE $ {payoutToTech.toLocaleString()}
                            </Badge>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-300 font-black uppercase">En curso</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)} className="h-8 font-black gap-2">
                          <Eye className="w-4 h-4" /> Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
