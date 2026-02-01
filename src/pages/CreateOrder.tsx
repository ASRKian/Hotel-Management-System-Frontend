import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import {
    useCreateOrderMutation,
    useGetMyPropertiesQuery,
    useGetPropertyMenuLightQuery,
    useGetRestaurantTablesLightQuery,
    useGetRoomsByBookingQuery,
    useTodayInHouseBookingIdsQuery
} from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import DatePicker from "react-datepicker";
import { toast } from "react-toastify";

type MenuItemLite = {
    id: string;
    item_name: string;
    is_active: boolean;
    price: number;
};

type OrderItemForm = {
    menu_item_id: number;
    quantity: number;
    unit_price: number;
    item_total: number;
    notes?: string;
    item_name: string;
};

export function CreateOrder() {
    /* ============================
       STATE
    ============================ */
    const [order, setOrder] = useState({
        property_id: null as number | null,
        table_no: "",
        guest_name: "",
        guest_mobile: "",
        room_id: "",
        booking_id: null as number | null,
        total_amount: 0,
        order_status: "New",
        payment_status: "Pending",
        waiter_staff_id: 1,
        expected_delivery_time: "",
    });

    const [items, setItems] = useState<OrderItemForm[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [isTotalManual, setIsTotalManual] = useState(false);
    const [expectedDelivery, setExpectedDelivery] = useState<Date | null>(null);

    /* ============================
       AUTH / ROLES
    ============================ */
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    /* ============================
       API
    ============================ */
    const { data: myProperties, isLoading: myPropertiesLoading } =
        useGetMyPropertiesQuery(undefined, { skip: !isLoggedIn });

    const { data: menuItems = [] } = useGetPropertyMenuLightQuery(
        selectedPropertyId,
        { skip: !isLoggedIn || !selectedPropertyId }
    );

    const { data: tables } = useGetRestaurantTablesLightQuery(selectedPropertyId, {
        skip: !selectedPropertyId || !isLoggedIn
    })

    const { data: bookings } = useTodayInHouseBookingIdsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: rooms } = useGetRoomsByBookingQuery(order.booking_id, {
        skip: !isLoggedIn || !order.booking_id
    })

    const [createOrder] = useCreateOrderMutation();

    /* ============================
       EFFECTS
    ============================ */
    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (selectedPropertyId) {
            setOrder(o => ({ ...o, property_id: selectedPropertyId }));
        }
    }, [selectedPropertyId]);

    useEffect(() => {
        if (expectedDelivery) {
            setOrder(o => ({
                ...o,
                expected_delivery_time: expectedDelivery.toISOString()
            }));
        }
    }, [expectedDelivery]);

    /* ============================
       ITEM HANDLERS
    ============================ */
    const addItem = (menuId: number) => {
        if (items.some(i => i.menu_item_id === menuId)) return;

        const menu = menuItems.find(m => Number(m.id) === menuId);
        if (!menu) return;

        setItems(p => [
            ...p,
            {
                menu_item_id: menuId,
                item_name: menu.item_name,
                quantity: 1,
                unit_price: Number(menu.price),     // ✅ AUTO PRICE
                item_total: Number(menu.price),     // ✅ qty(1) * price
                notes: ""
            }
        ]);

        // auto-update total only if not manual override
        if (!isTotalManual) {
            const updated = [
                ...items,
                {
                    menu_item_id: menuId,
                    item_name: menu.item_name,
                    quantity: 1,
                    unit_price: Number(menu.price),
                    item_total: Number(menu.price),
                    notes: ""
                }
            ];

            const total = updated.reduce((s, i) => s + i.item_total, 0);
            setOrder(o => ({ ...o, total_amount: total }));
        }
    };

    const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...patch };

            updated[index].item_total =
                updated[index].quantity * updated[index].unit_price;

            // only auto-update total if NOT manual override
            if (!isTotalManual) {
                const total = updated.reduce((s, i) => s + i.item_total, 0);
                setOrder(o => ({ ...o, total_amount: total }));
            }

            return updated;
        });
    };

    const removeItem = (index: number) => {
        setItems(p => {
            const updated = p.filter((_, i) => i !== index);
            const total = updated.reduce((s, i) => s + i.item_total, 0);
            setOrder(o => ({ ...o, total_amount: total }));
            return updated;
        });
    };

    /* ============================
       CREATE ORDER
    ============================ */
    const handleCreateOrder = async () => {

        if (!order.guest_name.trim()) {
            toast.error("Guest name is required");
            return;
        }

        if (!order.guest_mobile.trim()) {
            toast.error("Guest mobile number is required");
            return;
        }

        if (order.booking_id && !order.room_id) {
            toast.error("Room Number is mandatory")
            return
        }

        if (!items.length) {
            toast.error("Add at least one item");
            return;
        }

        const payload = {
            order: {
                ...order,
                expected_delivery_time: order.expected_delivery_time || null
            },
            items
        };

        const promise = createOrder(payload).unwrap();

        toast.promise(promise, {
            error: "Error creating order",
            pending: "Creating order please wait",
            success: "Order created"
        })

        // reset form
        setItems([]);
        setOrder(o => ({
            ...o,
            table_no: "",
            total_amount: 0,
            expected_delivery_time: ""
        }));

    };

    const isItemSelected = (menuId: number) => {
        return items.some(i => i.menu_item_id === menuId);
    };

    /* ============================
       UI
    ============================ */
    return (
        <div className="h-screen bg-background ">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] ">
                <section className="flex flex-col flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 gap-6">

                    <h1 className="text-2xl font-bold">Create Order</h1>

                    {/* Property */}
                    {(isSuperAdmin || isOwner) && (
                        <div className="w-full sm:w-64 space-y-1">
                            <Label className="text-xs">Property</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={selectedPropertyId ?? ""}
                                onChange={(e) =>
                                    setSelectedPropertyId(Number(e.target.value) || null)
                                }
                                disabled={!(isSuperAdmin || isOwner)}
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

                    {/* Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                        {/* Guest Name */}
                        <div className="flex flex-col gap-1">
                            <Label>Guest Name *</Label>
                            <Input
                                placeholder="Enter guest name"
                                value={order.guest_name}
                                onChange={(e) =>
                                    setOrder(o => ({ ...o, guest_name: e.target.value }))
                                }
                            />
                        </div>

                        {/* Guest Mobile */}
                        <div className="flex flex-col gap-1">
                            <Label>Guest Mobile *</Label>
                            <Input
                                placeholder="Enter mobile number"
                                value={order.guest_mobile}
                                onChange={(e) => e.target.value.trim().length <= 10 &&
                                    setOrder(o => ({
                                        ...o,
                                        guest_mobile: normalizeNumberInput(e.target.value.trim()).toString()
                                    }))
                                }
                            />
                        </div>

                        {/* Table No */}
                        <div className="flex flex-col gap-1">
                            <Label>Table No</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={order.table_no}
                                onChange={(e) =>
                                    setOrder(o => ({ ...o, table_no: e.target.value }))
                                }
                            >
                                <option value="">Select table</option>
                                {tables &&
                                    tables?.map((table) => (
                                        <option key={table.id} value={table.table_no}>
                                            {table.table_no} -- {table.status}
                                        </option>
                                    ))}
                            </select>

                        </div>

                        <div className="flex flex-col gap-1">
                            <Label>Booking Id</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={order.booking_id}
                                onChange={(e) =>
                                    setOrder(o => ({ ...o, booking_id: +e.target.value }))
                                }
                            >
                                <option value="">Select Booking Id</option>
                                {bookings &&
                                    bookings?.map((booking) => (
                                        <option key={booking} value={booking}>
                                            #{booking}
                                        </option>
                                    ))}
                            </select>

                        </div>
                        {order.booking_id && <div className="flex flex-col gap-1">
                            <Label>Room Number*</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={order.room_id}
                                onChange={(e) =>
                                    setOrder(o => ({ ...o, room_id: e.target.value }))
                                }
                            >
                                <option value="" disabled>Select Room Number</option>
                                {rooms &&
                                    rooms?.map((room) => (
                                        <option key={room.ref_room_id} value={room.ref_room_id}>
                                            {room.room_no}
                                        </option>
                                    ))}
                            </select>

                        </div>
                        }
                        {/* Expected Delivery */}
                        <div className="flex flex-col gap-1">
                            <Label>Expected Delivery</Label>

                            <DatePicker
                                selected={expectedDelivery}
                                onChange={(date: Date | null) => setExpectedDelivery(date)}
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

                        {/* Total Amount */}
                        <div className="flex flex-col gap-1">
                            <Label className="flex items-center gap-2">
                                Total Amount
                                {isTotalManual && (
                                    <span className="text-xs text-orange-500">(Manual)</span>
                                )}
                            </Label>

                            <Input
                                type="text"
                                value={order.total_amount}
                                onChange={(e) => {
                                    setIsTotalManual(true);
                                    setOrder(o => ({
                                        ...o,
                                        total_amount: +normalizeNumberInput(e.target.value)
                                    }));
                                }}
                                className={isTotalManual ? "border-orange-400 bg-orange-50" : ""}
                            />
                        </div>
                        {isTotalManual && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs w-fit"
                                onClick={() => {
                                    const total = items.reduce((s, i) => s + i.item_total, 0);
                                    setOrder(o => ({ ...o, total_amount: total }));
                                    setIsTotalManual(false);
                                }}
                            >
                                Recalculate Total
                            </Button>
                        )}

                    </div>


                    {/* Menu Selection */}
                    <div>
                        <Label>Select Items</Label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-3">

                            {menuItems.map((item: MenuItemLite) => {
                                const selected = isItemSelected(Number(item.id));

                                return (
                                    <button
                                        key={item.id}
                                        disabled={!item.is_active || selected}
                                        onClick={() => addItem(Number(item.id))}
                                        className={`
                        relative rounded-[3px] border p-2 text-left transition
                        ${selected
                                                ? "border-primary bg-primary/10 cursor-not-allowed opacity-70"
                                                : "hover:shadow-md hover:border-primary"}
                        ${!item.is_active ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                                    >
                                        {/* IMAGE */}
                                        <div className="w-full h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                            <img
                                                src={`${import.meta.env.VITE_API_URL}/menu/${item.id}/image`}
                                                alt={item.item_name}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        "https://placehold.co/200x150?text=No+Image";
                                                }}
                                            />
                                        </div>

                                        {/* NAME */}
                                        <p className="mt-2 text-xs font-medium text-center truncate">
                                            {item.item_name}
                                        </p>

                                        {/* SELECTED BADGE */}
                                        {selected && (
                                            <div className="absolute top-1 right-1 text-[10px] bg-primary text-white px-2 py-[2px] rounded-full">
                                                Selected
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        {items.map((item, i) => (
                            <div
                                key={i}
                                className="rounded-[3px] border p-4 space-y-3"
                            >
                                {/* ITEM NAME HEADER */}
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-sm">
                                        {item.item_name}
                                    </p>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => removeItem(i)}
                                    >
                                        ✕
                                    </Button>
                                </div>

                                {/* FORM GRID */}
                                <div className="grid grid-cols-6 gap-3 items-end">
                                    <div className="col-span-2">
                                        <Label>Qty</Label>
                                        <Input
                                            type="text"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(i, {
                                                    quantity: +normalizeNumberInput(e.target.value)
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label>Unit Price</Label>
                                        <Input
                                            type="text"
                                            min={0}
                                            value={item.unit_price}
                                            onChange={(e) =>
                                                updateItem(i, {
                                                    unit_price: +normalizeNumberInput(e.target.value)
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <Label>Total</Label>
                                        <Input
                                            type="text"
                                            min={0}
                                            value={item.item_total}
                                            onChange={(e) => {
                                                updateItem(i, {
                                                    item_total: +normalizeNumberInput(e.target.value)
                                                })
                                            }} />
                                    </div>

                                    <div className="col-span-6">
                                        <Label>Notes</Label>
                                        <Input
                                            value={item.notes ?? ""}
                                            onChange={(e) =>
                                                updateItem(i, {
                                                    notes: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Submit */}
                    <div className="pt-4 border-t flex justify-end">
                        <Button variant="hero" disabled={!items.length} onClick={handleCreateOrder}>
                            Create Order
                        </Button>
                    </div>

                </section>
            </main>
        </div>
    );
}
