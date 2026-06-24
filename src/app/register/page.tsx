
"use client";

import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md mb-4">
        <Button variant="ghost" onClick={() => router.push('/')} className="gap-2 text-slate-500 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Button>
      </div>
      <AuthForm type="register" />
    </div>
  );
}
