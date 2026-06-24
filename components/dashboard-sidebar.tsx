"use client";

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
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    {
      title: "Panel Principal",
      icon: LayoutDashboard,
      href: "/dashboard",
      roles: ["client", "technician", "admin"],
    },
    {
      title: "Crear Ticket",
      icon: PlusCircle,
      href: "/dashboard/client/create",
      roles: ["client"],
    },
    {
      title: "Mi Casa",
      icon: Home,
      href: "/dashboard/client/history",
      roles: ["client"],
    },
    {
      title: "Mis Trabajos",
      icon: Wrench,
      href: "/dashboard/tech",
      roles: ["technician"],
    },
    {
      title: "Todos los Tickets",
      icon: ClipboardList,
      href: "/dashboard/admin/tickets",
      roles: ["admin"],
    },
    {
      title: "Usuarios",
      icon: Users,
      href: "/dashboard/admin/users",
      roles: ["admin"],
    },
    {
      title: "Mi Perfil",
      icon: UserCircle,
      href: "/dashboard/profile",
      roles: ["client", "technician"],
    },
  ];

  const WHATSAPP_SUPPORT_URL =
    "https://wa.me/526873675477?text=Hola,%20solicito%20asistencia%20profesional%20con%20mi%20plataforma%20ServiLink%20Pro.";

  return (
    <Sidebar className="w-full md:w-72 h-auto md:h-screen border-b md:border-b-0 md:border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 border-b border-sidebar-border">
        <div className="p-2 bg-accent rounded-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="font-headline font-bold text-lg leading-tight truncate">
            ServiLink
          </span>
          <span className="text-[10px] uppercase tracking-wider text-accent-foreground/70">
            {user.role}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 md:py-4 overflow-x-auto md:overflow-x-visible">
        <SidebarMenu className="flex flex-row md:flex-col gap-2 px-3 md:px-2 min-w-max md:min-w-0">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <SidebarMenuItem key={item.title} className="shrink-0 md:shrink">
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-lg transition-all whitespace-nowrap",
                    pathname === item.href
                      ? "bg-accent text-white hover:bg-accent/90"
                      : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium text-sm">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

          <SidebarMenuItem className="shrink-0 md:shrink md:mt-4">
            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/20 group whitespace-nowrap"
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-bold text-sm">Soporte WhatsApp</span>
            </a>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="relative">
            <Avatar className="w-10 h-10 border border-sidebar-border shadow-sm overflow-hidden bg-slate-800">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <AvatarFallback className="bg-accent/20 text-accent font-black">
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
            <span className="text-[10px] text-sidebar-foreground/60 truncate font-black uppercase tracking-tighter">
              {user.verificationStatus === "verified"
                ? "Verificado ⭐"
                : "Estatus: " + (user.verificationStatus || "Normal")}
            </span>
          </div>
        </div>

        <SidebarMenuButton
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}