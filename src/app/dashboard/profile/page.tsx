"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '../layout';
import { StarRating } from '@/components/dashboard-ui';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Save, 
  User, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles,
  Wallet,
  Building2,
  Banknote,
  Camera,
  Upload,
  IdCard,
  AlertCircle,
  Navigation,
  Map as MapIcon,
  ExternalLink,
  Search,
  CheckCircle2
} from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const compressImage = (dataUrl: string, maxWidth = 800, quality = 0.5): Promise<string> => {
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

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { profile: currentProfile, isLoading: profileLoading } = useProfile();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const ineInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [ineImage, setIneImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    city: '',
    state: '',
    zipCode: '',
    addressLine1: '',
    locationUrl: '',
    bankName: '',
    paymentMethod: 'transfer',
    paymentDetails: '',
    platformBankName: '',
    platformClabe: '',
    platformAccountHolder: '',
    platformAdditionalPaymentInfo: '',
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || `${currentProfile.firstName || ''} ${currentProfile.lastName || ''}`.trim() || '',
        phoneNumber: currentProfile.phoneNumber || '',
        city: currentProfile.city || '',
        state: currentProfile.state || '',
        zipCode: currentProfile.zipCode || '',
        addressLine1: currentProfile.addressLine1 || '',
        locationUrl: currentProfile.locationUrl || '',
        bankName: currentProfile.bankName || '',
        paymentMethod: currentProfile.paymentMethod || 'transfer',
        paymentDetails: currentProfile.paymentDetails || '',
        platformBankName: currentProfile.platformBankName || '',
        platformClabe: currentProfile.platformClabe || '',
        platformAccountHolder: currentProfile.platformAccountHolder || '',
        platformAdditionalPaymentInfo: currentProfile.platformAdditionalPaymentInfo || '',
      });
      setProfileImage(currentProfile.profileImageUrl || null);
      setIneImage(currentProfile.ineImageUrl || null);
    }
  }, [currentProfile]);

  const handleDetectLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          setFormData(prev => ({ ...prev, locationUrl: url }));
          setIsGpsLoading(false);
          toast({ title: "GPS Detectado", description: "Tu ubicación predefinida ha sido actualizada localmente. Guarda para confirmar." });
        }, 
        () => {
          setIsGpsLoading(false);
          toast({ title: "Error GPS", description: "Por favor ingresa tu dirección manualmente.", variant: "destructive" });
        }
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'ine') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, type === 'profile' ? 400 : 800, 0.5);
        if (type === 'profile') setProfileImage(compressed);
        else setIneImage(compressed);
        toast({ title: "Imagen lista", description: "Foto optimizada para el sistema." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentProfile || !db) return;

    setLoading(true);
    try {
      let collectionName = currentProfile.role === 'admin' ? 'adminProfiles' : 
                          currentProfile.role === 'technician' ? 'technicianProfiles' : 'clientProfiles';
      
      const userRef = doc(db, collectionName, user.uid);
      
      const updateData: any = {
        updatedAt: new Date().toISOString(),
        id: user.uid,
        email: user.email,
        role: currentProfile.role,
        profileImageUrl: profileImage || '',
        ineImageUrl: ineImage || '',
      };

      if (currentProfile.role !== 'admin') {
        updateData.phoneNumber = formData.phoneNumber;
        updateData.city = formData.city;
        updateData.state = formData.state;
        updateData.zipCode = formData.zipCode;
        updateData.addressLine1 = formData.addressLine1;
        updateData.locationUrl = formData.locationUrl;
        if (ineImage && currentProfile.verificationStatus === 'pending') {
          updateData.verificationStatus = currentProfile.role === 'technician' ? 'approved' : 'active';
        }
      }

      if (currentProfile.role === 'technician') {
        updateData.bankName = formData.bankName;
        updateData.paymentMethod = formData.paymentMethod;
        updateData.paymentDetails = formData.paymentDetails;
      }

      if (currentProfile.role === 'admin') {
        updateData.platformBankName = formData.platformBankName;
        updateData.platformClabe = formData.platformClabe;
        updateData.platformAccountHolder = formData.platformAccountHolder;
        updateData.platformAdditionalPaymentInfo = formData.platformAdditionalPaymentInfo;
        updateData.name = formData.name;
      } else if (currentProfile.role === 'client') {
        updateData.name = formData.name;
      } else {
        const nameParts = formData.name.trim().split(' ');
        updateData.firstName = nameParts[0] || '';
        updateData.lastName = nameParts.slice(1).join(' ') || '';
      }

      setDocumentNonBlocking(userRef, updateData, { merge: true });
      toast({ title: "Perfil guardado", description: "Tus datos se están sincronizando." });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  if (profileLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Manejo de reputación robusto para evitar NaN
  const totalPoints = Number(currentProfile?.totalRatingPoints || 0);
  const ratingCount = Number(currentProfile?.ratingCount || 0);
  const averageRating = ratingCount > 0 ? (totalPoints / ratingCount).toFixed(1) : "5.0";
  const starsToRender = Math.round(Number(averageRating));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-white shadow-xl overflow-hidden bg-slate-100">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                  {formData.name.charAt(0) || <User className="w-10 h-10" />}
                </AvatarFallback>
              )}
            </Avatar>
            <button onClick={() => profileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-accent text-white rounded-full shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-headline font-black text-primary tracking-tight">Mi Perfil</h1>
              {currentProfile?.verificationStatus === 'verified' && <ShieldCheck className="w-6 h-6 text-emerald-500" />}
            </div>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest mt-1">
              {currentProfile?.role === 'client' ? 'Propietario' : currentProfile?.role === 'admin' ? 'Administrador' : 'Especialista'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden rounded-[32px]">
            <form onSubmit={handleUpdate}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" /> Datos de Identidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl h-12" required />
                  </div>
                  {currentProfile?.role !== 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono de Contacto</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                        <Input id="phone" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="pl-10 rounded-xl h-12" required />
                      </div>
                    </div>
                  )}
                </div>

                {currentProfile?.role !== 'admin' && (
                  <div className="space-y-8 pt-4">
                    <Separator />
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter">
                          <MapPin className="w-5 h-5 text-primary" /> Ubicación Predefinida (Hogar)
                        </h3>
                      </div>

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
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Pega el enlace de Google Maps aquí</Label>
                          <div className="relative">
                            <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                            <Input 
                              placeholder="https://maps.app.goo.gl/..." 
                              className="rounded-xl h-14 pl-12 bg-white border-primary/20 font-medium"
                              value={formData.locationUrl}
                              onChange={e => setFormData({...formData, locationUrl: e.target.value})}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 italic">Ideal para fijar un punto exacto si el GPS no es preciso en tu zona.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-full">
                          <Label className="text-[10px] uppercase font-black text-slate-400">Dirección Física (Calle y Número)</Label>
                          <Input value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} className="rounded-xl h-11 bg-slate-50 border-none" placeholder="Ej. Av. Reforma 123" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-400">Ciudad</Label>
                          <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="rounded-xl h-11 bg-slate-50 border-none" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-400">Estado / CP</Label>
                          <div className="flex gap-2">
                            <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="rounded-xl h-11 flex-1 bg-slate-50 border-none" placeholder="Estado" />
                            <Input value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="rounded-xl h-11 w-24 bg-slate-50 border-none" placeholder="CP" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter">
                            <IdCard className="w-5 h-5 text-primary" /> Identificación Oficial (INE)
                          </h3>
                        </div>
                        <Badge variant="outline" className={cn(
                          "uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-full border-2",
                          currentProfile.verificationStatus === 'verified' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          ineImage ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"
                        )}>
                          {currentProfile.verificationStatus === 'verified' ? 'Identidad Verificada ⭐' : ineImage ? 'En Revisión 🕒' : 'Sin Validar ❌'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <button type="button" onClick={() => ineInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors group overflow-hidden">
                            {ineImage ? (
                              <img src={ineImage} alt="INE" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                                <span className="text-xs font-bold text-slate-400">Subir frente de INE</span>
                              </>
                            )}
                          </button>
                          <input type="file" ref={ineInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'ine')} />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-[11px] font-black text-slate-700 uppercase">Seguridad ServiLink</p>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                Tu identidad es privada. Solo el Super Admin puede verla para verificar tu cuenta y garantizar la seguridad de la red.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {currentProfile?.role === 'admin' && (
                  <div className="space-y-6 bg-slate-900 text-white p-8 rounded-[32px] border-none shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent rounded-xl">
                        <Banknote className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter">Cuentas de Recaudación ServiLink</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-[10px] font-black uppercase">Banco / Institución</Label>
                        <Input value={formData.platformBankName} onChange={e => setFormData({...formData, platformBankName: e.target.value})} className="rounded-xl h-12 bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-[10px] font-black uppercase">Nombre del Titular</Label>
                        <Input value={formData.platformAccountHolder} onChange={e => setFormData({...formData, platformAccountHolder: e.target.value})} className="rounded-xl h-12 bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label className="text-slate-400 text-[10px] font-black uppercase">CLABE Interbancaria (18 dígitos)</Label>
                        <Input value={formData.platformClabe} onChange={e => setFormData({...formData, platformClabe: e.target.value})} className="rounded-xl h-14 bg-white/5 border-white/10 text-accent font-mono text-xl font-black" />
                      </div>
                    </div>
                  </div>
                )}

                {currentProfile?.role === 'technician' && (
                  <div className="space-y-6 bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100">
                    <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter">
                      <Wallet className="w-5 h-5 text-primary" /> Datos de Dispersión
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Banco Receptor</Label>
                        <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="rounded-xl h-12 bg-white border-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Cuenta</Label>
                        <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({...formData, paymentMethod: v})}>
                          <SelectTrigger className="rounded-xl h-12 bg-white border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transfer">CLABE (18 dígitos)</SelectItem>
                            <SelectItem value="card">Tarjeta de Débito (16 dígitos)</SelectItem>
                            <SelectItem value="oxxo_phone">Celular (OXXO/SPID)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Número de Cuenta / CLABE</Label>
                        <Input value={formData.paymentDetails} onChange={e => setFormData({...formData, paymentDetails: e.target.value})} className="rounded-xl h-12 bg-white border-slate-200 font-mono" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-6">
                <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg shadow-xl bg-primary text-white" disabled={loading}>
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> GUARDAR MI PERFIL PRO</>}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-xl border-none bg-primary text-white p-8 rounded-[40px] space-y-6 overflow-hidden relative">
            <div className="p-4 bg-white/10 rounded-2xl w-fit">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">Estatus de Miembro</h3>
              <p className="text-sm text-white/70 font-medium leading-relaxed italic">
                {currentProfile?.verificationStatus === 'verified' 
                  ? "¡Cuenta Verificada! Tu perfil transmite máxima seguridad y profesionalismo." 
                  : "Tu cuenta está en proceso de validación. Completa tu ubicación y sube tu INE para activar tu estatus Pro."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white text-primary font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl border-none">
                {currentProfile?.verificationStatus || 'Pendiente'}
              </Badge>
              {currentProfile?.verificationStatus === 'verified' && <CheckCircle2 className="w-5 h-5 text-white fill-emerald-500" />}
            </div>
          </Card>

          {currentProfile?.role !== 'admin' && (
            <Card className="rounded-[40px] border-none shadow-lg bg-white p-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mi Reputación</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black text-primary">{averageRating}</div>
                  <div>
                    <StarRating rating={starsToRender} readonly />
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{ratingCount} RESEÑAS TOTALES</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}