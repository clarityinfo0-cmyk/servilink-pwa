
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  LucideIcon, 
  Star, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Timer, 
  MessageSquare, 
  Brush, 
  CheckCircle2, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Car,
  MapPin,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * Componente para tarjetas de estadísticas en el dashboard.
 */
export function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: LucideIcon; color: string }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[32px] overflow-hidden group">
      <CardContent className="p-8 flex items-center gap-6">
        <div className={`p-4 rounded-2xl ${color} text-white group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 leading-none mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Sistema de Calificación con Estrellas Doradas Sólidas.
 */
export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void; 
  readonly?: boolean 
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = hovered !== null ? star <= hovered : star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!readonly) onRatingChange?.(star);
            }}
            className={cn(
              "transition-all duration-150 outline-none",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95",
              isFilled ? "text-amber-500" : "text-slate-200"
            )}
          >
            <Star 
              className={cn("w-8 h-8", readonly && "w-6 h-6")} 
              fill={isFilled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Badge de estado del servicio con estilos temáticos.
 */
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700 border-amber-200",
    asignado: "bg-blue-100 text-blue-700 border-blue-200",
    "en camino": "bg-orange-100 text-orange-700 border-orange-200 animate-pulse",
    "en sitio": "bg-indigo-100 text-indigo-700 border-indigo-200",
    presupuestado: "bg-purple-100 text-purple-700 border-purple-200",
    "en proceso": "bg-sky-100 text-sky-700 border-sky-200",
    "esperando pago": "bg-rose-100 text-rose-800 border-rose-300 border-2 animate-pulse",
    "revision_cliente": "bg-primary text-white border-none animate-bounce shadow-lg",
    terminado: "bg-emerald-100 text-emerald-700 border-emerald-200",
    garantia_reclamada: "bg-rose-600 text-white border-none animate-pulse shadow-lg",
  };
  
  const labels: Record<string, string> = {
    pendiente: "Reportado 📝",
    asignado: "Asignado 👤",
    "en camino": "En Camino 🚗",
    "en sitio": "En Domicilio 📍",
    presupuestado: "Presupuesto 💰",
    "en proceso": "En Obra 🧰",
    "esperando pago": "Validación Pago 💳",
    "revision_cliente": "Confirmar Entrega 👀",
    terminado: "Finalizado ✅",
    garantia_reclamada: "RECLAMACIÓN ⚠️",
  };

  return (
    <Badge variant="outline" className={cn(
      "capitalize font-black text-[9px] px-4 py-1.5 rounded-full border-2 tracking-tighter",
      styles[status] || ""
    )}>
      {labels[status] || status}
    </Badge>
  );
}

/**
 * Badge de urgencia con animación SOS para casos críticos.
 */
export function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    low: "bg-slate-100 text-slate-600 border-slate-200",
    medium: "bg-blue-50 text-blue-600 border-blue-200",
    urgent: "bg-rose-50 text-rose-600 border-rose-200 animate-pulse",
  };

  const labels: Record<string, string> = {
    low: "Prioridad Baja",
    medium: "Prioridad Media",
    urgent: "🚨 EMERGENCIA",
  };

  return (
    <Badge variant="outline" className={cn(
      "font-black text-[9px] px-3 py-1 rounded-full border-2 uppercase tracking-tighter",
      styles[urgency as keyof typeof styles] || styles.medium
    )}>
      {labels[urgency as keyof typeof labels] || urgency}
    </Badge>
  );
}

/**
 * Termómetro de precios analizado por IA.
 */
export function PriceThermometer({ verdict, score }: { verdict: 'fair' | 'questionable' | 'overpriced' | 'suspicious_low'; score: number }) {
  const config = {
    fair: { label: "PRECIO HONESTO", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: ShieldCheck },
    questionable: { label: "REVISAR DETALLES", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle },
    overpriced: { label: "SOBREPRECIO IA", color: "text-rose-500", bg: "bg-rose-500/10", icon: TrendingUp },
    suspicious_low: { label: "PRECIO BAJO RIESGOSO", color: "text-blue-500", bg: "bg-blue-500/10", icon: TrendingDown },
  };

  const item = config[verdict] || config.questionable;
  const Icon = item.icon;

  return (
    <div className={cn("p-4 rounded-2xl flex items-center gap-4 border-2 transition-all", item.bg, "border-white/10")}>
      <div className={cn("p-3 rounded-xl bg-white shadow-sm", item.color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={cn("font-black text-[10px] uppercase tracking-widest", item.color)}>{item.label}</p>
        <p className="text-[10px] text-slate-400 font-medium italic">Confianza IA: {100 - score}%</p>
      </div>
    </div>
  );
}

/**
 * Línea de progreso del servicio.
 */
export function ServiceProgress({ status }: { status: string }) {
  const steps = [
    { id: 'pendiente', label: 'Reporte', emoji: '📝' },
    { id: 'en camino', label: 'En Ruta', emoji: '🚗' },
    { id: 'presupuestado', label: 'IA Cotiza', emoji: '🤖' },
    { id: 'en proceso', label: 'Obra', emoji: '🧰' },
    { id: 'revision_cliente', label: 'Validar', emoji: '👀' },
    { id: 'terminado', label: 'Garantía', emoji: '🛡️' },
  ];

  const statusMap: Record<string, string> = {
    'asignado': 'pendiente', 
    'en sitio': 'en camino',
    'esperando pago': 'presupuestado', 
    'garantia_reclamada': 'en proceso',
  };

  const normalizedStatus = statusMap[status] || status;
  const currentStepIndex = steps.findIndex(s => s.id === normalizedStatus);
  const progress = currentStepIndex === -1 ? 0 : ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full py-6">
      <div className="flex justify-between relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000" 
          style={{ width: `${progress}%` }} 
        />
        
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isActive = index === currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all border-4 border-white shadow-lg bg-white",
                isCompleted ? "text-primary" : "text-slate-200 grayscale",
                isActive && "scale-125 ring-8 ring-primary/10 border-primary"
              )}>
                {step.emoji}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase mt-2 tracking-widest",
                isCompleted ? "text-primary" : "text-slate-300"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Badge dinámico de garantía activa.
 */
export function WarrantyBadge({ ticket }: { ticket: any }) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (ticket?.status === 'terminado' && ticket?.updatedAt) {
      const finishDate = new Date(ticket.updatedAt);
      const warrantyDays = Number(ticket.warrantyDays || 30);
      const expiryDate = new Date(finishDate.getTime() + (warrantyDays * 24 * 60 * 60 * 1000));
      const diff = expiryDate.getTime() - Date.now();
      setDaysRemaining(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
  }, [ticket]);

  if (daysRemaining === null || daysRemaining <= 0) return null;

  return (
    <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase tracking-tighter gap-1.5 px-3 py-1 animate-pulse">
      <ShieldCheck className="w-3 h-3" /> {daysRemaining} Días de Garantía Pro
    </Badge>
  );
}
