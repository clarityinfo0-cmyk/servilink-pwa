"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useProfile } from '../../layout';
import { 
  Sparkles, 
  Camera, 
  ArrowLeft, 
  X, 
  Loader2, 
  MapPin, 
  Navigation, 
  Droplets,
  Zap,
  Snowflake,
  Bath,
  Hammer,
  Palette,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
  Shield,
  ExternalLink,
  Map as MapIcon,
  Search
} from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { UrgencyBadge } from '@/components/dashboard-ui';
import { categorizeTicket } from '@/ai/flows/ai-ticket-categorization';

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

type UrgencyLevel = 'low' | 'medium' | 'urgent';

interface Symptom {
  id: string;
  label: string;
  icon: any;
  urgency: UrgencyLevel;
  recommendation: string;
  questions: string[];
  priceRange: { min: number, max: number, avg: number };
  zone: 'kitchen' | 'bathroom' | 'living_room' | 'bedroom' | 'garden' | 'roof' | 'general';
}

const SYMPTOMS: Symptom[] = [
  { id: 'water', label: 'Fuga de agua / Gotera', icon: Droplets, urgency: 'urgent', recommendation: 'Atención recomendada en < 4h.', questions: ['¿Dónde está la fuga?', '¿Es constante?'], priceRange: { min: 450, max: 1800, avg: 850 }, zone: 'bathroom' },
  { id: 'electric', label: 'No hay luz / Corto', icon: Zap, urgency: 'urgent', recommendation: 'Riesgo de incendio. Atención inmediata.', questions: ['¿Es toda la casa o una zona?', '¿Huele a quemado?'], priceRange: { min: 600, max: 2500, avg: 1200 }, zone: 'general' },
  { id: 'clima', label: 'Aire no enfría', icon: Snowflake, urgency: 'medium', recommendation: 'Atención en < 24h.', questions: ['¿Enciende el equipo?', '¿Hace algún ruido?'], priceRange: { min: 800, max: 3500, avg: 1500 }, zone: 'living_room' },
  { id: 'drain', label: 'Baño tapado / Drenaje', icon: Bath, urgency: 'urgent', recommendation: 'Atención en < 4h por higiene.', questions: ['¿Es el WC o regadera?', '¿Se regresa el agua?'], priceRange: { min: 500, max: 2000, avg: 900 }, zone: 'bathroom' },
  { id: 'wall', label: 'Humedad / Grietas', icon: Hammer, urgency: 'low', recommendation: 'Atención programada.', questions: ['¿Es mancha o grieta?', '¿Se desprende material?'], priceRange: { min: 1200, max: 8000, avg: 3500 }, zone: 'bedroom' },
  { id: 'paint', label: 'Pintura / Acabados', icon: Palette, urgency: 'low', recommendation: 'Servicio estético.', questions: ['¿Qué área quieres pintar?', '¿Tienes la pintura?'], priceRange: { min: 2500, max: 15000, avg: 5500 }, zone: 'living_room' },
  { id: 'preventive', label: 'Mantenimiento preventivo', icon: ShieldCheck, urgency: 'low', recommendation: 'Atención rutinaria.', questions: ['¿Qué equipo requiere servicio?', '¿Funciona actualmente?'], priceRange: { min: 600, max: 2500, avg: 1100 }, zone: 'roof' },
  { id: 'unknown', label: 'Otro / No estoy seguro', icon: HelpCircle, urgency: 'medium', recommendation: 'Requiere diagnóstico inicial.', questions: ['Describe lo que notas', '¿En qué habitación sucede?'], priceRange: { min: 400, max: 5000, avg: 1500 }, zone: 'general' },
];

function CreateTicketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const { profile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEmergency = searchParams.get('emergency') === 'true';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    locationUrl: '',
    reference: '',
  });

  // Efecto para cargar ubicación predefinida del perfil
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({ 
        ...prev, 
        addressLine1: profile.addressLine1 || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zipCode || '',
        locationUrl: profile.locationUrl || '',
        reference: profile.serviceReference || '', // O referencias guardadas
      }));
    }
  }, [profile]);

  const handleSelectSymptom = (s: Symptom) => {
    setSelectedSymptom(s);
    setAnswers(new Array(s.questions.length).fill(''));
    setFormData(prev => ({ ...prev, title: isEmergency ? `🚨 SOS: ${s.label}` : s.label }));
    setStep(2);
  };

  const handleDetectLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          setFormData(prev => ({ ...prev, locationUrl: url }));
          setIsGpsLoading(false);
          toast({ title: "GPS Detectado", description: "Presiona 'Verificar en Maps' para confirmar." });
        }, 
        () => {
          setIsGpsLoading(false);
          toast({ title: "Error GPS", description: "Por favor ingresa tu dirección manualmente.", variant: "destructive" });
        }
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const processed = await Promise.all(Array.from(files).map(f => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => resolve(await compressImage(reader.result as string));
        reader.readAsDataURL(f);
      });
    }));
    setImages(prev => [...prev, ...processed]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    setLoading(true);

    try {
      const fullDesc = selectedSymptom?.questions.map((q, i) => `${q}: ${answers[i]}`).join('\n') || '';
      const aiRefined = await categorizeTicket({ problemDescription: fullDesc });

      const ticketData = {
        title: formData.title,
        description: fullDesc,
        aiRefinedDescription: aiRefined.refinedDescription,
        aiTechnicalSeverity: aiRefined.technicalSeverity,
        aiSafetyAdvice: aiRefined.adviceForClient,
        categoryId: formData.category || selectedSymptom?.id || 'general',
        zone: selectedSymptom?.zone || 'general',
        status: 'pendiente',
        urgency: isEmergency ? 'urgent' : (selectedSymptom?.urgency || 'low'),
        clientId: user.uid,
        initialImagesUrls: images,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        serviceAddressLine1: formData.addressLine1, 
        serviceCity: formData.city,
        serviceState: formData.state,
        serviceZipCode: formData.zipCode,
        serviceLocationUrl: formData.locationUrl,
        serviceReference: formData.reference,
        isEmergency: isEmergency
      };

      await addDocumentNonBlocking(collection(db, 'serviceTickets'), ticketData);
      toast({ title: isEmergency ? "🚀 SOS ACTIVADO" : "Reporte Enviado", description: "Un especialista revisará tu caso de inmediato." });
      router.push('/dashboard');
    } catch (err) {
      toast({ title: "Error", description: "No pudimos enviar tu reporte.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between py-2">
        <Button variant="ghost" onClick={() => step > 1 ? setStep((step - 1) as any) : router.back()} className="gap-2 font-bold text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Atrás
        </Button>
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn("h-1.5 w-12 rounded-full transition-all", step >= s ? "bg-primary" : "bg-slate-200")} />
          ))}
        </div>
      </div>

      <Card className="shadow-2xl border-none rounded-[40px] overflow-hidden bg-white">
        {step === 1 && (
          <>
            <CardHeader className="pt-10 px-8">
              <CardTitle className="text-3xl font-black text-primary flex items-center gap-3">
                <Shield className="w-8 h-8 text-accent" /> ¿Qué necesitas resolver?
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-8">
              {SYMPTOMS.map((s) => (
                <Button 
                  key={s.id} 
                  variant="outline" 
                  className="h-auto py-8 rounded-[32px] flex flex-col gap-4 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={() => handleSelectSymptom(s)}
                >
                  <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">
                    <s.icon className="w-10 h-10 text-primary" />
                  </div>
                  <span className="font-black text-slate-700">{s.label}</span>
                </Button>
              ))}
            </CardContent>
          </>
        )}

        {step === 2 && selectedSymptom && (
          <>
            <CardHeader className="pt-10 px-8 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-black text-primary">{selectedSymptom.label}</CardTitle>
                <CardDescription className="font-bold">Ayúdanos con un poco de detalle para la IA.</CardDescription>
              </div>
              <UrgencyBadge urgency={isEmergency ? 'urgent' : selectedSymptom.urgency} />
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {selectedSymptom.questions.map((q, i) => (
                <div key={i} className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{q}</Label>
                  <Textarea 
                    placeholder="Escribe aquí..." 
                    className="rounded-2xl min-h-[100px] bg-slate-50 border-none focus:ring-2 ring-primary"
                    value={answers[i]}
                    onChange={(e) => {
                      const newAns = [...answers];
                      newAns[i] = e.target.value;
                      setAnswers(newAns);
                    }}
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button className="w-full h-16 text-lg font-black rounded-2xl gap-3 bg-primary" onClick={() => setStep(3)}>
                CONTINUAR <ChevronRight className="w-6 h-6" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <CardHeader className="pt-10 px-8">
              <CardTitle className="text-3xl font-black text-primary flex items-center gap-3">
                <MapPin className="w-8 h-8" /> Ubicación Exacta
              </CardTitle>
              <CardDescription className="font-bold">Hemos cargado tu ubicación predefinida. Puedes ajustarla si es necesario.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                
                <div className="p-8 bg-slate-900 text-white rounded-[32px] space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-accent tracking-widest">Opción 1: Detectar mi GPS</h3>
                    <Badge variant="secondary" className="bg-white/10 text-white text-[9px] font-black border-none">ALTA PRECISIÓN 🛰️</Badge>
                  </div>
                  
                  <Button 
                    type="button" 
                    onClick={handleDetectLocation} 
                    disabled={isGpsLoading}
                    className="w-full h-16 rounded-2xl gap-3 font-black bg-accent text-white hover:bg-accent/90 shadow-lg"
                  >
                    {isGpsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
                    {isGpsLoading ? 'Sincronizando...' : 'DETECTAR MI UBICACIÓN'}
                  </Button>

                  {formData.locationUrl && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => window.open(formData.locationUrl, '_blank')}
                      className="w-full h-14 rounded-2xl gap-3 font-black border-2 border-white/20 bg-transparent text-white hover:bg-white/5"
                    >
                      <MapIcon className="w-5 h-5 text-accent" /> VERIFICAR EN GOOGLE MAPS
                    </Button>
                  )}
                </div>

                <div className="p-8 bg-primary/5 rounded-[32px] border-2 border-primary/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-primary tracking-widest">Opción 2: Enlace Manual</h3>
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Copia y pega el enlace desde Google Maps</Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                      <Input 
                        placeholder="https://maps.app.goo.gl/..." 
                        className="rounded-xl h-14 pl-12 bg-white border-primary/20 font-medium"
                        value={formData.locationUrl}
                        onChange={e => setFormData({...formData, locationUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-full">
                    <Label className="font-black text-xs uppercase text-slate-400">Dirección Física (Calle y Número)</Label>
                    <Input required value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} className="rounded-xl h-12 bg-slate-50 border-none" />
                  </div>
                  <div className="space-y-2 col-span-full">
                    <Label className="font-black text-xs uppercase text-slate-400">Referencias de Fachada</Label>
                    <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="rounded-xl h-12 bg-slate-50 border-none" placeholder="Ej: Casa con portón café frente a parque" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <Label className="font-black text-xs uppercase text-slate-400">Evidencia (Fotos de la falla)</Label>
                <div 
                  className="border-4 border-dashed border-slate-100 rounded-[32px] p-10 text-center cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-400 uppercase">Subir Fotos</p>
                </div>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-8">
              <Button type="submit" className="w-full h-16 text-xl font-black rounded-3xl shadow-xl gap-3 bg-primary" disabled={loading}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                {loading ? 'PROCESANDO CON IA...' : 'PUBLICAR REPORTE PRO'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function CreateTicketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CreateTicketContent />
    </Suspense>
  );
}