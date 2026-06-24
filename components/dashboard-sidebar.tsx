"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  LogOut,
  UserCircle,
  Wrench,
  ShieldCheck,
  Home,
  MessageSquare,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User as MockUser } from "@/lib/mock-store";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

export function DashboardSidebar({
  user,
}: {
  user: MockUser & { profileImageUrl?: string; verificationStatus?: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const goTo = (href: string) => {
    router.push(href);
    setOpenMobileMenu(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { title: "Panel Principal", icon: LayoutDashboard, href: "/dashboard", roles: ["client", "technician", "admin"] },
    { title: "Crear Ticket", icon: PlusCircle, href: "/dashboard/client/create", roles: ["client"] },
    { title: "Mi Casa", icon: Home, href: "/dashboard/client/history", roles: ["client"] },
    { title: "Mis Trabajos", icon: Wrench, href: "/dashboard/tech", roles: ["technician"] },
    { title: "Todos los Tickets", icon: ClipboardList, href: "/dashboard/admin/tickets", roles: ["admin"] },
    { title: "Usuarios", icon: Users, href: "/dashboard/admin/users", roles: ["admin"] },
    { title: "Mi Perfil", icon: UserCircle, href: "/dashboard/profile", roles: ["client", "technician"] },
  ];

  const WHATSAPP_SUPPORT_URL =
    "https://wa.me/526873675477?text=Hola,%20solicito%20asistencia%20profesional%20con%20mi%20plataforma%20ServiLink%20Pro.";

  return (
    <aside className="w-full md:w-72 bg-slate-950 text-white border-b md:border-b-0 md:border-r border-slate-800 shrink-0 md:min-h-screen">
      <button
        type="button"
        onClick={() => setOpenMobileMenu((prev) => !prev)}
        className="md:hidden w-full flex items-center justify-between p-4 bg-slate-950 text-white border-b border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg leading-tight">ServiLink</p>
            <p className="text-[10px] uppercase tracking-wider text-white/50">{user.role}</p>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-white/10 border border-white/10">
          {openMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </div>
      </button>

      <div className="hidden md:flex p-4 items-center gap-2 border-b border-slate-800">
        <div className="p-2 bg-blue-600 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-lg leading-tight truncate">ServiLink</span>
          <span className="text-[10px] uppercase tracking-wider text-white/50">{user.role}</span>
        </div>
      </div>

      <div className={cn(openMobileMenu ? "block" : "hidden", "md:block")}>
        <nav className="py-4 px-3 flex flex-col gap-2">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goTo(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                  pathname === item.href
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm">{item.title}</span>
              </button>
            ))}

          <a
            href={WHATSAPP_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/20"
          >
            <MessageSquare className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm">Soporte WhatsApp</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="relative">
              <Avatar className="w-10 h-10 border border-slate-700 shadow-sm overflow-hidden bg-slate-800">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-blue-600/20 text-blue-400 font-black">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>

              {user.verificationStatus === "verified" && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-white" />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{user.name}</span>
              <span className="text-[10px] text-white/50 truncate font-black uppercase tracking-tighter">
                {user.verificationStatus === "verified"
                  ? "Verificado ⭐"
                  : "Estatus: " + (user.verificationStatus || "Normal")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}