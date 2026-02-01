import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useGetBookingLaundryOrdersQuery } from "@/redux/services/hmsApi";

/* ---------------- Types ---------------- */
type LaundryForm = {
    id?: string;
    item_name?: string;
    laundry_type?: string;
    item_count?: number;
    item_rate?: string;
    amount?: string;
    laundry_status?: string;
    pickup_date?: string;
    delivery_date?: string | null;
    status?: string;
};

type Props = {
    bookingId: string;
};

/* ---------------- Component ---------------- */
export default function LaundryEmbedded({ bookingId }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data: laundry } = useGetBookingLaundryOrdersQuery(bookingId,
        { skip: !bookingId }
    );

    // const [upsertLaundry, { isLoading }] = useUpsertLaundryMutation();

    // useEffect(() => {
    //     if (!data?.laundry) return;
    //     setLaundry(data.laundry);
    // }, [data]);

    const addItem = () => {
        setIsEditing(true);
        // setLaundry((l) => [
        //     ...l,
        //     {
        //         item_name: "",
        //         laundry_type: "GUEST",
        //         item_count: 1,
        //         item_rate: "0.00",
        //         amount: "0.00",
        //         laundry_status: "PENDING",
        //         pickup_date: new Date().toISOString(),
        //         delivery_date: null,
        //         status: "active",
        //     },
        // ]);
    };

    const removeItem = (index: number) => {
        // setLaundry((l) => l.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, patch: Partial<LaundryForm>) => {
        // setLaundry((prev) =>
        //     prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
        // );
    };

    const handleSave = async () => {
        try {
            // await upsertLaundry({ bookingId, laundry }).unwrap();
            toast.success("Laundry updated successfully");
        } catch {
            toast.error("Failed to update laundry");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <h2 className="text-lg font-semibold">Laundry</h2>

                <div className="flex gap-2">
                    {/* {!isEditing && (
                        <Button variant="heroOutline" onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                    )}
                    <Button variant="heroOutline" onClick={addItem}>
                        + Add Item
                    </Button>
                    {isEditing && (
                        <>
                            <Button variant="heroOutline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={() => setConfirmOpen(true)}
                            // disabled={isLoading}
                            >
                                Save Laundry
                            </Button>
                        </>
                    )} */}
                </div>
            </div>

            {laundry?.length === 0 && (
                <p className="text-sm text-muted-foreground">No laundry items</p>
            )}

            {laundry?.map((l, index) => (
                <div
                    key={index}
                    className="rounded-[5px] border bg-card p-6 space-y-4"
                >
                    <div className="flex justify-between items-center">
                        <p className="font-medium">Laundry Item {index + 1}</p>

                        {isEditing && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => removeItem(index)}
                            >
                                Remove
                            </Button>
                        )}
                    </div>

                    {/* VIEW MODE */}
                    {!isEditing && (
                        <div className="grid sm:grid-cols-5 gap-4 text-sm">
                            <ViewField label="Item" value={l.item_name} />
                            <ViewField label="Type" value={l.laundry_type} />
                            <ViewField label="Count" value={String(l.item_count)} />
                            <ViewField label="Status" value={l.laundry_status} />
                            <ViewField
                                label="Pickup"
                                value={l.pickup_date ? new Date(l.pickup_date).toLocaleString() : "—"}
                            />
                        </div>
                    )}

                    {/* EDIT MODE */}
                    {isEditing && (
                        <div className="grid sm:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <Label>Item Name</Label>
                                <Input
                                    value={l.item_name ?? ""}
                                    onChange={(e) => updateItem(index, { item_name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Type</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={l.laundry_type}
                                    onChange={(e) => updateItem(index, { laundry_type: e.target.value })}
                                >
                                    <option value="GUEST">Guest</option>
                                    <option value="HOTEL">Hotel</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Count</Label>
                                <Input
                                    type="number"
                                    value={l.item_count ?? 1}
                                    onChange={(e) =>
                                        updateItem(index, { item_count: Number(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Status</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={l.laundry_status}
                                    onChange={(e) =>
                                        updateItem(index, { laundry_status: e.target.value })
                                    }
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="PICKED">Picked</option>
                                    <option value="WASHING">Washing</option>
                                    <option value="DELIVERED">Delivered</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Pickup Date</Label>
                                <DatePicker
                                    selected={l.pickup_date ? new Date(l.pickup_date) : new Date()}
                                    onChange={(date: Date) =>
                                        updateItem(index, { pickup_date: date.toISOString() })
                                    }
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to save laundry details?
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            // disabled={isLoading}
                            onClick={async () => {
                                setConfirmOpen(false);
                                await handleSave();
                                setIsEditing(false);
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ViewField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value || "—"}</p>
        </div>
    );
}
