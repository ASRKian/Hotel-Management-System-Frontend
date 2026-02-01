import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetMyPropertiesQuery, useGetSidebarLinksQuery, useRoomsStatusQuery } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";

/* ---------------- Types ---------------- */
type Room = {
    ref_room_id: number;
    room_no: string;
    floor_number: number;
    dirty: boolean;
    booking_status: "CHECKED_IN" | "BOOKED" | "CHECKED_OUT" | null;
    pickup: boolean | null;
    drop: boolean | null;
    status: "CHECKED_IN" | "FREE" | "DIRTY" | "BOOKED";
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
};

type Summary = {
    checked_in: number;
    confirmed: number;
    no_show: number;
    free: number;
    dirty: number;
};

type ApiResponse = {
    date: string;
    summary: Summary;
    rooms: Room[];
    checking_in: {
        room_no: string;
        pickup: boolean | null;
        drop: boolean | null;
    }[];
    checking_out: {
        room_no: string;
        pickup: boolean | null;
        drop: boolean | null;
    }[];
};

const ROOM_STATUS_LEGEND = [
    { label: "Occupied", color: "bg-pink-300" },
    { label: "Free", color: "bg-green-300" },
    { label: "Dirty", color: "bg-gray-300" },
    { label: "Adv. Booked", color: "bg-blue-300" },
    { label: "Under Maintenance", color: "bg-yellow-300" },
];

/* ---------------- Helpers ---------------- */
function getRoomUiStatus(room: Room): "OCCUPIED" | "FREE" | "DIRTY" | "BOOKED" {
    switch (room.status) {
        case "CHECKED_IN":
            return "OCCUPIED";
        case "BOOKED":
            return "BOOKED";
        case "DIRTY":
            return "DIRTY";
        case "FREE":
        default:
            return "FREE";
    }
}

function roomCardColor(status: "OCCUPIED" | "FREE" | "DIRTY" | "BOOKED" | "MAINTENANCE") {
    switch (status) {
        case "OCCUPIED":
            return "bg-pink-300 border-pink-200";
        case "BOOKED":
            return "bg-blue-300 border-blue-200";
        case "FREE":
            return "bg-green-300 border-green-200";
        case "DIRTY":
            return "bg-gray-300 border-gray-200";
        case "MAINTENANCE":
            return "bg-yellow-300 border-yellow-200";
        default:
            return "bg-card";
    }
}

/* ---------------- Component ---------------- */
export default function RoomStatusBoard() {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    const [propertyId, setPropertyId] = useState("")

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useRoomsStatusQuery({ propertyId, date: selectedDate }, {
        skip: !isLoggedIn || !propertyId
    })

    const navigate = useNavigate()

    const filteredCheckIns = data?.checking_in || [];
    const filteredCheckOuts = data?.checking_out || [];

    function getFloorName(floor: number): string {
        if (floor === 0) return "G|F";

        const romanMap: { value: number; symbol: string }[] = [
            { value: 1000, symbol: "M" },
            { value: 900, symbol: "CM" },
            { value: 500, symbol: "D" },
            { value: 400, symbol: "CD" },
            { value: 100, symbol: "C" },
            { value: 90, symbol: "XC" },
            { value: 50, symbol: "L" },
            { value: 40, symbol: "XL" },
            { value: 10, symbol: "X" },
            { value: 9, symbol: "IX" },
            { value: 5, symbol: "V" },
            { value: 4, symbol: "IV" },
            { value: 1, symbol: "I" },
        ];

        let num = floor;
        let roman = "";

        for (const { value, symbol } of romanMap) {
            while (num >= value) {
                roman += symbol;
                num -= value;
            }
        }

        return `${roman}|F`;
    }

    // const filteredCheckOuts = data.checking_out.filter(out =>
    //     data.rooms.some(
    //         room =>
    //             room.booking_status === "CHECKED_OUT" &&
    //             room.room_no === out.room_no
    //     )
    // );

    useEffect(() => {
        if (!propertyId && myProperties?.properties?.length > 0) {
            setPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);


    const pathname = useLocation().pathname
    usePermission(pathname)
    const { permission: bookingPermission } = usePermission("/bookings", { autoRedirect: false })

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                    {/* ---------- Header ---------- */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr] items-end gap-4">

                        {/* Title + Legend */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Room Status</h1>
                                <p className="text-sm text-muted-foreground">
                                    Daily occupancy & movements
                                </p>
                            </div>

                            {/* Status Legend */}
                            <div className="relative group mt-1">
                                <div className="flex items-center gap-1 cursor-pointer">
                                    {ROOM_STATUS_LEGEND.map((s) => (
                                        <span
                                            key={s.label}
                                            className={cn("h-3 w-3 rounded-full", s.color)}
                                        />
                                    ))}
                                </div>

                                {/* Hover Panel */}
                                <div className="absolute right-0 mt-2 w-44 rounded-[3px] border bg-card p-3 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                                    <p className="text-xs font-medium mb-2 text-muted-foreground">
                                        Room Status
                                    </p>

                                    <div className="space-y-1">
                                        {ROOM_STATUS_LEGEND.map((s) => (
                                            <div
                                                key={s.label}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <span
                                                    className={cn("h-3 w-3 rounded-full", s.color)}
                                                />
                                                <span>{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Property Select */}
                        {(isSuperAdmin || isOwner) && (
                            <div className="space-y-2">
                                <Label>Properties</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value)}
                                >
                                    <option value="" disabled>Select property</option>
                                    {!myPropertiesLoading &&
                                        myProperties?.properties?.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.brand_name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Date */}
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>

                        {/* Button */}
                        {bookingPermission?.can_create && <div className="flex items-end">
                            <Button
                                disabled={!bookingPermission?.can_create}
                                size="sm"
                                variant="heroOutline"
                                onClick={() => navigate("/reservation")}
                                className="w-full"
                            >
                                Add New Booking
                            </Button>
                        </div>}
                    </div>

                    {/* ---------- Summary ---------- */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <SummaryCard label="Checked In" value={data?.summary.checked_in} />
                        <SummaryCard label="Booked" value={data?.summary.confirmed} />
                        <SummaryCard label="No Show" value={data?.summary.no_show} />
                        <SummaryCard label="Free" value={data?.summary.free} />
                        <SummaryCard label="Dirty" value={data?.summary.dirty} />
                    </div>

                    {/* ---------- Main Layout ---------- */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4">
                        {/* ---------- Rooms Grid ---------- */}
                        <div className="bg-card border rounded-[5px] p-6">
                            <p className="font-semibold mb-4">Rooms</p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {data?.rooms.map((room) => {
                                    const uiStatus =
                                        getRoomUiStatus(room);

                                    return (
                                        <div
                                            key={room.ref_room_id}
                                            className={cn(
                                                "rounded-[3px] border p-3 space-y-2 transition",
                                                roomCardColor(uiStatus)
                                            )}
                                        >
                                            <p className="text-xs text-muted-foreground">
                                                {getFloorName(room.floor_number)}
                                            </p>
                                            <div className="flex justify-center items-center">
                                                <p className="text-2xl font-semibold">
                                                    {room.room_no}
                                                </p>
                                                {/* <span className="text-xs font-medium">
                                                    {uiStatus}
                                                </span> */}
                                            </div>

                                            <p className="text-xs text-muted-foreground">
                                                {room?.bed_type_name?.split(" ")?.[0]}|{room?.room_category_name}
                                            </p>
                                        </div>

                                    );
                                })}
                            </div>
                        </div>

                        {/* ---------- Right Panel ---------- */}
                        <div className="space-y-6">
                            {/* Checking Out */}
                            <div className="bg-card border rounded-[5px] p-5">
                                <p className="font-semibold mb-3">
                                    Checking Out
                                </p>

                                {filteredCheckOuts?.map((checkout, i) => (
                                    <MovementRow
                                        key={checkout.id ?? i}
                                        {...checkout}
                                    />
                                ))}

                            </div>

                            {/* Checking In */}
                            <div className="bg-card border rounded-[5px] p-5">
                                <p className="font-semibold mb-3">
                                    Checking In
                                </p>

                                {filteredCheckIns?.map((checkIn, i) => (
                                    <MovementRow
                                        key={checkIn.id ?? i}
                                        {...checkIn}
                                        checkIn={true}
                                    />
                                ))}


                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

/* ---------------- Small Components ---------------- */
function SummaryCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="bg-card border rounded-[3px] p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
        </div>
    );
}

function MovementRow({
    room_no,
    pickup,
    drop,
    checkIn
}: {
    room_no: string;
    pickup: boolean | null;
    drop: boolean | null;
    checkIn: boolean | null
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2 mb-2">
            <span className="font-medium">{room_no}</span>

            <div className="flex gap-2 text-xs">
                {checkIn && pickup && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Pickup
                    </span>
                )}
                {!checkIn && drop && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Drop
                    </span>
                )}
            </div>
        </div>
    );
}
