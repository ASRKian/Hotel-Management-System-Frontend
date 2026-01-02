import React, { useEffect } from 'react'
import { Menu, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '../ui/button';
import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { cn } from "@/lib/utils";
import { useLazyGetSidebarLinksQuery } from '@/redux/services/hmsApi';
import { useAppSelector } from '@/redux/hook';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {

    const [sidebar, { data, isLoading, isError, isUninitialized }] = useLazyGetSidebarLinksQuery()
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    useEffect(() => {
        if (!isLoggedIn) return
        sidebar("sidebar")
    }, [isLoggedIn])


    return (
        <>
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-card z-40">
                <div className="h-14 flex items-center justify-center border-b border-border cursor-pointer">
                    {/* <img
                        src={atithiflowLogo}
                        alt="AtithiFlow"
                        className="h-8 w-auto"
                    /> */}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 border-r border-border">
                    {
                        !isLoading && !isError && !isUninitialized && data.sidebarLinks.map(link => {
                            return <SidebarLink endpoint={link.endpoint} label={link.link_name} keyProp={link.sidebar_link_id} />
                        })
                    }
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
                            {
                                !isLoading && !isError && !isUninitialized && data.sidebarLinks.map(link => {
                                    return <SidebarLink endpoint={link.endpoint} label={link.link_name} keyProp={link.sidebar_link_id} />
                                })
                            }
                        </nav>
                    </SheetContent>
                </Sheet>
                <span className="ml-3 font-semibold text-foreground">Reservations</span>
            </div>
        </>
    )
}

function SidebarLink({ icon, label, active = false, keyProp, endpoint }: any) {
    console.log("🚀 ~ SidebarLink ~ endpoint:", endpoint)
    const navigate = useNavigate()
    return (
        <button
            key={keyProp + label}
            onClick={() => navigate(endpoint)}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
            )}
        >
            <ChevronRight className="h-4 w-4" />
            {label}
        </button>
    );
}
