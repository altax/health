import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  ClipboardList, 
  Droplet, 
  Home, 
  Menu, 
  ShieldCheck, 
  TestTubes,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const sidebarNav = [
  { title: "Обзор", href: "/", icon: Home },
  { title: "Дневник", href: "/log", icon: ClipboardList },
  { title: "Рекомендации", href: "/recommendations", icon: ShieldCheck },
  { title: "Нутриенты", href: "/nutrients", icon: Droplet },
  { title: "Анализы", href: "/labs", icon: TestTubes },
  { title: "Замеры", href: "/measurements", icon: Activity },
  { title: "Недельный отчёт", href: "/weekly", icon: BarChart3 },
  { title: "История", href: "/history", icon: Calendar },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavLinks = () => (
    <>
      <div className="py-4">
        <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Биометрика
        </h2>
        <div className="space-y-1 px-2">
          {sidebarNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href || (location.startsWith(item.href) && item.href !== "/") ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-auto py-4">
        <div className="space-y-1 px-2">
          <Link href="/profile">
            <Button 
              variant={location === "/profile" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Профиль
            </Button>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-14 items-center border-b px-4 font-mono font-bold text-primary">
              <Activity className="mr-2 h-5 w-5" />
              ЛичноеЗдоровье
            </div>
            <ScrollArea className="h-[calc(100vh-3.5rem)] flex flex-col">
              <NavLinks />
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <div className="flex font-mono font-bold text-primary">
          ЛичноеЗдоровье
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
          <div className="flex h-14 items-center border-b px-4 font-mono font-bold text-primary">
            <Activity className="mr-2 h-5 w-5" />
            ЛичноеЗдоровье
          </div>
          <ScrollArea className="flex-1 flex flex-col">
            <NavLinks />
          </ScrollArea>
        </aside>

        <main className="flex-1">
          <div className="h-full container max-w-6xl py-6 px-4 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
