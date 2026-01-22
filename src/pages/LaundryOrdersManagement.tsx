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
import { useCreateLaundryOrderMutation, useGetMyPropertiesQuery, useGetPropertyLaundryOrdersQuery, useUpdateLaundryOrderMutation } from "@/redux/services/hmsApi";

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
    bookingId?: number | null;
    roomId?: number | null;
    vendorId: number | "";
    itemCount: number | "";
    pickupDate: string;
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
        pickupDate: "",
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
            await createLaundryOrder(payload).unwrap();

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
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
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
                                className="rounded-xl border bg-card p-4 flex justify-between"
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
                <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Create Laundry Order</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-6">
                        <Input
                            placeholder="Laundry Item ID"
                            type="number"
                            value={form.laundryId}
                            onChange={(e) =>
                                setForm({ ...form, laundryId: Number(e.target.value) })
                            }
                        />

                        <Input
                            placeholder="Vendor ID"
                            type="number"
                            value={form.vendorId}
                            onChange={(e) =>
                                setForm({ ...form, vendorId: Number(e.target.value) })
                            }
                        />

                        <Input
                            placeholder="Booking ID (optional)"
                            type="number"
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    bookingId: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                        />

                        {form.bookingId && (
                            <Input
                                placeholder="Room ID *"
                                type="number"
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        roomId: Number(e.target.value),
                                    })
                                }
                            />
                        )}

                        <Input
                            placeholder="Item Count"
                            type="number"
                            value={form.itemCount}
                            onChange={(e) =>
                                setForm({ ...form, itemCount: Number(e.target.value) })
                            }
                        />

                        <Input
                            type="datetime-local"
                            value={form.pickupDate}
                            onChange={(e) =>
                                setForm({ ...form, pickupDate: e.target.value })
                            }
                        />

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
