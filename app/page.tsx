
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, UserPlus, LayoutDashboard, LogOut, AlertTriangle, Zap } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.refresh();
  };

  const handleEmergency = () => {
    if (user) {
      router.push('/dashboard/client/create?emergency=true');
    } else {
      router.push('/login?redirect=/dashboard/client/create?emergency=true');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Banner de Emergencia Viral */}
        <div className="flex justify-center mb-4">
          <Button 
            onClick={handleEmergency}
            className={cn(
              "h-16 px-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-lg gap-3 shadow-2xl shadow-rose-200 animate-bounce transition-all",
              "ring-8 ring-rose-500/20"
            )}
          >
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            🆘 EMERGENCIA AHORA
            <span className="hidden sm:inline text-xs font-bold bg-white/20 px-2 py-1 rounded-full">En &lt; 2 HORAS ⚡</span>
          </Button>
        </div>

        <div className="flex justify-center">
          <div className="p-4 bg-primary rounded-3xl shadow-2xl shadow-primary/20">
            <ShieldCheck className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-6xl md:text-8xl font-headline font-black text-primary tracking-tighter">
            Servi<span className="text-accent">Link</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-xl mx-auto">
            Mantenimiento profesional. Conectamos expertos con soluciones.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center pt-8">
          {user ? (
            <div className="space-y-4 w-full max-w-sm">
              <Button 
                size="lg" 
                className="w-full text-lg h-16 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl transition-all hover:scale-105 gap-2"
                onClick={() => router.push('/dashboard')}
              >
                <LayoutDashboard className="w-5 h-5" /> Ir a mi Panel
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-slate-500 hover:text-destructive gap-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión actual ({user.email})
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Button 
                size="lg" 
                className="text-lg px-12 h-16 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl transition-all hover:scale-105 gap-2"
                onClick={() => router.push('/login')}
              >
                Iniciar Sesión <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-12 h-16 border-2 border-primary text-primary hover:bg-primary/5 rounded-2xl transition-all hover:scale-105 gap-2"
                onClick={() => router.push('/register')}
              >
                Crear Cuenta <UserPlus className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "SOS 2 Horas", desc: "Nuestra promesa: Técnico en camino en minutos para emergencias críticas." },
            { title: "Defensa IA", desc: "Gemini vigila que tus presupuestos sean siempre justos y honestos." },
            { title: "Manual de la Casa", desc: "Guardamos marcas, modelos y colores de tu hogar para siempre." }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-left hover:border-primary/50 transition-colors">
              <h3 className="font-headline font-bold text-lg mb-2 text-primary">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
