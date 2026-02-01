import React, { useEffect } from 'react'
import { Menu, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '../ui/button';
import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { cn } from "@/lib/utils";
import { useGetMeQuery, useGetMyPropertiesQuery, useGetPropertyAddressByUserQuery, useLazyGetSidebarLinksQuery } from '@/redux/services/hmsApi';
import { useAppSelector } from '@/redux/hook';
import { useNavigate } from 'react-router-dom';
import { selectIsOwner, selectIsSuperAdmin } from '@/redux/selectors/auth.selectors';

export default function Sidebar() {

    const [sidebar, { data, isLoading, isError, isUninitialized }] = useLazyGetSidebarLinksQuery()
    const { isLoading: meLoading } = useGetMeQuery()
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: propertyAddress } = useGetPropertyAddressByUserQuery(undefined, {
        skip: !isLoggedIn || isOwner || isSuperAdmin || meLoading
    })

    useEffect(() => {
        if (!isLoggedIn) return
        sidebar(undefined)
    }, [isLoggedIn])


    return (
        <>
            {/* <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-card z-40"> */}
            <aside className="
                            hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col
                            bg-gradient-to-b from-background via-background to-muted/40
                            border-r border-border
                            shadow-lg
                            z-40
                        ">

                <div className="h-14 flex items-center justify-center border-b border-border cursor-pointer">
                    {/* <img
                        src={atithiflowLogo}
                        alt="AtithiFlow"
                        className="h-8 w-auto"
                    /> */}
                </div>

                {/* Property Info */}
                {isLoggedIn && !(isSuperAdmin || isOwner) && <div className="px-4 py-3 border-b border-border">
                    <div className="rounded-[3px] bg-muted/40 px-3 py-2 max-h-20 overflow-y-auto scrollbar-thin">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {propertyAddress?.brand_name}
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug break-words">
                            {propertyAddress?.address_line_1}
                            <br />
                            {propertyAddress?.city}, {propertyAddress?.state}, {propertyAddress?.postal_code}
                        </p>
                    </div>

                </div>}

                {/* <nav className="flex-1 px-4 py-6 space-y-2 border-r border-border"> */}
                <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto scrollbar-hide">
                    <p className="px-3 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">


                        {
                            !isLoading && !isError && !isUninitialized && data.sidebarLinks.map(link => {
                                return <SidebarLink endpoint={link.endpoint} label={link.link_name} keyProp={link.sidebar_link_id} />
                            })
                        }
                    </p>
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
                    <SheetContent
                        side="left"
                        className="p-0 w-64 flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="h-16 shrink-0 flex items-center justify-center border-b border-border font-bold text-lg text-primary">
                            AtithiFlow
                        </div>

                        {/* Scrollable nav */}
                        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
                            {!isLoading && !isError && !isUninitialized &&
                                data.sidebarLinks.map((link) => (
                                    <SidebarLink
                                        endpoint={link.endpoint}
                                        label={link.link_name}
                                        keyProp={link.sidebar_link_id}
                                    />
                                ))}
                        </nav>
                    </SheetContent>

                </Sheet>
                {/* <span className="ml-3 font-semibold text-foreground">Reservations</span> */}
            </div>
        </>
    )
}

function SidebarLink({ label, active = false, keyProp, endpoint }: any) {
    const navigate = useNavigate();

    return (
        <button
            key={keyProp + label}
            onClick={() => navigate(endpoint)}
            className={cn(
                "group w-full flex items-center gap-3 px-3 py-1.5 mt-1 rounded-[3px] text-[13px] transition-all duration-200",
                "focus:outline-none",
                active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-transparent text-foreground hover:bg-primary/10"
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                    active
                        ? "bg-primary-foreground/20"
                        : "bg-primary/5 group-hover:bg-primary/10"
                )}
            >
                <ChevronRight
                    className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-primary-foreground" : "text-primary"
                    )}
                />
            </div>

            {/* Label */}
            <span
                className={cn(
                    "font-medium truncate transition-colors",
                    active ? "text-primary-foreground" : "text-foreground"
                )}
            >
                {label}
            </span>
        </button>
    );
}
