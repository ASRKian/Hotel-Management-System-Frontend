import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useCreateLaundryOrderMutation, useGetAllPropertyVendorsQuery, useGetBookingByIdQuery, useGetMyPropertiesQuery, useGetPropertyLaundryOrdersQuery, useGetPropertyLaundryPricingQuery, useTodayInHouseBookingIdsQuery, useUpdateLaundryOrderMutation } from "@/redux/services/hmsApi";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import DatePicker from 'react-datepicker'
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";

/* ---------------- Types ---------------- */
export type LaundryStatus =
    | "PENDING"
    | "PICKED_UP"
    | "IN_PROCESS"
    | "DELIVERED"
    | "CANCELLED";

type LaundryOrder = {
    id: string;
    item_name: string;
    item_count: number;
    item_rate: string;
    amount: string;
    laundry_status: LaundryStatus;
    vendor_id: string;
    pickup_date: string;
    delivery_date?: string | null;
};

type CreateLaundryOrderForm = {
    laundryId: number | "";
    bookingId?: number | "";
    roomId?: number | "";
    vendorId: number | "";
    itemCount: number | "";
    pickupDate: string | Date;
};

/* ---------------- Helpers ---------------- */
const STATUS_COLOR: Record<LaundryStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PICKED_UP: "bg-blue-100 text-blue-700",
    IN_PROCESS: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
};

function buildCreateLaundryOrderPayload(
    propertyId: number,
    form: CreateLaundryOrderForm
) {
    return {
        propertyId,
        laundryId: form.laundryId,
        bookingId: form.bookingId ?? null,
        roomId: form.bookingId ? form.roomId : null,
        vendorId: form.vendorId,
        itemCount: form.itemCount,
        pickupDate: form.pickupDate,
    };
}

function buildLaundryStatusPayload(status: LaundryStatus) {
    return {
        laundryStatus: status,
    };
}

function parseDate(value?: string | Date) {
    return value ? new Date(value) : null;
}

function formatDate(date?: Date | null) {
    return date ? date.toISOString() : "";
}

/* ---------------- Component ---------------- */
export default function LaundryOrdersManagement() {
    const [orders, setOrders] = useState<LaundryOrder[]>([]);
    const [sheetOpen, setSheetOpen] = useState(false);

    const [statusModal, setStatusModal] = useState<{
        open: boolean;
        orderId?: string;
        status?: LaundryStatus;
    }>({ open: false });

    const [form, setForm] = useState<CreateLaundryOrderForm>({
        laundryId: "",
        vendorId: "",
        itemCount: "",
        pickupDate: new Date(),
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [page, setPage] = useState(1);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetPropertyLaundryOrdersQuery({ propertyId: selectedPropertyId, page }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: laundryTypes } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: vendors } = useGetAllPropertyVendorsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: bookingIds } = useTodayInHouseBookingIdsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: bookingData } = useGetBookingByIdQuery(form.bookingId, {
        skip: !isLoggedIn || !form.bookingId
    })

    const [createLaundryOrder] = useCreateLaundryOrderMutation()
    const [updateLaundryOrder] = useUpdateLaundryOrderMutation()

    useEffect(() => {
        if (data?.data) {
            setOrders(data.data);
        }
    }, [data]);

    useEffect(() => {
        if (selectedPropertyId) {
            setPage(1);
        }
    }, [selectedPropertyId]);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length) {
            setSelectedPropertyId(String(myProperties.properties[0].id));
        }
    }, [myProperties, selectedPropertyId]);

    /* ---------------- Validation ---------------- */
    const isCreateDisabled = useMemo(() => {
        console.log("🚀 ~ LaundryOrdersManagement ~ form:", form)
        if (!form.laundryId || !form.vendorId || !form.itemCount || !form.pickupDate)
            return true;

        if (form.bookingId && !form.roomId) return true;

        return false;
    }, [form]);

    /* ---------------- Handlers ---------------- */
    const handleCreateOrder = async () => {
        if (!selectedPropertyId) return;

        const payload = buildCreateLaundryOrderPayload(
            Number(selectedPropertyId),
            form
        );

        try {
            const promise = createLaundryOrder(payload).unwrap();

            toast.promise(promise, {
                error: "Error creating order",
                pending: "Creating order, please wait",
                success: "Order created successfully"
            })

            setSheetOpen(false);
            setForm({
                laundryId: "",
                vendorId: "",
                itemCount: "",
                pickupDate: "",
            });
        } catch (err) {
            console.error("Create laundry order failed", err);
        }
    };

    const handleStatusUpdate = async () => {
        if (!statusModal.orderId || !statusModal.status) return;

        try {
            await updateLaundryOrder({
                id: statusModal.orderId,
                laundryStatus: statusModal.status,
            }).unwrap();

            setStatusModal({ open: false });
        } catch (err) {
            console.error("Status update failed", err);
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Laundry Orders</h1>
                            <p className="text-sm text-muted-foreground">
                                Track & manage laundry processing
                            </p>
                        </div>

                        <Button variant="hero" onClick={() => setSheetOpen(true)}>
                            Create Order
                        </Button>
                    </div>

                    {(isOwner || isSuperAdmin) && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Property</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={selectedPropertyId}
                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                            >
                                <option value="" disabled>
                                    Select property
                                </option>

                                {!myPropertiesLoading &&
                                    myProperties?.properties?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    }

                    {/* Orders */}
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="rounded-[3px] border bg-card p-4 flex justify-between"
                            >
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        {order.item_name} × {order.item_count}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        ₹{order.item_rate} • Total ₹{order.amount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Pickup: {new Date(order.pickup_date).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span
                                        className={cn(
                                            "text-xs px-2 py-0.5 rounded font-medium",
                                            STATUS_COLOR[order.laundry_status]
                                        )}
                                    >
                                        {order.laundry_status}
                                    </span>

                                    <select
                                        className="h-8 rounded border px-2 text-sm"
                                        value={order.laundry_status}
                                        disabled={
                                            order.laundry_status === "DELIVERED" ||
                                            order.laundry_status === "CANCELLED"
                                        }
                                        onChange={(e) => {
                                            if (e.target.value !== order.laundry_status) {
                                                setStatusModal({
                                                    open: true,
                                                    orderId: order.id,
                                                    status: e.target.value as LaundryStatus,
                                                });
                                            }
                                        }}

                                    >
                                        {Object.keys(STATUS_COLOR).map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <span className="text-sm text-muted-foreground">
                            Page {data?.pagination?.page} of{" "}
                            {data?.pagination?.totalPages}
                        </span>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="heroOutline"
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>

                            <Button
                                size="sm"
                                variant="heroOutline"
                                disabled={page >= (data?.pagination?.totalPages ?? 1)}
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(
                                            data?.pagination?.totalPages ?? p,
                                            p + 1
                                        )
                                    )
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>


                </section>
            </main>

            {/* Create Order Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md h-full overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Create Laundry Order</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-6">
                        {/* Laundry Item */}
                        <div className="space-y-1">
                            <Label>Laundry Item*</Label>


                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={form.laundryId}
                                onChange={(e) => setForm({
                                    ...form,
                                    laundryId: Number(e.target.value),
                                })}
                            >
                                {laundryTypes &&
                                    laundryTypes?.data?.map((laundry) => (
                                        <option key={laundry.id} value={laundry.id}>
                                            {laundry.item_name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Vendor */}
                        <div className="space-y-1">
                            <Label>Vendor*</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={form.vendorId}
                                onChange={(e) => setForm({
                                    ...form,
                                    vendorId: Number(e.target.value),
                                })}
                            >
                                <option value={""} disabled>Select vendor</option>
                                {vendors &&
                                    vendors?.map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>
                                            {vendor.name} - {vendor.email_id} - {vendor.vendor_type}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Booking */}
                        <div className="space-y-1">
                            <Label>Booking ID</Label>

                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={form.bookingId}
                                onChange={(e) => setForm({
                                    ...form,
                                    bookingId: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    roomId: ""
                                })}
                            >
                                <option value={""}>No Booking Id (Hotel Laundry)</option>
                                {bookingIds &&
                                    bookingIds?.map((bookingId) => (
                                        <option key={bookingId} value={bookingId}>
                                            #{bookingId}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Room (only if booking exists) */}
                        {form.bookingId && (
                            <div className="space-y-1">
                                <Label>Room ID*</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={form.roomId}
                                    onChange={(e) => setForm({
                                        ...form,
                                        roomId: Number(e.target.value),
                                    })}
                                >
                                    <option value={""} disabled>Select Room no</option>
                                    {bookingData &&
                                        bookingData?.booking?.rooms?.map((room) => (
                                            <option key={room.room_no} value={room.room_no}>
                                                {room.room_no}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Item Count */}
                        <div className="space-y-1">
                            <Label>Item Count *</Label>
                            <Input
                                type="text"
                                placeholder="Enter quantity"
                                value={form.itemCount}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        itemCount: +normalizeNumberInput(e.target.value),
                                    })
                                }
                            />
                        </div>

                        {/* Pickup Date */}
                        {/* <div className="space-y-1">
                            <Label>Pickup Date & Time *</Label>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="heroOutline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {form.pickupDate
                                            ? format(
                                                new Date(form.pickupDate),
                                                "dd MMM yyyy, hh:mm a"
                                            )
                                            : "Select pickup date"}
                                    </Button>
                                </PopoverTrigger>

                                <PopoverContent className="p-0 w-auto">
                                    <Calendar
                                        mode="single"
                                        selected={
                                            form.pickupDate
                                                ? new Date(form.pickupDate)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setForm({
                                                ...form,
                                                pickupDate: toISOString(date),
                                            })
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div> */}
                        <div className="space-y-1">
                            <Label>Pickup Date And time*</Label>
                            <div className="block">

                                <DatePicker
                                    selected={parseDate(form.pickupDate)}
                                    onChange={(date) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            pickupDate: formatDate(date),
                                        }));
                                    }}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    placeholderText="Select date & time"
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    wrapperClassName="w-full"
                                    minDate={new Date()}
                                />
                            </div>
                        </div>


                        {/* Submit */}
                        <Button
                            variant="hero"
                            className="w-full"
                            disabled={isCreateDisabled}
                            onClick={handleCreateOrder}
                        >
                            Create Order
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>


            {/* Status Confirm Modal */}
            <Dialog
                open={statusModal.open}
                onOpenChange={() => setStatusModal({ open: false })}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Status Update</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to update laundry status to{" "}
                        <strong>{statusModal.status}</strong>?
                    </p>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="heroOutline"
                            onClick={() => setStatusModal({ open: false })}
                        >
                            Cancel
                        </Button>
                        <Button variant="hero" onClick={handleStatusUpdate}>
                            Update
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
