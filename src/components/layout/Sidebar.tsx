import React from 'react'
import { Home, CalendarDays, BedDouble, Settings, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '../ui/button';
import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { cn } from "@/lib/utils";

export default function Sidebar() {
    return (
        <>
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card z-40">
                <div className="h-16 flex items-center justify-center border-b border-border cursor-pointer">
                    <img
                        src={atithiflowLogo}
                        alt="AtithiFlow"
                        className="h-8 w-auto"
                    />
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <SidebarLink icon={Home} label="Dashboard" />
                    <SidebarLink icon={CalendarDays} label="Reservations" active />
                    <SidebarLink icon={BedDouble} label="Rooms" />
                    <SidebarLink icon={Settings} label="Settings" />
                </nav>
            </aside>

            {/* Mobile Header + Sidebar Drawer */}
            <div className="lg:hidden sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64">
                        <div className="h-16 flex items-center justify-center border-b border-border font-bold text-lg text-primary">
                            AtithiFlow
                        </div>
                        <nav className="px-4 py-6 space-y-2">
                            <SidebarLink icon={Home} label="Dashboard" />
                            <SidebarLink icon={CalendarDays} label="Reservations" active />
                            <SidebarLink icon={BedDouble} label="Rooms" />
                            <SidebarLink icon={Settings} label="Settings" />
                        </nav>
                    </SheetContent>
                </Sheet>
                <span className="ml-3 font-semibold text-foreground">Reservations</span>
            </div>
        </>
    )
}

function SidebarLink({ icon: Icon, label, active = false }: any) {
    return (
        <button
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}
