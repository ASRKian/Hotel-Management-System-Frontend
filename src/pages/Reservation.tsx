import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAvailableRoomsQuery, useCreateBookingMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useGetPropertyTaxQuery } from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";

/* -------------------- Types -------------------- */
type AvailableRoom = {
    id: string;
    room_no: string;
    room_type: string;
    floor_number: number;
};

type SelectedRoom = {
    ref_room_id: number;
};

type PropertyOption = {
    id: string;
    brand_name: string;
};

type PackageOption = {
    id: string;
    package_name: string;
};


/* -------------------- Component -------------------- */
export default function ReservationManagement() {
    /* -------- Booking Form State -------- */
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(14);
    const [packageId, setPackageId] = useState<number | null>(6);

    const [arrivalDate, setArrivalDate] = useState("");
    const [departureDate, setDepartureDate] = useState("");

    const [arrivalError, setArrivalError] = useState("");
    const [departureError, setDepartureError] = useState("");


    const [adult, setAdult] = useState<number | "">(1);
    const [child, setChild] = useState<number | "">("");

    const [totalPrice, setTotalPrice] = useState(0)

    const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
    const [discount, setDiscount] = useState(0);

    const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: packages, isLoading: packagesLoading, isUninitialized: packageUninitialized } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: availableRooms, isLoading: availableRoomsLoading, isUninitialized: isAvailableRoomUninitialized } = useAvailableRoomsQuery({ propertyId: selectedPropertyId, arrivalDate, departureDate }, {
        skip: !isLoggedIn || !selectedPropertyId || !arrivalDate || !departureDate || !!arrivalError || !!departureError
    })

    const { data: packageData } = useGetPackageByIdQuery({ packageId }, {
        skip: !packageId
    })
    console.log("🚀 ~ ReservationManagement ~ packageData:", packageData?.data)

    const { data: propertyTax } = useGetPropertyTaxQuery(selectedPropertyId, {
        skip: !selectedPropertyId
    })
    console.log("🚀 ~ ReservationManagement ~ propertyTax:", propertyTax)

    const [createBooking] = useCreateBookingMutation()

    async function submitReservation() {
        const payload = {
            property_id: selectedPropertyId,
            package_id: packageId,
            booking_type: "WALK_IN",
            booking_status: "CONFIRMED",
            booking_date: new Date().toISOString().slice(0, 10),
            estimated_arrival: arrivalDate,
            estimated_departure: departureDate,
            adult,
            child: child || 0,
            discount_type: discountType,
            discount,
            rooms: selectedRooms,
        };

        const promise = createBooking(payload).unwrap()

        toast.promise(promise, {
            pending: "Confirming your booking...",
            success: "Booking confirm",
            error: "Error creating booking"
        })
    }

    /* -------------------- Derived -------------------- */
    const roomsByFloor = useMemo(() => {
        if (availableRoomsLoading || isAvailableRoomUninitialized) return []
        const map: Record<number, AvailableRoom[]> = {};
        availableRooms?.rooms?.forEach((room) => {
            if (!map[room.floor_number]) map[room.floor_number] = [];
            map[room.floor_number].push(room);
        });
        return Object.entries(map).map(([floor, rooms]) => ({
            floor: Number(floor),
            rooms,
        }));
    }, [availableRooms, availableRoomsLoading, isAvailableRoomUninitialized]);

    const toggleRoom = (roomId: number) => {
        setSelectedRooms((prev) =>
            prev.some((r) => r.ref_room_id === roomId)
                ? prev.filter((r) => r.ref_room_id !== roomId)
                : [...prev, { ref_room_id: roomId }]
        );
    };

    const todayISO = () => new Date().toISOString().split("T")[0];

    const isAfter = (a: string, b: string) => {
        if (!a || !b) return true;
        return new Date(a) > new Date(b);
    };

    const handleArrivalChange = (value: string) => {
        setArrivalDate(value);

        if (value < todayISO()) {
            setArrivalError("Arrival date cannot be in the past");
        } else {
            setArrivalError("");
        }

        if (departureDate && !isAfter(departureDate, value)) {
            setDepartureError("Departure must be after arrival date");
        } else {
            setDepartureError("");
        }
    };

    const handleDepartureChange = (value: string) => {
        setDepartureDate(value);

        if (!arrivalDate) {
            setDepartureError("Select arrival date first");
        } else if (!isAfter(value, arrivalDate)) {
            setDepartureError("Departure must be after arrival date");
        } else {
            setDepartureError("");
        }
    };

    const nextDay = (date: string) => {
        if (!date) return todayISO();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    /* -------------------- Effects -------------------- */
    useEffect(() => {
        if (selectedPropertyId && arrivalDate && departureDate) {
            setSelectedRooms([]);
        }
    }, [selectedPropertyId, arrivalDate, departureDate]);


    useEffect(() => {
        if (!selectedPropertyId) {
            setPackageId(null);
            return;
        }
        setSelectedRooms([]);
    }, [selectedPropertyId]);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (!packageData) return
        const basePrice = packageData?.data?.base_price

        setTotalPrice(0)
    }, [packageData, selectedRooms, discount, discountType])

    /* -------------------- UI -------------------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] flex-1 overflow-hidden">

                    {/* =================== BOOKING FORM =================== */}
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 border-r border-border">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-foreground">New Reservation</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create a walk-in or direct booking.
                            </p>
                        </div>

                        <div className="space-y-6">

                            {/* Property & Package */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Property</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={selectedPropertyId ?? ""}
                                        onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                    >
                                        <option value="">Select property</option>
                                        {!myPropertiesLoading &&
                                            myProperties?.properties?.map((property) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Package</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={packageId ?? ""}
                                        onChange={(e) => setPackageId(Number(e.target.value) || null)}
                                        disabled={!selectedPropertyId}
                                    >
                                        <option value="">Select package</option>
                                        {!packageUninitialized && !packagesLoading && packages?.packages.map((pkg) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.package_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Arrival Date</Label>
                                    <Input type="date" value={arrivalDate} min={todayISO()} onChange={(e) => handleArrivalChange(e.target.value)} />
                                    {arrivalError && (
                                        <p className="text-sm text-red-500">{arrivalError}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Departure Date</Label>
                                    <Input type="date" disabled={!arrivalDate} value={departureDate} min={nextDay(arrivalDate) || todayISO()} onChange={(e) => handleDepartureChange(e.target.value)} />
                                </div>
                            </div>

                            {/* Guests */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Adults</Label>
                                    <Input type="number" min={1} value={adult} onChange={(e) => setAdult(normalizeNumberInput(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Children</Label>
                                    <Input type="number" min={0} value={child} onChange={(e) => setChild(normalizeNumberInput(e.target.value))} />
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as any)}
                                    >
                                        <option value="PERCENT">Percent (%)</option>
                                        <option value="FLAT">Flat</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Discount</Label>
                                    <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(+e.target.value)} />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4 border-t border-border flex justify-end">
                                <Button variant="hero" disabled={!packageId || selectedRooms.length === 0 || adult === 0 || !!arrivalError || !!departureError} onClick={submitReservation}>
                                    Confirm Booking
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* =================== AVAILABLE ROOMS =================== */}
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Available Rooms
                        </h2>

                        {roomsByFloor.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {(arrivalError || departureError) ? "Departure date should be greater than arrival date" : "Select dates to see available rooms."}
                            </p>
                        )}

                        <div className="space-y-6">
                            {roomsByFloor.map(({ floor, rooms }) => (
                                <div key={floor}>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                        Floor {floor}
                                    </h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {rooms.map((room) => {
                                            const isSelected = selectedRooms.some(
                                                (r) => r.ref_room_id === Number(room.id)
                                            );

                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => toggleRoom(Number(room.id))}
                                                    className={cn(
                                                        "aspect-square rounded-xl border p-3 text-sm font-semibold transition",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-card border-border hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <span>{room.room_no}</span>
                                                        <span className="text-xs opacity-70">
                                                            {room.room_type}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}








// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Calendar } from "@/components/ui/calendar";
// import { cn } from "@/lib/utils";
// import Sidebar from "@/components/layout/Sidebar";

// export default function ReservationLayout() {
//     const [dateRange, setDateRange] = useState<any>(null);

//     return (
//         <div className="min-h-screen bg-background">

//             <Sidebar />

//             {/* Main Content (offset for fixed sidebar) */}
//             <main className="lg:ml-64 h-screen overflow-hidden">
//                 <div className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
//                     <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] h-full">
//                         {/* Reservation Form */}
//                         <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8">
//                             <h2 className="text-xl font-semibold text-foreground mb-6">New Reservation</h2>

//                             <div className="space-y-6">
//                                 <div className="space-y-2">
//                                     <Label>Booking Nights</Label>
//                                     <Calendar
//                                         mode="range"
//                                         numberOfMonths={2}
//                                         // pagedNavigation
//                                         selected={dateRange}
//                                         onSelect={setDateRange}
//                                         className="w-full rounded-xl border border-border"
//                                         classNames={{
//                                             months: "flex w-full gap-4",
//                                             month: "flex-1",
//                                             table: "w-full"
//                                         }}
//                                     />

//                                 </div>

//                                 <div className="grid grid-cols-2 gap-4">
//                                     <div className="space-y-2">
//                                         <Label>Estimated Arrival</Label>
//                                         <Input type="time" />
//                                     </div>
//                                     <div className="space-y-2">
//                                         <Label>Estimated Departure</Label>
//                                         <Input type="time" />
//                                     </div>
//                                 </div>

//                                 <div className="grid grid-cols-3 gap-4">
//                                     <div className="space-y-2">
//                                         <Label>Adults</Label>
//                                         <Input type="number" min={0} />
//                                     </div>
//                                     <div className="space-y-2">
//                                         <Label>Children</Label>
//                                         <Input type="number" min={0} />
//                                     </div>
//                                     <div className="space-y-2">
//                                         <Label>Total Guests</Label>
//                                         <Input type="number" min={0} />
//                                     </div>
//                                 </div>

//                                 <div className="space-y-2">
//                                     <Label>Comments</Label>
//                                     <Textarea placeholder="Special requests or notes" />
//                                 </div>

//                                 <Button variant="hero" className="w-full">
//                                     Continue to Room Selection
//                                 </Button>
//                             </div>
//                         </section>

//                         {/* Rooms Grid */}
//                         <section className="h-full overflow-y-auto scrollbar-hide border-t lg:border-t-0 lg:border-l border-border bg-muted/20 p-6 lg:p-8">
//                             <h2 className="text-xl font-semibold text-foreground mb-6">Available Rooms</h2>

//                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
//                                 {Array.from({ length: 12 }).map((_, i) => (
//                                     <motion.div
//                                         key={i}
//                                         whileHover={{ scale: 1.03 }}
//                                         className={cn(
//                                             "h-24 rounded-xl border border-border flex items-center justify-center font-semibold",
//                                             i % 3 === 0 && "bg-accent text-accent-foreground",
//                                             i % 3 === 1 && "bg-card",
//                                             i % 3 === 2 && "bg-destructive/10 text-destructive"
//                                         )}
//                                     >
//                                         Room {100 + i}
//                                     </motion.div>
//                                 ))}
//                             </div>
//                         </section>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// }
