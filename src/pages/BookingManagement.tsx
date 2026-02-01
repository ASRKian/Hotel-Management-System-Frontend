import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

import { toast } from "react-toastify";
import { useCancelBookingMutation, useGetBookingByIdQuery, useGetBookingsQuery, useGetMyPropertiesQuery, useUpdateBookingMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useNavigate } from "react-router-dom";
import GuestsEmbedded from "@/components/layout/GuestsEmbedded";
import VehiclesEmbedded from "@/components/layout/VehiclesEmbedded";
import DatePicker from "react-datepicker";
import PaymentsEmbedded from "@/components/layout/PaymentEmbedded";
import { formatToDDMMYYYY } from "@/utils/formatToDDMMYYYY";
import LaundryEmbedded from "@/components/layout/LaundryEmbedded";
import BookingLogsEmbedded from "@/components/layout/BookingLogsEmbedded";
import RestaurantOrdersEmbedded from "@/components/layout/RestaurantOrdersEmbedded";

const REQUIRED_SCOPE_BY_STATUS: Record<string, "upcoming" | "past" | "all"> = {
    CONFIRMED: "upcoming",
    CHECKED_IN: "upcoming",

    CHECKED_OUT: "past",

    CANCELLED: "all",
    NO_SHOW: "all",
    // RESERVED: "all",
};

const UPDATABLE_STATUSES = [
    "CHECKED_IN",
    "CHECKED_OUT",
    "NO_SHOW",
];

const BOOKING_STATUSES = [
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "NO_SHOW",
    "CANCELLED"
] as const;


export default function BookingsManagement() {
    const [page, setPage] = useState(1);
    const [propertyId, setPropertyId] = useState<number | undefined>();

    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [cancelFee, setCancelFee] = useState("0");
    const [cancelComment, setCancelComment] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const [updatedStatus, setUpdatedStatus] = useState<string>("");

    const [scope, setScope] = useState("upcoming")
    const [status, setStatus] = useState("CONFIRMED")

    const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)

    const navigate = useNavigate()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: properties, isLoading: propertiesLoading, isUninitialized: propertiesUninitialized } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: bookings, isLoading: bookingsLoading, isUninitialized: bookingsUninitialized } = useGetBookingsQuery(
        { page, propertyId, fromDate, toDate, scope, status },
        { skip: !propertyId || !isLoggedIn }
    );


    const { data: selectedBooking, isLoading: selectedBookingLoading } = useGetBookingByIdQuery(bookingId, {
        skip: !isLoggedIn || !bookingId
    })

    const [cancelBooking] = useCancelBookingMutation()
    const [updateBooking, { error }] = useUpdateBookingMutation()
    console.log("🚀 ~ BookingsManagement ~ error:", error)
    const [updateBookingStatus] = useUpdateBookingMutation()

    async function handleManage(id: string) {
        setBookingId(id)
        setDetailsOpen(true);
    }

    async function handleCancelBooking() {
        if (!selectedBooking) return;

        const promise = cancelBooking({ booking_id: selectedBooking?.booking?.id, cancellation_fee: cancelFee, comments: cancelComment });

        toast.promise(promise, {
            pending: "Cancelling booking...",
            success: "Booking cancelled successfully",
            error: "Failed to cancel booking",
        });

        setCancelOpen(false);
        setDetailsOpen(false);
    }

    async function handleUpdateBooking() {
        if (!selectedBooking) return;

        const promise = updateBooking({ booking_id: selectedBooking?.booking?.id, status: updatedStatus }).unwrap();

        await toast.promise(promise, {
            pending: "Updating booking...",
            success: "Booking updated successfully",
            error: {
                render({ data }) {
                    return data?.data?.message || data?.message || "Failed to update booking";
                }
            }
        });

        console.log("🚀 ~ handleUpdateBooking ~ promise:", promise)
        setConfirmStatusOpen(false);
        setDetailsOpen(false);

    }

    useEffect(() => {
        if (!propertyId && properties?.properties?.length > 0) {
            setPropertyId(properties.properties[0].id);
        }
    }, [properties]);

    useEffect(() => {
        const requiredScope = REQUIRED_SCOPE_BY_STATUS[status];

        if (requiredScope && scope !== requiredScope) {
            setScope(requiredScope);
            setPage(1);
        }
    }, [status]);

    useEffect(() => {
        if (scope === "upcoming" && !["CONFIRMED", "CHECKED_IN"].includes(status)) {
            setStatus("CONFIRMED");
            setPage(1);
        }

        if (scope === "past" && status !== "CHECKED_OUT") {
            setStatus("CHECKED_OUT");
            setPage(1);
        }

    }, [scope]);

    const today = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const to = (dateStr?: string) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const bookingArrival = to(selectedBooking?.booking?.estimated_arrival);
    const bookingDeparture = to(selectedBooking?.booking?.estimated_departure);

    const canCheckIn =
        bookingArrival &&
        today() >= bookingArrival;

    const canCheckOut =
        selectedBooking?.booking?.booking_status === "CHECKED_IN";

    const canNoShow =
        bookingDeparture &&
        today() > bookingDeparture;

    const canCancel =
        bookingDeparture &&
        today() < bookingDeparture;


    function BookingSummaryTab({ booking }: any) {
        return (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Stats */}
                    <div className="space-y-4">
                        <SummaryCard label="Final Amount" value={`₹ ${+(booking?.final_amount || 0) + +(booking?.restaurant_total_amount || 0)}`} />
                        <SummaryCard label="Paid Amount" value={`₹ ${+(booking?.paid_amount ?? 0) + +(booking?.restaurant_paid_amount || 0)}`} />
                        <SummaryCard
                            label="Remaining Amount"
                            value={`₹ ${(+(booking?.final_amount || 0) + +(booking?.restaurant_total_amount || 0)) - (+(booking?.paid_amount ?? 0) + +(booking?.restaurant_paid_amount || 0)) || 0}`}
                        // highlight
                        />
                    </div>

                    {/* Center */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard label="Estimated Arrival" value={formatToDDMMYYYY(booking?.estimated_arrival)} />
                        <InfoCard label="Estimated Departure" value={formatToDDMMYYYY(booking?.estimated_departure)} />
                        <InfoCard label="Nights" value={booking?.booking_nights} />
                        <InfoCard label="Booking Type" value={booking?.booking_type} />
                        <InfoCard label="Booking Status" value={booking?.booking_status} />
                        <InfoCard label="Discount" value={`₹ ${booking?.discount_amount}`} />
                    </div>

                    {/* Right Stats */}
                    <div className="space-y-4">
                        {/* <SummaryCard label="Laundry Amount" value="₹ 250" /> */}
                        <SummaryCard label="Total Guests" value={booking?.adult + booking?.child} />
                        <SummaryCard label="Rooms Booked" value={booking?.rooms.length} />
                        <SummaryCard label="Booking Date" value={formatToDDMMYYYY(booking?.booking_date)} />
                    </div>
                </div>
                <div className="mt-4">
                    <InfoCard label="Comments" value={(booking?.comments || "No comments")} />
                </div>
            </>
        );
    }

    function SummaryCard({ label, value, highlight }: any) {
        return (
            <div
                className={`rounded-[3px] p-4 text-white ${highlight ? "bg-destructive" : "bg-primary"
                    }`}
            >
                <p className="text-sm opacity-90">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
            </div>
        );
    }

    function InfoCard({ label, value }: any) {
        return (
            <div className="rounded-[3px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-1">{value}</p>
            </div>
        );
    }

    function BookingRoomsTab({ booking }: any) {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {booking.rooms.map((room: any) => (
                    <div
                        key={room.room_id}
                        className="aspect-square rounded-lg border p-2 bg-card border-border"
                    >
                        <div className="flex flex-col items-center justify-center h-full leading-tight">
                            {/* Room Number – slightly bigger */}
                            <span className="text-sm font-semibold">
                                {room.room_no}
                            </span>

                            {/* Room Type – smaller */}
                            <span className="text-[10px] opacity-70">
                                {room.room_type ?? ""}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    function BookingGuestsTab({ bookingId, guestCount }: { bookingId: string, guestCount: number }) {
        return <GuestsEmbedded bookingId={bookingId} guestCount={guestCount} />;
    }

    function BookingVehiclesTab({ bookingId, rooms }: any) {
        return <VehiclesEmbedded bookingId={bookingId} rooms={rooms} />;
    }

    function BookingPaymentsTab({ bookingId, propertyId }: any) {
        return <PaymentsEmbedded bookingId={bookingId} propertyId={propertyId} />;
    }

    function BookingLaundryTab({ bookingId }: any) {
        return <LaundryEmbedded bookingId={bookingId} />;
    }

    function BookingRestaurantOrderTab({ bookingId }: any) {
        return <RestaurantOrdersEmbedded bookingId={bookingId} />;
    }

    function BookingLogsTab({ bookingId, propertyId }: any) {
        return <BookingLogsEmbedded bookingId={bookingId} />;
    }

    function ComingSoon({ label }: { label: string }) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
                {label} module coming soon
            </div>
        );
    }

    const parseDate = (value?: string) =>
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;   // local timezone safe
    };



    return (
        <div className="min-h-screen bg-background">
            <AppHeader user={{ email: "user@atithiflow.com" }} />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Bookings</h1>
                            <p className="text-sm text-muted-foreground">
                                Add, View and Manage bookings
                            </p>
                        </div>

                        <Button
                            size="sm"
                            variant="heroOutline"
                            onClick={() => navigate("/reservation")}
                        >
                            Add New Booking
                        </Button>
                    </div>


                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mb-4 max-w-4xl">
                        {/* Property */}
                        {(isSuperAdmin || isOwner) && <div className="space-y-1">
                            <Label>Property</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={propertyId ?? ""}
                                onChange={(e) =>
                                    setPropertyId(
                                        e.target.value ? Number(e.target.value) : undefined
                                    )
                                }
                            >
                                <option value="">All properties</option>
                                {!propertiesLoading && !propertiesUninitialized && properties?.properties?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.brand_name}
                                    </option>
                                ))}
                            </select>
                        </div>}

                        <div className="space-y-1">
                            <Label>Scope</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={scope}
                                onChange={(e) => {
                                    setScope(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="upcoming">Upcoming</option>
                                <option value="past">Past</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="CONFIRMED">CONFIRMED</option>
                                <option value="CHECKED_IN">CHECKED IN</option>
                                <option value="CHECKED_OUT">CHECKED OUT</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="NO_SHOW">NO SHOW</option>
                                {/* <option value="RESERVED">RESERVED</option> */}
                            </select>

                        </div>

                        {/* From Date */}
                        {/* <div className="space-y-1">
                            <Label>From Date</Label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setPage(1);
                                    setFromDate(e.target.value);
                                }}
                            />
                        </div> */}

                        <div className="space-y-1">
                            <Label>From Date</Label>

                            <DatePicker
                                selected={parseDate(fromDate)}
                                placeholderText="dd-mm-yyyy"
                                onChange={(date) => {
                                    setPage(1);
                                    setFromDate(formatDate(date));
                                }}
                                // onChangeRaw={(e) => e.preventDefault()}
                                dateFormat="dd-MM-yyyy"
                                // maxDate={toDate ? new Date(toDate) : undefined}
                                customInput={
                                    <Input readOnly />
                                }
                            />
                        </div>


                        {/* To Date */}
                        {/* <div className="space-y-1">
                            <Label>To Date</Label>
                            <Input
                                type="date"
                                min={fromDate || undefined}
                                value={toDate}
                                onChange={(e) => {
                                    setPage(1);
                                    setToDate(e.target.value);
                                }}
                            />
                        </div> */}
                        <div className="space-y-1">
                            <Label>To Date</Label>

                            <DatePicker
                                selected={parseDate(toDate)}
                                placeholderText="dd-mm-yyyy"
                                onChange={(date) => {
                                    setPage(1);
                                    setToDate(formatDate(date));
                                }}
                                // onChangeRaw={(e) => e.preventDefault()}  
                                dateFormat="dd-MM-yyyy"
                                minDate={fromDate ? new Date(fromDate) : undefined}
                                disabled={!fromDate}
                                customInput={
                                    <Input readOnly />
                                }
                            />
                        </div>


                        {/* Clear */}
                        <div className="flex items-end">
                            <Button
                                variant="heroOutline"
                                className="w-full"
                                onClick={() => {
                                    setFromDate("");
                                    setToDate("");
                                    setScope("upcoming");
                                    setStatus("CONFIRMED");
                                    setPage(1);
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-card border border-border rounded-[5px] overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Arrival</TableHead>
                                    <TableHead>Departure</TableHead>
                                    {/* <TableHead>Guests</TableHead> */}
                                    <TableHead>Room number(s)</TableHead>
                                    <TableHead>Pickup / Drop</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {!bookingsLoading && !bookingsUninitialized && bookings?.bookings.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell>
                                            {b.booking_status}
                                        </TableCell>
                                        <TableCell>
                                            {formatToDDMMYYYY(b.estimated_arrival)}
                                        </TableCell>
                                        <TableCell>
                                            {formatToDDMMYYYY(b.estimated_departure)}
                                        </TableCell>
                                        {/* <TableCell>
                                            {b.total_guest}
                                        </TableCell> */}
                                        <TableCell>
                                            {b.room_numbers.slice(0, 4).toString()}{b.room_numbers.length > 4 ? "..." : ""}
                                        </TableCell>
                                        <TableCell>
                                            {b.pickup ? "Yes" : "No"} / {b.drop ? "Yes" : "No"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() =>
                                                    handleManage(b.id)
                                                }
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {bookings?.pagination && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                                <span className="text-muted-foreground">
                                    Page {bookings.pagination.page} of {bookings.pagination.totalPages}
                                </span>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={page === 1 || bookingsLoading}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={
                                            page >= bookings.pagination.totalPages || bookingsLoading
                                        }
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Booking Details (Read-only) */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-5xl p-0 overflow-hidden"
                >
                    {/* Header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-6">
                        <div>
                            <h2 className="text-lg font-semibold">Booking (#{bookingId})</h2>
                            {/* <p className="text-xs text-muted-foreground">
                                Booking ID: {selectedBooking?.booking.id}
                            </p> */}
                        </div>

                        {/* Status Update */}
                        <div className="flex items-center gap-3 me-8">
                            <select
                                className="h-9 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={updatedStatus || selectedBooking?.booking.booking_status}
                                onChange={(e) => setUpdatedStatus(e.target.value)}
                                disabled={selectedBooking?.booking.booking_status === "CANCELLED"}
                            >
                                <option value={""} disabled>Select status</option>
                                {BOOKING_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace("_", " ")}
                                    </option>
                                ))}
                            </select>

                            <Button
                                size="sm"
                                variant="hero"
                                disabled={
                                    !updatedStatus ||
                                    updatedStatus === selectedBooking?.booking.booking_status
                                }
                                onClick={() => setConfirmStatusOpen(true)}
                            >
                                Update
                            </Button>
                        </div>
                    </div>


                    {/* Tabs */}
                    <Tabs defaultValue="summary" className="h-full">
                        {/* Tabs Header */}
                        <div className="border-b border-border px-6">
                            <TabsList className="h-12 bg-transparent p-0 gap-6">
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                                <TabsTrigger value="guests">Guests</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                                <TabsTrigger value="payments">Payments</TabsTrigger>
                                <TabsTrigger value="laundry">Laundry</TabsTrigger>
                                <TabsTrigger value="orders">Restaurant Orders</TabsTrigger>
                                <TabsTrigger value="logs">Logs</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Scrollable Content */}
                        <div className="h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide px-6 py-6">
                            <TabsContent value="summary">
                                <BookingSummaryTab booking={selectedBooking?.booking} />
                            </TabsContent>

                            <TabsContent value="rooms">
                                <BookingRoomsTab booking={selectedBooking?.booking} />
                            </TabsContent>

                            <TabsContent value="guests">
                                <BookingGuestsTab bookingId={selectedBooking?.booking.id} guestCount={selectedBooking?.adult} />
                            </TabsContent>

                            <TabsContent value="vehicles">
                                <BookingVehiclesTab bookingId={selectedBooking?.booking.id} rooms={selectedBooking?.booking.rooms} />
                            </TabsContent>

                            <TabsContent value="payments">
                                <BookingPaymentsTab bookingId={selectedBooking?.booking.id} propertyId={selectedBooking?.booking?.property_id} />
                            </TabsContent>

                            <TabsContent value="laundry">
                                <BookingLaundryTab bookingId={selectedBooking?.booking.id} />
                            </TabsContent>

                            <TabsContent value="orders">
                                <BookingRestaurantOrderTab bookingId={selectedBooking?.booking.id} />
                            </TabsContent>

                            <TabsContent value="logs">
                                <BookingLogsTab bookingId={selectedBooking?.booking.id} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </SheetContent>
            </Sheet>

            <Dialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Status Change</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-sm">
                        <p>
                            You are about to change booking status from{" "}
                            <strong>{selectedBooking?.booking.booking_status}</strong> to{" "}
                            <strong>{updatedStatus}</strong>.
                        </p>

                        <p className="text-muted-foreground">
                            This action may affect availability, billing, and reports.
                        </p>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="heroOutline"
                                onClick={() => setConfirmStatusOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={handleUpdateBooking}
                            >
                                Yes, Update Status
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? "—"}</p>
        </div>
    );
}

function Price({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span>₹ {value}</span>
        </div>
    );
}

function formatDate(date?: string) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
}
