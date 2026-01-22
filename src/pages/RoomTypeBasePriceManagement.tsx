import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useGetMyPropertiesQuery, useGetRoomTypesQuery, useUpdateRoomTypesMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";

/* ---------------- Types ---------------- */
type RateRow = {
    id: number;
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
    base_price: string;
};

/* ---------------- Component ---------------- */
export default function RoomTypeBasePriceManagement() {

    const [propertyId, setPropertyId] = useState<number | undefined>();

    const [rows, setRows] = useState<RateRow[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: properties, isLoading: propertiesLoading, isUninitialized: propertiesUninitialized } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: roomTypes, isLoading: roomTypesLoading, isUninitialized: roomTypesUninitialized } = useGetRoomTypesQuery({ propertyId }, {
        skip: !isLoggedIn || !propertyId
    })

    /* ---------- Init ---------- */
    useEffect(() => {
        if (roomTypesLoading || roomTypesUninitialized) return
        const rows = JSON.parse(JSON.stringify(roomTypes)).map(row => {
            const { base_price, ...rest } = row
            return {
                ...rest,
                base_price: base_price == 0.00 ? "" : base_price
            }
        })
        setRows(JSON.parse(JSON.stringify(roomTypes)));
    }, [roomTypes]);

    useEffect(() => {
        if (!propertyId && properties?.properties?.length > 0) {
            setPropertyId(properties.properties[0].id);
        }
    }, [properties]);

    const [updateRoomTypes] = useUpdateRoomTypesMutation()

    /* ---------- Update Price ---------- */
    const updatePrice = (index: number, value: string) => {
        setRows((prev) =>
            prev.map((r, i) =>
                i === index ? { ...r, base_price: value } : r
            )
        );
    };

    /* ---------- Detect Changes ---------- */
    const updatedRates = useMemo(() => {
        return rows
            .filter((r, i) => r.base_price !== roomTypes[i]?.base_price)
            .map((r) => ({
                id: r.id,
                base_price: Number(r.base_price),
            }));
    }, [rows, roomTypes]);

    /* ---------- Payload ---------- */
    const payload = useMemo(
        () => ({
            property_id: propertyId,
            rates: updatedRates,
        }),
        [updatedRates, propertyId]
    );

    const updateRoomRates = () => {
        const promise = updateRoomTypes({ payload }).unwrap()
        toast.promise(promise, {
            pending: "Updating rates please wait...",
            success: "Rates update successfully",
            error: "Error updating rates"
        })
        setConfirmOpen(false);
        setEditMode(false);
    }

    /* ---------- UI ---------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                Room Category Base Prices
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage base pricing per room configuration
                            </p>
                        </div>

                        {!editMode ? (
                            <Button
                                variant="hero"
                                onClick={() => setEditMode(true)}
                            >
                                Edit Prices
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    variant="heroOutline"
                                    onClick={() => {
                                        setRows(
                                            JSON.parse(JSON.stringify(roomTypes))
                                        );
                                        setEditMode(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="hero"
                                    disabled={updatedRates.length === 0}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    Update
                                </Button>
                            </div>
                        )}
                    </div>

                    {(isSuperAdmin || isOwner) && <div className="mb-4 max-w-sm space-y-2">
                        <Label>Property</Label>
                        <select
                            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                            value={propertyId}
                            onChange={(e) => setPropertyId(+e.target.value)}
                        >
                            <option value="" disabled>Select Properties</option>

                            {!propertiesLoading &&
                                properties?.properties?.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.brand_name}
                                    </option>
                                ))}
                        </select>

                    </div>}

                    {/* Table */}
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b text-sm font-medium text-muted-foreground">
                            <span>Room Category</span>
                            <span>AC Type</span>
                            <span>Bed Type</span>
                            <span>Base Price (₹)</span>
                        </div>

                        {rows.map((r, index) => (
                            <div
                                key={r.id}
                                className="grid grid-cols-4 gap-4 px-6 py-4 border-b items-center"
                            >
                                <span>{r.room_category_name}</span>
                                <span>{r.ac_type_name}</span>
                                <span>{r.bed_type_name}</span>
                                {!editMode ? <span>{r.base_price || 0}</span>
                                    :
                                    <Input
                                        type="number"
                                        min={0}
                                        // disabled={!editMode}
                                        value={r.base_price || 0}
                                        onChange={(e) =>
                                            updatePrice(index, normalizeNumberInput(e.target.value).toString())
                                        }
                                    />}
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Confirm Update */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Price Update</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-sm">
                        <p>
                            You are about to update{" "}
                            <strong>{updatedRates.length}</strong> room
                            configuration(s).
                        </p>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={() => setConfirmOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={updateRoomRates}
                            >
                                Confirm Update
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
