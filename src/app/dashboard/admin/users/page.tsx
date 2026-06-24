"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, UserCheck, Eye, Loader2, IdCard, User, Ban, ShieldAlert, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useProfile } from '../../layout';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function UsersAdminPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const { profile, isLoading: loadingProfile } = useProfile();
  const [penaltyText, setPenaltyText] = useState("");

  useEffect(() => {
    if (!loadingProfile && profile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, loadingProfile, router]);

  const techsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return collection(db, 'technicianProfiles');
  }, [db, profile?.role]);

  const clientsQuery = useMemoFirebase(() => {
    if (!db || profile?.role !== 'admin') return null;
    return collection(db, 'clientProfiles');
  }, [db, profile?.role]);

  const { data: technicians, isLoading: loadingTechs } = useCollection(techsQuery);
  const { data: clients, isLoading: loadingClients } = useCollection(clientsQuery);

  const handleUpdateStatus = async (id: string, collectionName: string, status: string) => {
    try {
      const userRef = doc(db, collectionName, id);
      await updateDoc(userRef, { 
        verificationStatus: status,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Estado Actualizado", description: `El usuario ahora está ${status}.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };

  const handleToggleSuspension = async (user: any, collectionName: string) => {
    try {
      const userRef = doc(db, collectionName, user.id);
      await updateDoc(userRef, { 
        isSuspended: !user.isSuspended,
        penaltyReason: penaltyText || (user.isSuspended ? "" : "Incumplimiento de términos ServiLink."),
        updatedAt: new Date().toISOString()
      });
      toast({ 
        title: user.isSuspended ? "Cuenta Activada" : "Cuenta SUSPENDIDA 🚫", 
        variant: user.isSuspended ? "default" : "destructive" 
      });
      setPenaltyText("");
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cambiar el estatus.", variant: "destructive" });
    }
  };

  if (loadingProfile || ((loadingTechs || loadingClients) && profile?.role === 'admin')) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const UserDetailDialog = ({ user, col }: { user: any, col: string }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-bold">
          <Eye className="w-3.5 h-3.5" /> Revisar Docs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-[32px] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3">
            Auditoría: {user.name || `${user.firstName || ''} ${user.lastName || ''}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-slate-400">Identidad</Label>
            <div className="aspect-square bg-slate-100 rounded-[28px] overflow-hidden border-2 border-slate-200">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Rostro" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-slate-400">Control Disciplinario</Label>
            <div className={cn("p-6 rounded-3xl border-2 space-y-4", user.isSuspended ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200")}>
              {user.isSuspended ? (
                <div className="space-y-2">
                  <Badge variant="destructive" className="font-black">CUENTA BLOQUEADA</Badge>
                  <p className="text-xs text-rose-700 font-bold italic">"{user.penaltyReason}"</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">Esta cuenta está activa. Puedes suspenderla si el usuario viola las políticas de ServiLink Pro.</p>
              )}
              
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase">Motivo (Opcional)</Label>
                <Input 
                  placeholder="Ej: Abuso de garantía / No pago" 
                  className="h-10 text-xs bg-white" 
                  value={penaltyText}
                  onChange={(e) => setPenaltyText(e.target.value)}
                />
              </div>

              <Button 
                variant={user.isSuspended ? "default" : "destructive"} 
                className="w-full h-12 rounded-xl font-black gap-2"
                onClick={() => handleToggleSuspension(user, col)}
              >
                {user.isSuspended ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                {user.isSuspended ? "ACTIVAR CUENTA" : "SUSPENDER CUENTA"}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 mt-8">
          {user.verificationStatus !== 'verified' && (
            <Button onClick={() => handleUpdateStatus(user.id, col, 'verified')} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl gap-2 shadow-xl">
              <ShieldCheck className="w-5 h-5" /> VERIFICAR IDENTIDAD ⭐
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const calculateReputation = (u: any) => {
    const points = Number(u.totalRatingPoints || 0);
    const count = Number(u.ratingCount || 0);
    // Si no hay reseñas, mostramos 5.0 por defecto
    return count > 0 ? (points / count).toFixed(1) : "5.0";
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary tracking-tight">Gestión de Red</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Control de verificación y sanciones disciplinarias</p>
        </div>
      </div>

      <Tabs defaultValue="technicians" className="w-full">
        <TabsList className="bg-slate-100 rounded-2xl p-1 h-14 mb-8">
          <TabsTrigger value="technicians" className="rounded-xl font-black px-8 h-full">Especialistas</TabsTrigger>
          <TabsTrigger value="clients" className="rounded-xl font-black px-8 h-full">Clientes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="technicians">
          <Card className="border-none shadow-sm overflow-hidden rounded-[32px]">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase">Especialista</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Reputación</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Estatus</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians?.map((tech) => (
                    <TableRow key={tech.id} className={cn("hover:bg-slate-50/30", tech.isSuspended && "bg-rose-50/30 opacity-70")}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                            {tech.profileImageUrl ? <img src={tech.profileImageUrl} alt="" className="object-cover" /> : <AvatarFallback>{tech.firstName?.charAt(0)}</AvatarFallback>}
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm">{tech.firstName} {tech.lastName}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{tech.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-black text-xs text-slate-700">{calculateReputation(tech)}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({tech.ratingCount || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "capitalize font-black text-[9px] px-3 py-1 rounded-full",
                          tech.verificationStatus === 'verified' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {tech.verificationStatus || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserDetailDialog user={tech} col="technicianProfiles" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="border-none shadow-sm overflow-hidden rounded-[32px]">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-[10px] uppercase">Propietario</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Reputación</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Estatus</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.map((client) => (
                    <TableRow key={client.id} className={cn("hover:bg-slate-50/30", client.isSuspended && "bg-rose-50/30 opacity-70")}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                            {client.profileImageUrl ? <img src={client.profileImageUrl} alt="" className="object-cover" /> : <AvatarFallback>{client.name?.charAt(0)}</AvatarFallback>}
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm">{client.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{client.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-black text-xs text-slate-700">{calculateReputation(client)}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({client.ratingCount || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "capitalize font-black text-[9px] px-3 py-1 rounded-full",
                          client.verificationStatus === 'verified' ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"
                        )}>
                          {client.verificationStatus || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserDetailDialog user={client} col="clientProfiles" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}