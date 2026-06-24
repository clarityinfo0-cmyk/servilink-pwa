
"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusBadge, UrgencyBadge, ServiceProgress, PriceThermometer, StarRating } from '@/components/dashboard-ui';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Plus,
  X,
  MapPin,
  Receipt,
  Camera,
  Banknote,
  Wallet,
  Clock,
  History,
  FileSearch,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Car,
  CheckSquare,
  ExternalLink,
  Map as MapIcon,
  UserCircle,
  Phone,
  Building2,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { useProfile } from '../../layout';
import { cn } from '@/lib/utils';
import { analyzeQuote, type QuoteAnalysisOutput } from '@/ai/flows/ai-quote-analysis-flow';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const compressImage = (dataUrl: string, maxWidth = 600, quality = 0.4): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const { profile, isLoading: loadingProfile } = useProfile();
  
  const [laborDescription, setLaborDescription] = useState('');
  const [laborCost, setLaborCost] = useState<number>(0);
  const [materials, setMaterials] = useState<{ description: string, quantity: number, unit: string, cost: number }[]>([]);
  
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [adminProfileData, setAdminProfileData] = useState<any>(null);
  const [techProfileData, setTechProfileData] = useState<any>(null);

  const [aiAnalysis, setAiAnalysis] = useState<QuoteAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isRating, setIsRating] = useState(false);

  const IVA_RATE = 0.16;
  const PLATFORM_FEE_RATE = 0.15;

  const ticketRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'serviceTickets', id as string);
  }, [db, id]);

  const { data: ticket, isLoading: isTicketLoading } = useDoc(ticketRef);

  useEffect(() => {
    const loadData = async () => {
      if (!db || !ticket) return;
      try {
        const adminRef = doc(db, 'adminProfiles', '1gYT9nqjUBeM8HVSyWfsW7We6X03');
        const snapAdmin = await getDoc(adminRef);
        if (snapAdmin.exists()) setAdminProfileData(snapAdmin.data());

        if (ticket.technicianId) {
          const techRef = doc(db, 'technicianProfiles', ticket.technicianId);
          const snapTech = await getDoc(techRef);
          if (snapTech.exists()) setTechProfileData(snapTech.data());
        }
      } catch (err: any) {}
    };
    loadData();
  }, [db, ticket?.technicianId, ticket?.id]);

  const isAdmin = profile?.role === 'admin';
  const isAssignedTech = profile?.role === 'technician' && (ticket?.technicianId === user?.uid || (!ticket?.technicianId && ticket?.status === 'pendiente'));
  const isClient = profile?.role === 'client' && ticket?.clientId === user?.uid;

  // Lógica Financiera Pro (IVA automático para cliente)
  const currentLaborBase = Number(laborCost || 0);
  const laborWithCommission = currentLaborBase * (1 + PLATFORM_FEE_RATE);
  const laborIva = laborWithCommission * IVA_RATE;
  const laborFinalToClient = laborWithCommission + laborIva;
  
  const materialsProcessed = (materials || []).map(m => {
    const costBaseTotal = Number(m.cost || 0) * Number(m.quantity || 1);
    const costIva = costBaseTotal * IVA_RATE;
    return {
      description: m.description || '',
      quantity: Number(m.quantity || 1),
      unit: m.unit || 'pza',
      costBase: Number(m.cost || 0),
      totalBase: costBaseTotal,
      costIva: costIva,
      costWithIva: costBaseTotal + costIva
    };
  });
  
  const totalMaterialsWithIva = materialsProcessed.reduce((acc, m) => acc + m.costWithIva, 0);
  const grandTotalToClient = Math.ceil(laborFinalToClient + totalMaterialsWithIva);

  useEffect(() => {
    if (isClient && ticket?.status === 'presupuestado' && ticket?.formalQuotation && !aiAnalysis && !isAnalyzing) {
      const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          const result = await analyzeQuote({
            ticketTitle: ticket.title,
            ticketDescription: ticket.description,
            laborDescription: ticket.formalQuotation.laborDescription || "Sin descripción",
            laborCost: Number(ticket.formalQuotation.laborCostWithIva || 0),
            materials: (ticket.formalQuotation.materials || []).map((m: any) => ({ 
              description: m.description, 
              cost: Number(m.costWithIva || 0),
              quantity: Number(m.quantity || 1),
              unit: m.unit || 'pza'
            })),
            totalEstimate: Number(ticket.totalCost || 0)
          });
          setAiAnalysis(result);
        } catch (e) {} finally {
          setIsAnalyzing(false);
        }
      };
      runAnalysis();
    }
  }, [isClient, ticket, aiAnalysis, isAnalyzing]);

  const handleUpdateStatus = (newStatus: string, additionalData: any = {}) => {
    if (!ticketRef) return;
    updateDocumentNonBlocking(ticketRef, { 
      status: newStatus, 
      updatedAt: new Date().toISOString(),
      ...additionalData 
    });
    toast({ title: "Estado Actualizado", description: `El servicio ahora está en: ${newStatus}` });
  };

  const handleRateUser = async (targetRole: 'technician' | 'client') => {
    if (!ticketRef || !db || !ticket) return;
    setIsRating(true);
    
    try {
      const fieldPrefix = targetRole === 'technician' ? 'techRating' : 'clientRating';
      const commentPrefix = targetRole === 'technician' ? 'techRatingComment' : 'clientRatingComment';
      
      const updateTicketData = {
        [fieldPrefix]: ratingVal,
        [commentPrefix]: ratingComment,
        updatedAt: new Date().toISOString()
      };

      updateDocumentNonBlocking(ticketRef, updateTicketData);

      const targetId = targetRole === 'technician' ? ticket.technicianId : ticket.clientId;
      const collectionName = targetRole === 'technician' ? 'technicianProfiles' : 'clientProfiles';
      
      if (targetId) {
        const targetRef = doc(db, collectionName, targetId);
        updateDocumentNonBlocking(targetRef, {
          ratingCount: increment(1),
          totalRatingPoints: increment(ratingVal),
          updatedAt: new Date().toISOString()
        });
      }

      toast({ title: "Calificación Enviada", description: "¡Gracias por mejorar la red ServiLink!" });
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ticketRef.path,
          operation: 'update',
          requestResourceData: { ratingVal }
        }));
      }
    } finally {
      setIsRating(false);
    }
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>, field: 'beforeImagesUrls' | 'afterImagesUrls') => {
    const files = e.target.files;
    if (!files || !ticketRef) return;
    setIsUploading(true);
    
    try {
      const processed = await Promise.all(Array.from(files).map(f => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const compressed = await compressImage(reader.result as string);
            resolve(compressed);
          };
          reader.readAsDataURL(f);
        });
      }));
      
      const currentImages = ticket[field] || [];
      updateDocumentNonBlocking(ticketRef, { 
        [field]: [...currentImages, ...processed],
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Evidencia Guardada", description: "Las fotos se han guardado correctamente." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddMaterial = () => setMaterials([...materials, { description: '', quantity: 1, unit: 'pza', cost: 0 }]);
  const handleUpdateMaterial = (index: number, field: string, value: any) => {
    const newMaterials = [...materials];
    (newMaterials[index] as any)[field] = value;
    setMaterials(newMaterials);
  };

  const handleSubmitQuotation = async () => {
    if (!ticketRef) return;
    setIsSubmittingQuote(true);
    try {
      await updateDoc(ticketRef, {
        status: 'presupuestado',
        totalCost: grandTotalToClient,
        formalQuotation: {
          laborDescription: laborDescription || 'Labor técnica especializada',
          laborCostBase: Number(currentLaborBase || 0),
          laborCostWithCommission: Number(laborWithCommission || 0),
          laborCostWithIva: Number(laborFinalToClient || 0),
          materials: materialsProcessed,
          totalEstimate: grandTotalToClient,
          createdAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Presupuesto Enviado", description: "El cliente ha sido notificado con el precio final (IVA incluido)." });
    } catch (e: any) {
       if (e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ticketRef.path,
          operation: 'update'
        }));
      }
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  if (isTicketLoading || loadingProfile || !ticket || !profile) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between py-2">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="gap-2 font-bold text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex items-center gap-2">
          {ticket.aiTechnicalSeverity === 'critical' && <Badge className="bg-rose-600 animate-pulse font-black px-3 py-1">⚠️ RIESGO IA</Badge>}
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-white rounded-[32px]">
        <CardContent className="pt-6">
          <ServiceProgress status={ticket.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-none bg-white rounded-[40px] overflow-hidden">
            <CardHeader className="pt-10 px-8">
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl font-black text-primary">{ticket.title}</CardTitle>
                {ticket.isEmergency && <Badge className="bg-rose-100 text-rose-600 border-none font-black px-4 py-2 rounded-xl">SOS ACTIVADO</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-10">
              
              {ticket.aiSafetyAdvice && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-[24px] p-6">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                  <div className="ml-4">
                    <AlertTitle className="font-black text-xs uppercase tracking-widest">Protocolo de Seguridad IA</AlertTitle>
                    <AlertDescription className="font-bold text-sm mt-1">{ticket.aiSafetyAdvice}</AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="p-8 bg-primary/5 rounded-[32px] border-2 border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-16 h-16 text-primary" />
                </div>
                <h3 className="text-xs font-black uppercase text-primary tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Reporte Técnico ServiLink IA
                </h3>
                {ticket.aiRefinedDescription ? (
                  <p className="text-slate-700 font-bold leading-relaxed">{ticket.aiRefinedDescription}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-slate-700 font-bold leading-relaxed italic">{ticket.description}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Reporte técnico profesional para el especialista.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-8 bg-slate-900 text-white rounded-[32px] shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                  <MapPin className="w-5 h-5" /> Ubicación del Servicio
                </h3>
                <div className="space-y-3">
                  <p className="font-black text-lg">{ticket.serviceAddressLine1}</p>
                  <p className="text-xs text-slate-400">{ticket.serviceCity}, {ticket.serviceState} | Ref: {ticket.serviceReference}</p>
                  {ticket.serviceLocationUrl && (
                    <Button 
                      className="w-full h-14 rounded-2xl font-black gap-3 bg-accent text-white"
                      onClick={() => window.open(ticket.serviceLocationUrl, '_blank')}
                    >
                      <Navigation className="w-5 h-5" /> VER EN GOOGLE MAPS
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <h3 className="text-lg font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
                  <FileSearch className="w-6 h-6" /> Expediente de Evidencias
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(ticket.initialImagesUrls || []).length > 0 && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Falla Original (Cliente)</Label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(ticket.initialImagesUrls || []).map((img: string, i: number) => (
                          <div key={i} className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 shadow-sm">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(ticket.beforeImagesUrls || []).length > 0 && (
                    <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl">
                      <Label className="text-[10px] font-black text-blue-400 uppercase">Estado al Llegar (Técnico)</Label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(ticket.beforeImagesUrls || []).map((img: string, i: number) => (
                          <div key={i} className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-blue-200 shadow-sm">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(ticket.afterImagesUrls || []).length > 0 && (
                  <div className="space-y-3 p-6 bg-emerald-50 rounded-[32px] border-2 border-emerald-100">
                    <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Entrega Final y Garantía</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {(ticket.afterImagesUrls || []).map((img: string, i: number) => (
                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md">
                          <img src={img} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {ticket.status === 'terminado' && (
                <div className="space-y-6 pt-8 border-t border-slate-100">
                  <h3 className="text-xl font-black text-primary flex items-center gap-2">
                    <ThumbsUp className="w-6 h-6" /> Reseñas del Servicio
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-3xl border-none bg-slate-50 p-6 space-y-4">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reseña del Cliente</Label>
                      {ticket.techRating ? (
                        <div className="space-y-2">
                          <StarRating rating={ticket.techRating} readonly />
                          <p className="text-sm italic text-slate-600 font-medium">"{ticket.techRatingComment || 'Sin comentarios'}"</p>
                        </div>
                      ) : isClient ? (
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-slate-500">¿Cómo calificarías al especialista?</p>
                          <StarRating rating={ratingVal} onRatingChange={setRatingVal} />
                          <Textarea 
                            placeholder="Escribe tu opinión técnica..." 
                            className="bg-white rounded-xl h-20 text-xs mt-2"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                          />
                          <Button 
                            className="w-full h-12 bg-primary rounded-xl font-black mt-2"
                            onClick={() => handleRateUser('technician')}
                            disabled={isRating}
                          >
                            {isRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "CALIFICAR ESPECIALISTA"}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 italic">Pendiente de calificación.</p>
                      )}
                    </Card>

                    <Card className="rounded-3xl border-none bg-slate-50 p-6 space-y-4">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reseña del Especialista</Label>
                      {ticket.clientRating ? (
                        <div className="space-y-2">
                          <StarRating rating={ticket.clientRating} readonly />
                          <p className="text-sm italic text-slate-600 font-medium">"{ticket.clientRatingComment || 'Sin comentarios'}"</p>
                        </div>
                      ) : isAssignedTech ? (
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-slate-500">¿Cómo fue tu experiencia en este hogar?</p>
                          <StarRating rating={ratingVal} onRatingChange={setRatingVal} />
                          <Textarea 
                            placeholder="Ej: Trato excelente..." 
                            className="bg-white rounded-xl h-20 text-xs mt-2"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                          />
                          <Button 
                            className="w-full h-12 bg-slate-800 rounded-xl font-black mt-2"
                            onClick={() => handleRateUser('client')}
                            disabled={isRating}
                          >
                            {isRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "CALIFICAR CLIENTE"}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 italic">Pendiente de calificación.</p>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {isAssignedTech && ticket.status === 'en sitio' && ticket.arrivalConfirmed && (
                <Card className="border-2 border-primary/20 bg-slate-50/50 rounded-[40px] overflow-hidden shadow-2xl">
                  <CardHeader className="bg-primary text-white p-8">
                    <CardTitle className="text-2xl font-black flex items-center gap-3"><Receipt className="w-8 h-8" /> Generar Presupuesto Pro</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center gap-4">
                      <div className="p-3 bg-blue-600 text-white rounded-xl"><Camera className="w-6 h-6" /></div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-blue-800 uppercase">Evidencia Obligatoria (Antes)</p>
                      </div>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 rounded-xl">Cargar Foto</Button>
                      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleUploadImages(e, 'beforeImagesUrls')} />
                    </div>

                    <div className="space-y-4">
                      <Label className="font-black text-xs uppercase text-slate-500">Mano de Obra (Base Especialista)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-4 font-black text-slate-400">$</span>
                        <Input type="number" value={laborCost} onChange={e => setLaborCost(Number(e.target.value))} className="rounded-xl h-14 pl-8 text-xl font-black" />
                      </div>
                      <Textarea value={laborDescription} onChange={e => setLaborDescription(e.target.value)} className="rounded-xl h-24" placeholder="Descripción técnica del trabajo..." />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-black text-xs uppercase text-slate-500">Materiales (Registro del Hogar)</Label>
                        <Button size="sm" onClick={handleAddMaterial} className="rounded-full bg-slate-900 h-8 w-8 p-0"><Plus className="w-4 h-4" /></Button>
                      </div>
                      {materials.map((m, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                          <div className="col-span-6">
                            <Input placeholder="Material/Marca" value={m.description} onChange={e => handleUpdateMaterial(i, 'description', e.target.value)} className="h-10 text-xs" />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="Costo Base" value={m.cost} onChange={e => handleUpdateMaterial(i, 'cost', Number(e.target.value))} className="h-10 text-xs" />
                          </div>
                          <div className="col-span-2">
                            <Input type="number" placeholder="Cant." value={m.quantity} onChange={e => handleUpdateMaterial(i, 'quantity', Number(e.target.value))} className="h-10 text-xs" />
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <button onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="text-rose-500"><X className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-slate-100 rounded-2xl space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Resumen para Especialista (Neto a Recibir)</p>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-600">PAGO NETO A RECIBIR:</span>
                        <span className="font-black text-slate-900">$ {(currentLaborBase + materialsProcessed.reduce((acc, m) => acc + m.totalBase, 0)).toLocaleString()}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 italic font-bold">Nota: Al cliente se le agregará automáticamente el 16% de IVA sobre este total y la comisión ServiLink Pro.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8">
                    <Button 
                      onClick={handleSubmitQuotation} 
                      className="w-full h-16 bg-primary text-white font-black rounded-2xl text-lg" 
                      disabled={isSubmittingQuote || laborCost <= 0 || (ticket.beforeImagesUrls?.length || 0) === 0}
                    >
                      {isSubmittingQuote ? <Loader2 className="w-6 h-6 animate-spin" /> : "ENVIAR PRESUPUESTO IA 🚀"}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          {isClient && ticket.status === 'en sitio' && !ticket.arrivalConfirmed && (
            <Card className="rounded-[40px] border-none shadow-2xl bg-primary text-white p-8 space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-white/20 rounded-full">
                  <UserCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tighter">¿El Técnico ya llegó?</h3>
                <p className="text-xs text-white/80 font-medium">Confirme para habilitar el diagnóstico.</p>
              </div>
              <Button 
                onClick={() => handleUpdateStatus('en sitio', { arrivalConfirmed: true })} 
                className="w-full h-16 bg-white text-primary font-black rounded-2xl text-lg shadow-xl"
              >
                SÍ, YA LLEGÓ ✅
              </Button>
            </Card>
          )}

          {ticket.formalQuotation && (
            <Card className="rounded-[40px] border-none shadow-2xl bg-white overflow-hidden">
              <div className="bg-primary p-8 text-white text-center">
                <h3 className="font-black text-xl uppercase tracking-tighter">Resumen de Servicio</h3>
                <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Monto Final con IVA Incluido</p>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Mano de Obra (Pro)</p>
                      <p className="text-sm font-bold text-slate-700">{ticket.formalQuotation.laborDescription}</p>
                    </div>
                    <span className="font-black text-slate-900">$ {Number(ticket.formalQuotation.laborCostWithIva ?? 0).toFixed(2)}</span>
                  </div>
                  
                  {ticket.formalQuotation.materials?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Materiales (Expediente Hogar)</p>
                      {ticket.formalQuotation.materials.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">{m.quantity}x {m.description}</span>
                          <span className="font-black text-slate-800">$ {m.costWithIva.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between items-center text-3xl font-black text-primary">
                    <span className="text-lg uppercase">Total Final:</span>
                    <span>$ {Number(ticket.totalCost ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                {isClient && ticket.status === 'presupuestado' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-900 text-white rounded-[32px] border-2 border-accent/20">
                      <h4 className="text-xs font-black uppercase text-accent tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Defensa al Cliente IA
                      </h4>
                      {isAnalyzing ? (
                        <div className="flex items-center gap-3 p-4">
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
                          <span className="text-xs font-bold italic">Auditando fraude...</span>
                        </div>
                      ) : (
                        aiAnalysis && (
                          <div className="space-y-4">
                            <PriceThermometer verdict={aiAnalysis.verdict} score={aiAnalysis.riskScore} />
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                              <p className="text-[10px] font-black text-accent uppercase">Veredicto IA:</p>
                              <p className="text-xs font-bold mt-1 text-white">{aiAnalysis.recommendation}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <Button onClick={() => handleUpdateStatus('esperando pago')} className="w-full h-16 bg-emerald-600 text-white font-black rounded-2xl shadow-xl">ACEPTAR Y PAGAR ✅</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isClient && ticket.status === 'esperando pago' && (
            <Card className="rounded-[40px] border-none shadow-2xl bg-slate-900 text-white p-8 space-y-6">
              <h3 className="text-lg font-black uppercase text-accent flex items-center gap-2">
                <Banknote className="w-6 h-6" /> Pago en Custodia
              </h3>
              <div className="space-y-4 p-6 bg-white/5 rounded-[32px] border border-white/10">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Datos para Transferencia</p>
                <div className="space-y-1">
                  <p className="font-bold text-accent text-lg">{adminProfileData?.platformBankName || 'Banco ServiLink'}</p>
                  <p className="text-2xl font-black font-mono select-all tracking-tighter">{adminProfileData?.platformClabe || '0000 0000 0000 0000 00'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Titular: {adminProfileData?.platformAccountHolder}</p>
                </div>
              </div>
              <Button 
                onClick={() => updateDocumentNonBlocking(ticketRef, { clientMarkedAsPaid: true, updatedAt: new Date().toISOString() })} 
                className="w-full h-16 bg-accent text-white font-black rounded-2xl"
                disabled={ticket.clientMarkedAsPaid}
              >
                {ticket.clientMarkedAsPaid ? "VERIFICANDO PAGO..." : "YA REALICÉ EL DEPÓSITO ✅"}
              </Button>
            </Card>
          )}

          {isAssignedTech && (
            <div className="space-y-4">
              {ticket.status === 'pendiente' && (
                <Button onClick={() => handleUpdateStatus('asignado', { technicianId: user?.uid })} className="w-full h-20 bg-primary text-white font-black rounded-3xl text-xl shadow-2xl">
                  ACEPTAR TRABAJO 👤
                </Button>
              )}
              {ticket.status === 'asignado' && (
                <Button onClick={() => handleUpdateStatus('en camino')} className="w-full h-20 bg-orange-600 text-white font-black rounded-3xl text-xl shadow-2xl">
                  <Car className="w-6 h-6" /> INICIAR RUTA 🚗
                </Button>
              )}
              {ticket.status === 'en camino' && (
                <Button onClick={() => handleUpdateStatus('en sitio')} className="w-full h-20 bg-indigo-600 text-white font-black rounded-3xl text-xl shadow-2xl">
                  <MapPin className="w-6 h-6" /> MARCAR LLEGADA 📍
                </Button>
              )}
              {ticket.status === 'en proceso' && (
                <div className="space-y-4">
                  <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 text-white rounded-xl"><Camera className="w-6 h-6" /></div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-emerald-800 uppercase">Evidencia Después</p>
                    </div>
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-emerald-600">Subir</Button>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleUploadImages(e, 'afterImagesUrls')} />
                  </div>
                  <Button 
                    onClick={() => handleUpdateStatus('revision_cliente')} 
                    className="w-full h-20 bg-primary text-white font-black rounded-3xl text-xl"
                    disabled={(ticket.afterImagesUrls?.length || 0) === 0}
                  >
                    TERMINAR TRABAJO ✅
                  </Button>
                </div>
              )}
            </div>
          )}

          {isClient && ticket.status === 'revision_cliente' && (
            <Card className="rounded-[40px] border-none shadow-2xl bg-emerald-600 text-white p-8 space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto" />
                <h3 className="text-xl font-black uppercase tracking-tighter">¿Todo quedó resuelto?</h3>
                <p className="text-xs text-white/80 font-medium">Confirme para activar su garantía de 30 días.</p>
              </div>
              <Button 
                onClick={() => handleUpdateStatus('terminado', { warrantyDays: 30 })} 
                className="w-full h-16 bg-white text-emerald-600 font-black rounded-2xl text-lg"
              >
                CONFIRMAR Y ACTIVAR GARANTÍA ⭐
              </Button>
            </Card>
          )}

          {isAdmin && (
            <div className="space-y-4">
              {ticket.status === 'esperando pago' && ticket.clientMarkedAsPaid && (
                <Button onClick={() => handleUpdateStatus('en proceso', { adminPaymentReceived: true })} className="w-full h-16 bg-blue-600 text-white font-black rounded-2xl">
                  VALIDAR PAGO Y LIBERAR OBRA 🔓
                </Button>
              )}
              {ticket.status === 'terminado' && !ticket.techPaidByAdmin && (
                <Card className="rounded-[40px] border-none shadow-2xl bg-slate-900 text-white p-8 space-y-6">
                  <h3 className="text-lg font-black uppercase text-amber-500 flex items-center gap-2">
                    <Banknote className="w-6 h-6" /> Liquidación a Técnico
                  </h3>
                  
                  <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Contacto Técnico</p>
                          <p className="font-bold text-white">{techProfileData?.firstName} {techProfileData?.lastName}</p>
                          <a href={`tel:${techProfileData?.phoneNumber}`} className="text-xs text-accent hover:underline font-bold">{techProfileData?.phoneNumber || 'Sin teléfono'}</a>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Datos Bancarios</p>
                          <p className="font-bold text-white">{techProfileData?.bankName || 'Banco no especificado'}</p>
                          <p className="text-xl font-black font-mono select-all text-amber-500 tracking-tighter">
                            {techProfileData?.paymentDetails || 'SIN CLABE REGISTRADA'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400">Total Neto a Liquidar:</span>
                      <span className="text-2xl font-black text-amber-500">
                        $ {((ticket.formalQuotation?.laborCostBase || 0) + (ticket.formalQuotation?.materials || []).reduce((acc: number, m: any) => acc + (m.totalBase || 0), 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => updateDoc(ticketRef, { techPaidByAdmin: true, adminPaymentDate: new Date().toISOString() })}
                    className="w-full h-16 bg-emerald-600 text-white font-black rounded-2xl shadow-xl"
                  >
                    CONFIRMAR PAGO REALIZADO ✅
                  </Button>
                </Card>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
