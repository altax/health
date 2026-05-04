import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Home, BookOpen, FlaskConical, Ruler, Zap, TrendingUp,
  ChevronLeft, Settings, Calendar,
} from "lucide-react";

const NAV = [
  { id: "home", label: "Обзор", icon: Home, href: "/" },
  { id: "log", label: "Дневник", icon: BookOpen, href: "/log" },
  { id: "nutrients", label: "Нутриенты", icon: Zap, href: "/nutrients" },
  { id: "labs", label: "Анализы", icon: FlaskConical, href: "/labs" },
  { id: "measurements", label: "Замеры", icon: Ruler, href: "/measurements" },
  { id: "weekly", label: "Отчёт", icon: TrendingUp, href: "/weekly" },
  { id: "history", label: "История", icon: Calendar, href: "/history" },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location, navigate] = useLocation();

  const activeId = NAV.find((n) =>
    n.href === "/" ? location === "/" : location.startsWith(n.href)
  )?.id ?? "home";

  function goTo(href: string) {
    navigate(href);
  }

  return (
    <div className="fixed inset-0 bg-[#020209] flex flex-col overflow-hidden">
      <div className="aurora" />

      {/* Top bar */}
      <div className="relative z-20 flex items-center gap-3 px-5 pt-5 pb-3">
        {location !== "/" && (
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl glass hover:border-white/15 transition-colors mr-1"
          >
            <ChevronLeft className="h-4 w-4 text-white/50" />
          </button>
        )}
        <div className="flex-1">
          {title && (
            <h1 className="text-base font-light text-white">{title}</h1>
          )}
        </div>
        <button
          onClick={() => navigate("/profile")}
          className={`p-2 rounded-xl glass transition-colors ${location === "/profile" ? "border-cyan-400/30 bg-cyan-400/5" : "hover:border-white/15"}`}
        >
          <Settings className="h-4 w-4 text-white/40" />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="px-4 pb-4"
        >
          {children}
        </motion.div>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-20 px-4 pb-5 pt-2 shrink-0">
        <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-around">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.href)}
                className={`relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-cyan-400/10" : "hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-cyan-400" : "text-white/30"}`}
                  style={{ width: "18px", height: "18px" }} />
                <span className={`text-[9px] transition-colors ${isActive ? "text-cyan-400" : "text-white/20"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot-shell"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                    style={{ boxShadow: "0 0 6px rgba(110,231,247,0.8)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
