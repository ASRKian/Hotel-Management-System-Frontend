import Sidebar from "@/components/layout/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useGetRoomsQuery, useAddRoomMutation } from "@/redux/services/hmsApi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hook";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";

/* -------------------- Types -------------------- */
type Room = {
    id: string;
    room_type: string;
    room_no: string;
    floor_number: number;
    is_active: boolean;
};

/* -------------------- Props -------------------- */
type Props = {
    rooms: Room[];
};


export default function RoomsByFloor() {
    const [editedRooms, setEditedRooms] = useState<Room[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
    const [roomType, setRoomType] = useState("STANDARD");

    const [addRoom, { isLoading: adding }] = useAddRoomMutation();


    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const location = useLocation()
    const navigate = useNavigate()

    const propertyId = location.state?.propertyId

    const { data: rooms, isLoading: roomsLoading } = useGetRoomsQuery(propertyId, {
        skip: !isLoggedIn || !propertyId
    })

    useEffect(() => {
        if (propertyId) return
        navigate("/properties")
    }, [propertyId])

    useEffect(() => {
        setEditedRooms(rooms?.rooms);
    }, [rooms]);

    const getChangedRooms = () => {
        return editedRooms
            ?.filter((edited) => {
                const original = rooms?.rooms?.find((r) => r.id === edited.id);
                if (!original) return false;

                return (
                    original.room_no !== edited.room_no ||
                    original.room_type !== edited.room_type ||
                    original.is_active !== edited.is_active
                );
            })
            ?.map(({ id, room_no, room_type, is_active }) => ({
                id,
                room_no,
                room_type,
                is_active,
            }));
    };

    const handleBulkUpdate = async () => {
        const payload = getChangedRooms();

        if (payload.length === 0) return;

        // await updateRoomsBulk(payload); 

        toast.success("Rooms updated successfully");
    };

    const roomsByFloor = useMemo(() => {
        if (roomsLoading) return []

        const map: Record<number, Room[]> = {};

        Array.isArray(editedRooms) && editedRooms.forEach((room) => {
            if (!map[room.floor_number]) {
                map[room.floor_number] = [];
            }
            map[room.floor_number].push(room);
        });

        return Object.entries(map)
            .map(([floor, rooms]) => ({
                floor: Number(floor),
                // rooms: rooms.sort((a, b) => a.room_no.localeCompare(b.room_no)),
                rooms
            }))
            .sort((a, b) => a.floor - b.floor);
    }, [editedRooms, rooms]);

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                user={{
                    name: "",
                    email: "user@atithiflow.com",
                }}
            />
            <Sidebar />
            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
                        <p className="text-sm text-muted-foreground">
                            View rooms grouped by floor
                        </p>
                    </div>

                    {/* Floors */}
                    <div className="space-y-10">
                        {roomsByFloor.map(({ floor, rooms }) => (
                            <div key={floor} className="space-y-4">
                                {/* Floor title */}
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Floor {floor}
                                    </h2>
                                    <span className="text-sm text-muted-foreground">
                                        ({rooms.length} rooms)
                                    </span>
                                </div>

                                {/* Rooms grid */}
                                <div
                                    className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
                                >
                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className={cn(
                                                "aspect-square rounded-xl border border-border p-3 flex flex-col justify-between transition",
                                                room.is_active ? "bg-card" : "bg-muted opacity-70"
                                            )}
                                        >
                                            {/* Room Number */}
                                            <input
                                                className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border"
                                                value={room.room_no}
                                                disabled
                                                onChange={(e) =>
                                                    setEditedRooms((prev) =>
                                                        prev.map((r) =>
                                                            r.id === room.id ? { ...r, room_no: e.target.value } : r
                                                        )
                                                    )
                                                }
                                            />

                                            {/* Room Type */}
                                            <select
                                                className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border appearance-none cursor-pointer"
                                                value={room.room_type}
                                                onChange={(e) =>
                                                    setEditedRooms((prev) =>
                                                        prev.map((r) =>
                                                            r.id === room.id
                                                                ? { ...r, room_type: e.target.value }
                                                                : r
                                                        )
                                                    )
                                                }
                                            >
                                                <option value="STANDARD">STANDARD</option>
                                                <option value="DELUXE">DELUXE</option>
                                            </select>


                                            {/* Active Toggle */}
                                            <div className="flex items-center justify-center mt-2">
                                                <Switch
                                                    checked={room.is_active}
                                                    onCheckedChange={(checked) =>
                                                        setEditedRooms((prev) =>
                                                            prev.map((r) =>
                                                                r.id === room.id ? { ...r, is_active: checked } : r
                                                            )
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                    ))}

                                    {/* Add Room Card */}
                                    <div
                                        onClick={() => {
                                            setSelectedFloor(floor);
                                            setRoomType("STANDARD");
                                            setOpen(true);
                                        }}
                                        className="aspect-square rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted transition">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>

                                </div>
                            </div>
                        ))}

                        {roomsByFloor.length === 0 && (
                            <div className="text-center text-muted-foreground py-12">
                                No rooms found
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulk Update Action Bar */}
                <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        {getChangedRooms()?.length > 0
                            ? `${getChangedRooms().length} room(s) modified`
                            : "No changes made"}
                    </span>

                    <Button
                        variant="hero"
                        disabled={getChangedRooms()?.length === 0}
                        onClick={handleBulkUpdate}
                    >
                        Update Rooms
                    </Button>
                </div>


            </main >
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Room</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Do you want to create a new room on{" "}
                            <span className="font-medium text-foreground">
                                Floor {selectedFloor}
                            </span>
                            ?
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Room Type</label>
                            <select
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                value={roomType}
                                onChange={(e) => setRoomType(e.target.value)}
                            >
                                <option value="STANDARD">STANDARD</option>
                                <option value="DELUXE">DELUXE</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={adding}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            disabled={adding}
                            onClick={async () => {
                                if (selectedFloor === null) return;

                                try {
                                    await addRoom({
                                        propertyId,
                                        floorNumber: selectedFloor,
                                        roomType,
                                    }).unwrap();

                                    toast.success("Room added successfully");
                                    setOpen(false);
                                } catch {
                                    toast.error("Failed to add room");
                                }
                            }}
                        >
                            {adding ? "Adding..." : "Add Room"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
