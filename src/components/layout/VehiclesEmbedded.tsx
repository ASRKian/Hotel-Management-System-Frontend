import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    useGetVehiclesByBookingQuery,
    useAddVehiclesMutation,
} from "@/redux/services/hmsApi";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";

/* ---------------- Types ---------------- */
type VehicleForm = {
    id?: number;
    vehicle_type?: "CAR" | "BIKE" | "OTHER";
    vehicle_name?: string;
    vehicle_number?: string;
    room_no?: string;
    is_active?: boolean;
};

type Props = {
    bookingId: string;
    rooms: {
        room_id: number
        room_no: string
        room_status: string
    }[]
};

/* ---------------- Component ---------------- */
export default function VehiclesEmbedded({ bookingId, rooms }: Props) {
    const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);


    const { data } = useGetVehiclesByBookingQuery(
        { bookingId },
        { skip: !bookingId }
    );

    const [upsertVehicles, { isLoading }] =
        useAddVehiclesMutation();

    useEffect(() => {
        if (!data?.vehicles) return;
        setVehicles(data.vehicles);
    }, [data]);

    const addVehicle = () => {
        setIsEditing(true)
        setVehicles((v) => [
            ...v,
            {
                vehicle_type: "CAR",
                vehicle_name: "",
                vehicle_number: "",
                room_no: "",
                is_active: true,
            },
        ]);
    };

    const removeVehicle = (index: number) => {
        setVehicles((v) => v.filter((_, i) => i !== index));
    };

    const updateVehicle = (
        index: number,
        patch: Partial<VehicleForm>
    ) => {
        setVehicles((prev) =>
            prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
        );
    };

    const handleSave = async () => {
        try {
            await upsertVehicles({ bookingId, vehicles }).unwrap();
            toast.success("Vehicles updated successfully");
        } catch {
            toast.error("Failed to update vehicles");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <h2 className="text-lg font-semibold">Vehicles</h2>

                <div className="flex gap-2">
                    {!isEditing &&
                        <Button
                            variant="heroOutline"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </Button>}
                    <Button
                        variant="heroOutline"
                        onClick={addVehicle}
                    >
                        + Add Vehicle
                    </Button>
                    {isEditing &&
                        <>
                            <Button
                                variant="heroOutline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={() => setConfirmOpen(true)}
                                disabled={isLoading}
                            >
                                Save Vehicles
                            </Button>
                        </>
                    }
                </div>
            </div >

            {
                vehicles.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No vehicles added
                    </p>
                )
            }

            {vehicles.map((v, index) => (
                <div
                    key={index}
                    className="rounded-[5px] border bg-card p-6 space-y-4"
                >
                    <div className="flex justify-between items-center">
                        <p className="font-medium">Vehicle {index + 1}</p>

                        {isEditing && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => removeVehicle(index)}
                            >
                                Remove
                            </Button>
                        )}
                    </div>

                    {/* ===== VIEW MODE ===== */}
                    {!isEditing && (
                        <div className="grid sm:grid-cols-4 gap-4 text-sm">
                            <ViewField label="Vehicle Type" value={v.vehicle_type} />
                            <ViewField label="Vehicle Name" value={v.vehicle_name} />
                            <ViewField label="Vehicle Number" value={v.vehicle_number} />
                            <ViewField label="Room No" value={v.room_no} />
                        </div>
                    )}

                    {/* ===== EDIT MODE ===== */}
                    {isEditing && (
                        <div className="grid sm:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label>Vehicle Type</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={v.vehicle_type}
                                    onChange={(e) =>
                                        updateVehicle(index, {
                                            vehicle_type: e.target.value as any,
                                        })
                                    }
                                >
                                    <option value="CAR">Car</option>
                                    <option value="BIKE">Bike</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Vehicle Name</Label>
                                <Input
                                    value={v.vehicle_name ?? ""}
                                    onChange={(e) =>
                                        updateVehicle(index, {
                                            vehicle_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Vehicle Number</Label>
                                <Input
                                    value={v.vehicle_number ?? ""}
                                    onChange={(e) =>
                                        updateVehicle(index, {
                                            vehicle_number: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Room No</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={v.room_no ?? ""}
                                    onChange={(e) =>
                                        updateVehicle(index, {
                                            room_no: normalizeTextInput(e.target.value),
                                        })
                                    }
                                >
                                    <option value="" disabled>
                                        Select Room Number
                                    </option>
                                    {rooms?.map((room) => (
                                        <option key={room.room_id} value={room.room_no}>
                                            {room.room_no}
                                        </option>
                                    ))}
                                </select>
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
                        Are you sure you want to save vehicle details?
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            disabled={isLoading}
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

        </div >
    );
}

function ViewField({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">
                {value || "—"}
            </p>
        </div>
    );
}
