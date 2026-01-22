import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useCreateLaundryPricingMutation, useGetMyPropertiesQuery, useGetPropertyLaundryPricingQuery, useUpdateLaundryPricingMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";

/* ---------------- Types ---------------- */
type LaundryItem = {
    id: string;
    property_id: string;
    item_name: string;
    description?: string | null;
    item_rate: string;
    system_generated: boolean;
};

type EditableLaundry = LaundryItem & {
    _edited?: boolean;
};

type CreateLaundryForm = {
    itemName: string;
    description?: string;
    itemRate: number | "";
};

/* ---------------- Component ---------------- */
export default function LaundryPricingManagement() {
    /* ---------------- State ---------------- */
    const [items, setItems] = useState<EditableLaundry[]>([]);
    const [editMode, setEditMode] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateLaundryForm>({
        itemName: "",
        description: "",
        itemRate: "",
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState("");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createLaundryPrice] = useCreateLaundryPricingMutation()
    const [updateBulkLaundryPricing] = useUpdateLaundryPricingMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (data?.data) {
            setItems(
                data.data.map((i: LaundryItem) => ({
                    ...i,
                    _edited: false,
                }))
            );
        }
    }, [data]);

    /* ---------------- Helpers ---------------- */
    const updateItem = (
        id: string,
        patch: Partial<EditableLaundry>
    ) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === id ? { ...i, ...patch, _edited: true } : i
            )
        );
    };

    const hasUpdates = useMemo(
        () => items.some((i) => i._edited),
        [items]
    );

    function buildCreateLaundryPayload(
        propertyId: number,
        form: CreateLaundryForm
    ) {
        return {
            propertyId,
            itemName: form.itemName,
            description: form.description || null,
            itemRate: Number(form.itemRate),
        };
    }

    function buildLaundryBulkUpdatePayload(
        items: EditableLaundry[]
    ) {
        return {
            updates: items
                .filter((i) => i._edited)
                .map((i) => {
                    const payload: any = {
                        id: Number(i.id),
                        itemRate: Number(i.item_rate),
                    };

                    if (i.description !== undefined) {
                        payload.description = i.description;
                    }

                    if (!i.system_generated) {
                        payload.itemName = i.item_name;
                    }

                    return payload;
                }),
        };
    }

    /* ---------------- Handlers ---------------- */
    const handleBulkUpdate = async () => {
        const payload = buildLaundryBulkUpdatePayload(items);

        if (!payload.updates.length) return;

        try {
            await updateBulkLaundryPricing(payload).unwrap();

            setItems((prev) =>
                prev.map((i) => ({ ...i, _edited: false }))
            );

            setEditMode(false);
        } catch (err) {
            console.error("Bulk update failed", err);
        }
    };

    const handleCreateLaundry = async () => {
        const payload = buildCreateLaundryPayload(
            Number(selectedPropertyId),
            createForm
        );

        try {
            await createLaundryPrice(payload).unwrap();

            setSheetOpen(false);
            setCreateForm({
                itemName: "",
                description: "",
                itemRate: "",
            });
        } catch (err) {
            console.error("Create laundry failed", err);
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                Laundry Pricing
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage laundry items & pricing
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(true)}
                            >
                                Add Item
                            </Button>

                            {!editMode ? (
                                <Button
                                    variant="hero"
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="hero"
                                        disabled={!hasUpdates}
                                        onClick={handleBulkUpdate}
                                    >
                                        Update Prices
                                    </Button>
                                    <Button
                                        variant="hero"
                                        onClick={() => setEditMode(false)}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    {(isSuperAdmin || isOwner) && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

                        <div className="space-y-2">
                            <Label>Properties</Label>

                            <select
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                value={selectedPropertyId}
                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                            >
                                <option value="" disabled>
                                    Select property
                                </option>

                                {!myPropertiesLoading &&
                                    myProperties?.properties?.map((property) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>}
                    {/* Table */}
                    <div className="bg-card border rounded-2xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">
                                        Rate (₹)
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {editMode && !item.system_generated ? (
                                                <Input
                                                    value={item.item_name}
                                                    onChange={(e) =>
                                                        updateItem(item.id, {
                                                            item_name:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            ) : (
                                                item.item_name
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {editMode ? (
                                                <Input
                                                    value={item.description ?? ""}
                                                    onChange={(e) =>
                                                        updateItem(item.id, {
                                                            description:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            ) : (
                                                item.description || "—"
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {editMode ? (
                                                <Input
                                                    type="text"
                                                    className="w-28 ml-auto"
                                                    value={item.item_rate}
                                                    onChange={(e) =>
                                                        updateItem(item.id, {
                                                            item_rate:
                                                                normalizeNumberInput(e.target.value).toString(),
                                                        })
                                                    }
                                                />
                                            ) : (
                                                <span className="font-semibold">
                                                    ₹{item.item_rate}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </main>

            {/* Create Laundry Item Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add Laundry Item</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-6">
                        <div>
                            <Label>Item Name *</Label>
                            <Input
                                value={createForm.itemName}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        itemName: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input
                                value={createForm.description}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div>
                            <Label>Rate (₹)</Label>
                            <Input
                                type="number"
                                value={createForm.itemRate}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        itemRate: Number(e.target.value),
                                    }))
                                }
                            />
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-2">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={handleCreateLaundry}
                            >
                                Create Item
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
