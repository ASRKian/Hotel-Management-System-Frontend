import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";

export default function ReservationLayout() {
    const [dateRange, setDateRange] = useState<any>(null);

    return (
        <div className="min-h-screen bg-background">

            <Sidebar />

            {/* Main Content (offset for fixed sidebar) */}
            <main className="lg:ml-64 h-screen overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] h-full">
                    {/* Reservation Form */}
                    <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8">
                        <h2 className="text-xl font-semibold text-foreground mb-6">New Reservation</h2>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Booking Nights</Label>
                                <Calendar
                                    mode="range"
                                    numberOfMonths={2}
                                    // pagedNavigation
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    className="w-full rounded-xl border border-border"
                                    classNames={{
                                        months: "flex w-full gap-4",
                                        month: "flex-1",
                                        table: "w-full"
                                    }}
                                />

                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Estimated Arrival</Label>
                                    <Input type="time" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estimated Departure</Label>
                                    <Input type="time" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Adults</Label>
                                    <Input type="number" min={0} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Children</Label>
                                    <Input type="number" min={0} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Guests</Label>
                                    <Input type="number" min={0} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Comments</Label>
                                <Textarea placeholder="Special requests or notes" />
                            </div>

                            <Button variant="hero" className="w-full">
                                Continue to Room Selection
                            </Button>
                        </div>
                    </section>

                    {/* Rooms Grid */}
                    <section className="h-full overflow-y-auto scrollbar-hide border-t lg:border-t-0 lg:border-l border-border bg-muted/20 p-6 lg:p-8">
                        <h2 className="text-xl font-semibold text-foreground mb-6">Available Rooms</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.03 }}
                                    className={cn(
                                        "h-24 rounded-xl border border-border flex items-center justify-center font-semibold",
                                        i % 3 === 0 && "bg-accent text-accent-foreground",
                                        i % 3 === 1 && "bg-card",
                                        i % 3 === 2 && "bg-destructive/10 text-destructive"
                                    )}
                                >
                                    Room {100 + i}
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
