"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  History, 
  ShieldCheck, 
  FileDown,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Zap,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/dashboard-ui';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useProfile } from '../../layout';
import { useMemo } from 'react';

const ZONES = [
  { id: 'kitchen', label: 'Cocina', icon: '🍳' },
  { id: 'bathroom', label: 'Baño', icon: '🚿' },
  { id: 'living_room', label: 'Estancia', icon: '🛋️' },
  { id: 'bedroom', label: 'Recámara', icon: '🛏️' },
  { id: 'garden', label: 'Jardín', icon: '🌳' },
  { id: 'roof', label: 'Azotea', icon: '🏠' },
  { id: 'general', label: 'General', icon: '🛠️' },
];

export default function HomeHistoryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useProfile();

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'serviceTickets'),
      where('clientId', '==', user.uid)
    );
  }, [db, user?.uid]);

  const { data: historyRaw, isLoading } = useCollection(historyQuery);

  // Ordenamiento en memoria para evitar errores de índice compuesto
  const history = useMemo(() => {
    if (!historyRaw) return [];
    return [...historyRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [historyRaw]);

  const handleExportPDF = () => {
    const finishedJobs = history?.filter(j => j.status === 'terminado') || [];
    if (finishedJobs.length === 0) {
      toast({
        title: "Historial insuficiente",
        description: "Necesitas al menos un servicio terminado para generar el certificado de mantenimiento.",
        variant: "destructive"
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });

      doc.setDrawColor(41, 128, 185); 
      doc.setLineWidth(0.5);
      doc.rect(5, 5, 200, 287);
      
      doc.setFillColor(41, 128, 185);
      doc.rect(5, 5, 200, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICADO DE MANTENIMIENTO TÉCNICO", 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Red de Especialistas Verificados ServiLink Pro", 105, 35, { align: 'center' });

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL TITULAR Y ACTIVO", 15, 65);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 68, 195, 68);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`PROPIETARIO: ${profile?.name || 'Usuario ServiLink'}`, 15, 75);
      doc.text(`ID PROPIEDAD: ${user?.uid}`, 15, 81);
      doc.text(`FECHA DE EMISIÓN: ${dateStr}`, 15, 87);
      doc.text(`NIVEL DE CERTIFICACIÓN: ACTIVO VERIFICADO ⭐`, 15, 93);

      doc.setDrawColor(46, 204, 113); 
      doc.setLineWidth(1);
      doc.circle(175, 80, 15);
      doc.setTextColor(46, 204, 113);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("SISTEMA", 175, 78, { align: 'center' });
      doc.text("VERIFICADO", 175, 82, { align: 'center' });
      doc.text("SERVILINK", 175, 86, { align: 'center' });

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BITÁCORA TÉCNICA Y GARANTÍAS VIGENTES", 15, 115);

      const tableRows = finishedJobs.map(job => {
        const quote = job.formalQuotation;
        const warrantyInfo = job.warrantyDays ? `GARANTÍA: ${job.warrantyDays} días` : 'GARANTÍA: Estándar (30 días)';
        let breakdown = `TRABAJO: ${quote?.laborDescription || job.description}\n\n${warrantyInfo}\n`;
        
        if (quote?.materials && quote.materials.length > 0) {
          breakdown += `\nMATERIALES:\n`;
          quote.materials.forEach((m: any) => {
            breakdown += `- ${m.quantity}x ${m.description}\n`;
          });
        }
        
        return [
          new Date(job.createdAt).toLocaleDateString(),
          job.title,
          ZONES.find(z => z.id === job.zone)?.label || 'General',
          breakdown
        ];
      });

      (doc as any).autoTable({
        startY: 120,
        head: [['FECHA', 'SERVICIO', 'ZONA', 'DETALLE TÉCNICO Y GARANTÍA']],
        body: tableRows,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, cellPadding: 5 },
        columnStyles: {
          3: { cellWidth: 80 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "italic");
      const footerText = "Este documento certifica que la propiedad listada ha sido intervenida por técnicos profesionales. Las garantías aquí estipuladas son responsabilidad directa del especialista asignado y están respaldadas por el expediente digital de ServiLink Pro.";
      const splitFooter = doc.splitTextToSize(footerText, 180);
      doc.text(splitFooter, 15, finalY + 15);

      doc.setFont("helvetica", "bold");
      doc.text("AUTENTICACIÓN DIGITAL: " + Math.random().toString(36).substring(2).toUpperCase(), 15, finalY + 30);

      doc.save(`Certificado_Mantenimiento_Pro_${dateStr.replace(/ /g, '_')}.pdf`);

      toast({
        title: "Certificado Generado",
        description: "El expediente técnico de tu hogar se ha descargado."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary tracking-tight flex items-center gap-3">
            <Home className="w-10 h-10" /> Mi Casa <span className="text-accent">Pro</span>
          </h1>
          <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mt-1">
            Expediente Digital y Línea de Tiempo
          </p>
        </div>
        <Button 
          onClick={handleExportPDF}
          className="rounded-2xl h-12 gap-2 shadow-lg font-bold bg-emerald-600 hover:bg-emerald-700 transition-all hover:scale-105"
        >
          <FileDown className="w-5 h-5" /> Exportar Certificado PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-none shadow-xl bg-primary text-white overflow-hidden">
            <CardContent className="p-8 space-y-4">
              <div className="p-3 bg-white/20 rounded-2xl w-fit">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black">Certificación Pro</h3>
              <p className="text-xs text-white/80 font-medium italic leading-relaxed">
                Descarga el aval técnico de tu hogar para trámites de venta, renta o seguros.
              </p>
              <Badge className="bg-white text-primary font-black uppercase tracking-tighter">
                Verified Asset
              </Badge>
            </CardContent>
          </Card>
        </aside>

        <main className="lg:col-span-3">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-100 rounded-2xl p-1 h-14 mb-8">
              <TabsTrigger value="all" className="rounded-xl font-black px-8 h-full">Todo el Historial</TabsTrigger>
              <TabsTrigger value="emergency" className="rounded-xl font-black px-8 h-full">Emergencias (SOS)</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {isLoading ? (
                <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-200" /></div>
              ) : history.length === 0 ? (
                <Card className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <History className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold italic">No hay reportes registrados aún.</p>
                </Card>
              ) : (
                <div className="relative pl-10 border-l-4 border-slate-200 space-y-10">
                  {history.map((job) => (
                    <div key={job.id} className="relative group">
                      <div className={cn(
                        "absolute -left-[54px] top-0 w-10 h-10 rounded-full bg-white border-4 flex items-center justify-center shadow-xl z-10",
                        job.isEmergency ? "border-rose-500" : "border-primary"
                      )}>
                        {job.status === 'terminado' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : job.isEmergency ? (
                          <Zap className="w-5 h-5 text-rose-500 fill-rose-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <Card 
                        className={cn(
                          "rounded-[32px] border-none shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer",
                          job.isEmergency && "ring-2 ring-rose-100 bg-rose-50/10"
                        )}
                        onClick={() => router.push(`/dashboard/tickets/${job.id}`)}
                      >
                        <CardHeader className="p-8 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                              {new Date(job.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2">
                              {job.isEmergency && <Badge className="bg-rose-600 text-white font-black text-[9px] uppercase tracking-tighter animate-pulse">SOS 2H</Badge>}
                              <StatusBadge status={job.status} />
                            </div>
                          </div>
                          <CardTitle className="text-2xl font-black text-primary flex items-center gap-3">
                            {ZONES.find(z => z.id === (job.zone || 'general'))?.icon || '🛠️'} {job.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                          <p className="text-sm text-slate-600 italic line-clamp-2">"{job.description}"</p>
                          {job.warrantyDays && (
                            <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                              <ShieldCheck className="w-4 h-4" /> Garantía de {job.warrantyDays} días activa
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="emergency">
              <div className="space-y-6">
                {history.filter(j => j.isEmergency).map((job) => (
                  <Card 
                    key={job.id} 
                    className="rounded-[32px] border-l-8 border-l-rose-600 shadow-lg p-6 cursor-pointer hover:bg-rose-50/30 transition-all"
                    onClick={() => router.push(`/dashboard/tickets/${job.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                          <h3 className="text-xl font-black text-slate-800">{job.title}</h3>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{job.description}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                  </Card>
                ))}
                {history.filter(j => j.isEmergency).length === 0 && (
                  <div className="text-center py-20 text-slate-300 font-bold italic">
                    No has solicitado servicios de emergencia aún.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}