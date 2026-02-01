import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import {
    useGetMyPropertiesQuery,
    useGetPropertyOrdersQuery,
    useUpdateOrderPaymentMutation,
    useUpdateOrderStatusMutation
} from "@/redux/services/hmsApi";
import { OrderItemsModal } from "./OrderItemsModal";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

type Order = {
    id: string;
    property_id: string;
    table_no: string;
    guest_id: string | null;
    room_id: string | null;
    booking_id: string | null;
    order_date: string;
    total_amount: string;
    order_status: string;
    payment_status: string;
    waiter_staff_id: string;
    expected_delivery_time: string;
    room_no: string;
    guest_name: string | null;
    guest_mobile: string | null;
};

export function OrdersManagement() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [itemsOpen, setItemsOpen] = useState(false);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    const navigate = useNavigate()

    const { data: myProperties, isLoading: myPropertiesLoading } =
        useGetMyPropertiesQuery(undefined, { skip: !isLoggedIn });

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    /* ============================
       ORDERS QUERY (PAGINATED)
    ============================ */
    const { data, isLoading } = useGetPropertyOrdersQuery(
        {
            propertyId: selectedPropertyId,
            page,
            limit: 10,
            status: statusFilter || undefined
        },
        {
            skip: !isLoggedIn || !selectedPropertyId
        }
    );

    const [updateOrderPayment] = useUpdateOrderPaymentMutation();
    const [updateOrderStatus] = useUpdateOrderStatusMutation();

    /* ============================
       ACTIONS
    ============================ */
    const handleOrderStatusUpdate = async (orderId: string, status: string) => {
        const promise = updateOrderStatus({
            id: orderId,
            payload: { status }
        }).unwrap();

        toast.promise(promise, {
            error: "Error updating order",
            pending: "Updating please wait",
            success: "Order updated successfully"
        })
    };

    const handlePaymentStatusUpdate = async (orderId: string, status: string) => {
        const promise = updateOrderPayment({
            id: orderId,
            payload: { status }
        }).unwrap();

        toast.promise(promise, {
            error: "Error updating order",
            pending: "Updating please wait",
            success: "Order updated successfully"
        })
    };

    return (
        <div className="h-screen bg-background overflow-hidden">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">

                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between shrink-0">

                        {/* LEFT: Title */}
                        <div className="flex flex-col justify-end">
                            <h1 className="text-2xl font-bold leading-tight">Orders</h1>
                            <p className="text-sm text-muted-foreground">
                                Restaurant & room service orders
                            </p>
                        </div>

                        {/* RIGHT: Controls */}
                        <div className="flex flex-wrap gap-4 items-end">

                            {/* Status Filter */}
                            <div className="w-56 flex flex-col justify-end">
                                <Label className="text-[11px] text-muted-foreground mb-1">
                                    Filter by Status
                                </Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All</option>
                                    {ORDER_STATUSES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Property */}
                            {(isSuperAdmin || isOwner) && (
                                <div className="w-64 flex flex-col justify-end">
                                    <Label className="text-[11px] text-muted-foreground mb-1">
                                        Property
                                    </Label>
                                    <select
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={selectedPropertyId ?? ""}
                                        onChange={(e) => {
                                            setSelectedPropertyId(Number(e.target.value) || null);
                                            setPage(1);
                                        }}
                                        disabled={!(isSuperAdmin || isOwner)}
                                    >
                                        <option value="">All properties</option>
                                        {!myPropertiesLoading &&
                                            myProperties?.properties?.map((property) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* New Order Button */}
                            <div className="flex flex-col justify-end">
                                <Label className="text-[11px] text-transparent mb-1">Action</Label>
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    onClick={() => {
                                        navigate("/create-order")
                                    }}
                                    className="h-10"
                                >
                                    New Order
                                </Button>
                            </div>

                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                        {isLoading && (
                            <p className="text-sm text-muted-foreground">Loading orders...</p>
                        )}

                        {data?.data?.map((order: Order) => (
                            <div
                                key={order.id}
                                className="rounded-[3px] border bg-card p-4 flex justify-between items-center"
                            >
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        Order #{order.id} • Table {order.table_no || "—"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        ₹{order.total_amount} • {new Date(order.order_date).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground space-y-0.5">
                                        {order.guest_name && (
                                            <span className="block">
                                                Guest: {order.guest_name}
                                                {order.guest_mobile && ` • ${order.guest_mobile}`}
                                            </span>
                                        )}

                                        <span className="block">
                                            {order.booking_id && `Booking: #${order.booking_id}  • `}
                                            {order.room_no && `Room: ${order.room_no}`}
                                        </span>
                                    </p>

                                </div>

                                <div className="flex items-end gap-4">

                                    {/* Order Status */}
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-[11px] text-muted-foreground">
                                            Order Status
                                        </Label>
                                        <select
                                            className="h-9 rounded-lg border px-2 text-sm"
                                            value={order.order_status}
                                            onChange={(e) =>
                                                handleOrderStatusUpdate(order.id, e.target.value)
                                            }
                                        >
                                            {ORDER_STATUSES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Payment Status */}
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-[11px] text-muted-foreground">
                                            Payment Status
                                        </Label>
                                        <select
                                            className="h-9 rounded-lg border px-2 text-sm"
                                            value={order.payment_status}
                                            onChange={(e) =>
                                                handlePaymentStatusUpdate(order.id, e.target.value)
                                            }
                                        >
                                            {PAYMENT_STATUSES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Items */}
                                    <div className="flex flex-col gap-1">
                                        {/* <Label className="text-[11px] text-muted-foreground">
                                            Items
                                        </Label> */}
                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            onClick={() => {
                                                setSelectedOrderId(order.id);
                                                setItemsOpen(true);
                                            }}
                                        >
                                            View Items
                                        </Button>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {data?.pagination && (
                        <div className="shrink-0 flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Page {data.pagination.page} of {data.pagination.totalPages}
                            </span>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    disabled={page >= data.pagination.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                </section>
            </main>

            <OrderItemsModal
                orderId={selectedOrderId}
                open={itemsOpen}
                onClose={() => {
                    setItemsOpen(false);
                    setSelectedOrderId(null);
                }}
            />

        </div>
    );
}
