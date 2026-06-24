
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, User, Wrench, Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export function AuthForm({ type }: { type: 'login' | 'register' }) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'client' as 'client' | 'technician',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'login') {
        try {
          await signInWithEmailAndPassword(auth, formData.email, formData.password);
          toast({ title: "Acceso correcto", description: "Sincronizando identidad..." });
          router.push('/dashboard');
        } catch (error: any) {
          let errorMessage = "Ocurrió un error al intentar iniciar sesión.";
          if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            errorMessage = "El correo o la contraseña son incorrectos.";
          } else {
            console.error("Auth System Log:", error.code);
          }
          toast({ title: "Error de Acceso", description: errorMessage, variant: "destructive" });
        }
      } else {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const uid = userCredential.user.uid;

          const profileData = {
            id: uid,
            email: formData.email,
            role: formData.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            phoneNumber: '',
            city: '',
            verificationStatus: formData.role === 'technician' ? 'pending' : 'active'
          };

          if (formData.role === 'client') {
            await setDoc(doc(db, 'clientProfiles', uid), {
              ...profileData,
              name: formData.name,
              clientType: 'individual',
            });
          } else {
            await setDoc(doc(db, 'technicianProfiles', uid), {
              ...profileData,
              firstName: formData.name.split(' ')[0] || formData.name,
              lastName: formData.name.split(' ').slice(1).join(' ') || '',
              averageRating: 0,
            });
          }

          toast({ title: "¡Cuenta creada!", description: "Bienvenido a ServiLink." });
          router.push('/dashboard');
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            toast({ 
              title: "Correo ya registrado", 
              description: "Este email ya tiene una cuenta. Por favor, inicia sesión.",
            });
            router.push('/login');
          } else {
            let message = "No pudimos completar el registro.";
            if (error.code === 'auth/weak-password') {
              message = "La contraseña debe tener al menos 6 caracteres.";
            } else if (error.code === 'auth/invalid-email') {
              message = "El formato del correo no es válido.";
            }
            toast({ title: "Error de Registro", description: message, variant: "destructive" });
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error inesperado", description: "Algo salió mal. Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden">
      <CardHeader className="text-center space-y-1 bg-white pb-6 pt-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl font-headline font-black tracking-tight text-slate-800">
          {type === 'login' ? 'Bienvenido' : 'Nueva Cuenta'}
        </CardTitle>
        <CardDescription className="text-slate-500 font-medium">
          {type === 'login' ? 'Entra a tu panel profesional' : 'Regístrate para comenzar'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 bg-white px-8">
          {type === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-600 font-bold">Nombre Completo</Label>
              <Input 
                id="name" 
                placeholder="Juan Pérez" 
                required 
                className="h-12 rounded-xl"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-600 font-bold">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="correo@ejemplo.com" 
              required 
              className="h-12 rounded-xl"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-600 font-bold">Contraseña</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              placeholder="••••••••"
              className="h-12 rounded-xl"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {type === 'register' && (
            <div className="space-y-3 pt-2">
              <Label className="text-center block font-black text-[10px] uppercase tracking-widest text-slate-400">
                Selecciona tu rol
              </Label>
              <RadioGroup 
                defaultValue="client" 
                className="grid grid-cols-2 gap-4"
                onValueChange={(v) => setFormData({...formData, role: v as any})}
              >
                <div>
                  <RadioGroupItem value="client" id="role-client" className="peer sr-only" />
                  <Label
                    htmlFor="role-client"
                    className="flex flex-col items-center justify-between rounded-2xl border-2 border-slate-100 p-4 hover:border-primary/20 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                  >
                    <User className="mb-2 h-6 w-6 text-slate-400 peer-data-[state=checked]:text-primary" />
                    <span className="font-bold text-xs">Soy Cliente</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="technician" id="role-tech" className="peer sr-only" />
                  <Label
                    htmlFor="role-tech"
                    className="flex flex-col items-center justify-between rounded-2xl border-2 border-slate-100 p-4 hover:border-primary/20 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                  >
                    <Wrench className="mb-2 h-6 w-6 text-slate-400 peer-data-[state=checked]:text-primary" />
                    <span className="font-bold text-xs">Soy Técnico</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-white px-8 pb-10 pt-4">
          <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (type === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </Button>
          <Button 
            variant="ghost" 
            type="button" 
            className="text-sm font-medium text-slate-500"
            onClick={() => router.push(type === 'login' ? '/register' : '/login')}
          >
            {type === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
