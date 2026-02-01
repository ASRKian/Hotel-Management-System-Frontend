import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetOrderByBookingQuery } from "@/redux/services/hmsApi";

/* ---------------- Types ---------------- */
type RestaurantOrder = {
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
    expected_delivery_time: string | null;
    room_no?: string;
    guest_name?: string;
};

type Props = {
    bookingId: string;
};

/* ---------------- Helpers ---------------- */
const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "new":
            return "bg-blue-100 text-blue-700";
        case "preparing":
            return "bg-yellow-100 text-yellow-800";
        case "served":
            return "bg-green-100 text-green-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-muted text-foreground";
    }
};

const paymentColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "paid":
            return "bg-green-100 text-green-700";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "failed":
            return "bg-red-100 text-red-700";
        default:
            return "bg-muted text-foreground";
    }
};

/* ---------------- Component ---------------- */
export default function RestaurantOrdersEmbedded({ bookingId }: Props) {

    const { data: orders } = useGetOrderByBookingQuery(bookingId, {
        skip: !bookingId
    })

    if (!orders || orders.length === 0) {
        return (
            <div className="rounded-[3px] border bg-card p-6 text-sm text-muted-foreground">
                No restaurant orders found
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Restaurant Orders</h3>
                <span className="text-xs text-muted-foreground">
                    Total: {orders.length}
                </span>
            </div>

            <div className="space-y-3">
                {orders.map((order, index) => (
                    <div
                        key={order.id}
                        className="rounded-[5px] border bg-card p-5 space-y-3"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="font-semibold">
                                    Order #{order.id}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTime(order.order_date)}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <span
                                    className={cn(
                                        "text-xs font-medium px-2 py-1 rounded",
                                        statusColor(order.order_status)
                                    )}
                                >
                                    {order.order_status}
                                </span>

                                {/* <span
                                    className={cn(
                                        "text-xs font-medium px-2 py-1 rounded",
                                        paymentColor(order.payment_status)
                                    )}
                                >
                                    {order.payment_status}
                                </span> */}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Room</p>
                                <p className="font-medium">
                                    {order.room_no || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Guest</p>
                                <p className="font-medium">
                                    {order.guest_name || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Mobile</p>
                                <p className="font-medium">
                                    {order.guest_mobile || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Table</p>
                                <p className="font-medium">
                                    {order.table_no || "Room Service"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Expected Delivery</p>
                                <p className="font-medium">
                                    {formatDateTime(order.expected_delivery_time)}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Amount</p>
                                <p className="font-semibold text-primary">
                                    ₹{order.total_amount}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
