
"use client";

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';

const ProfileContext = createContext<{ profile: any; isLoading: boolean }>({ profile: null, isLoading: true });

export const useProfile = () => useContext(ProfileContext);

const MASTER_ADMIN_UID = '1gYT9nqjUBeM8HVSyWfsW7We6X03';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchProfile = useCallback(async (uid: string) => {
    if (!uid || !db) return null;
    try {
      // Caso especial: Administrador Maestro designado
      if (uid === MASTER_ADMIN_UID) {
        const adminRef = doc(db, 'adminProfiles', uid);
        const adminDoc = await getDoc(adminRef).catch(() => null);
        if (adminDoc?.exists()) return { ...adminDoc.data(), role: 'admin' };
        
        // Si no existe el documento aún, devolvemos un perfil de admin base
        return { 
          id: uid, 
          name: 'Master Admin', 
          email: user?.email || '', 
          role: 'admin',
          verificationStatus: 'verified'
        };
      }

      // Búsqueda secuencial estándar
      const adminRef = doc(db, 'adminProfiles', uid);
      const adminDoc = await getDoc(adminRef).catch(() => null);
      if (adminDoc?.exists()) return { ...adminDoc.data(), role: 'admin' };

      const clientRef = doc(db, 'clientProfiles', uid);
      const clientDoc = await getDoc(clientRef).catch(() => null);
      if (clientDoc?.exists()) return { ...clientDoc.data(), role: 'client' };

      const techRef = doc(db, 'technicianProfiles', uid);
      const techDoc = await getDoc(techRef).catch(() => null);
      if (techDoc?.exists()) return { ...techDoc.data(), role: 'technician' };

      return null;
    } catch (err: any) {
      console.error("Error al buscar perfil:", err);
      return null;
    }
  }, [db, user?.email]);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const loadIdentity = async () => {
      const data = await fetchProfile(user.uid);
      
      if (data) {
        setProfile(data);
        setIsLoadingProfile(false);
        setError(null);
      } else if (retryCount < 10) { 
        const delay = 500 + (retryCount * 200);
        setTimeout(() => setRetryCount(prev => prev + 1), delay);
      } else {
        setIsLoadingProfile(false);
        setError("No pudimos sincronizar tu perfil. Por favor, intenta cerrar sesión y volver a entrar.");
      }
    };

    loadIdentity();
  }, [user, isUserLoading, retryCount, fetchProfile, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (isUserLoading || (isLoadingProfile && !error)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-headline font-bold text-slate-400 animate-pulse uppercase text-xs tracking-widest">
          Sincronizando con ServiLink...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Acceso en proceso</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {error || "Estamos preparando tu espacio de trabajo."}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">Recargar Panel</Button>
          <Button onClick={handleLogout} variant="destructive">Cerrar Sesión</Button>
        </div>
      </div>
    );
  }

  const userData = {
    id: user?.uid || '',
    name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Usuario',
    email: user?.email || '',
    role: profile.role,
    status: profile.verificationStatus || 'active',
    profileImageUrl: profile.profileImageUrl || ''
  };

  return (
    <ProfileContext.Provider value={{ profile, isLoading: isLoadingProfile }}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background overflow-hidden">
          <DashboardSidebar user={userData as any} />
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            <header className="h-16 border-b bg-white flex items-center px-6 sticky top-0 z-40 shadow-sm">
              <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">ServiLink Pro</h2>
              <div className="ml-auto flex items-center">
                <span className="text-[10px] font-black px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-tighter border border-primary/20">
                  {profile.role === 'admin' ? 'Super Admin ⭐' : `Panel ${profile.role === 'client' ? 'Cliente' : 'Técnico'}`}
                </span>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/40">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProfileContext.Provider>
  );
}
