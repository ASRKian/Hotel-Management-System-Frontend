import { useEffect, useState } from "react";
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
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useCreateInventoryMutation, useGetKitchenInventoryQuery, useGetMyPropertiesQuery, useUpdateInventoryMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";

type KitchenItem = {
    id: string;
    property_id: string;
    item_name: string;
    category: string;
    stock_qty: string;
    unit: string;
    reorder_level: number;
    cost_price: string;
    is_active: boolean;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

// CREATE
function buildCreateKitchenItemPayload(data: {
    property_id: number;
    item_name: string;
    category: string;
    stock_qty: number;
    unit: string;
    reorder_level: number;
    cost_price: number;
    is_active: boolean;
}) {
    return {
        property_id: data.property_id,
        item_name: data.item_name,
        category: data.category,
        stock_qty: data.stock_qty,
        unit: data.unit,
        reorder_level: data.reorder_level,
        cost_price: data.cost_price,
        is_active: data.is_active
    };
}

// SINGLE UPDATE
function buildUpdateKitchenItemPayload(data: {
    stock_qty: number;
    cost_price: number;
}) {
    return {
        stock_qty: data.stock_qty,
        cost_price: data.cost_price
    };
}

// BULK UPDATE
function buildBulkUpdatePayload(
    updates: { id: number; stock_qty?: number; is_active?: boolean }[]
) {
    return {
        updates
    };
}


export default function KitchenInventory() {
    const [page, setPage] = useState(1);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [selectedItem, setSelectedItem] = useState<KitchenItem | null>(null);

    const [editForm, setEditForm] = useState({
        id: 0,
        stock_qty: 0,
        cost_price: 0
    });

    const [createForm, setCreateForm] = useState({
        property_id: 5,
        item_name: "",
        category: "",
        stock_qty: 0,
        unit: "",
        reorder_level: 0,
        cost_price: 0,
        is_active: true
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    });

    const { data: kitchenInventory } = useGetKitchenInventoryQuery({ propertyId: selectedPropertyId, page }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createInventory] = useCreateInventoryMutation()
    const [updateInventory] = useUpdateInventoryMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);
    /* ---------------- Handlers ---------------- */

    const openManage = (item: KitchenItem) => {
        setSelectedItem(item);
        setEditForm({
            stock_qty: Number(item.stock_qty),
            cost_price: Number(item.cost_price),
            id: +item.id
        });
        setIsEditing(false);
        setSheetOpen(true);
    };

    const saveEdit = () => {
        const payload = buildUpdateKitchenItemPayload(editForm);
        updateInventory({ id: editForm.id, payload })
        setSheetOpen(false)
    };

    const createItem = () => {
        const payload = buildCreateKitchenItemPayload(createForm);
        const promise = createInventory(payload).unwrap()
        toast.promise(promise, {
            error: "Error creating inventory item",
            pending: "Creating please wait",
            success: "Item created successfully"
        })
        setCreateOpen(false);
    };

    /* ---------------- UI ---------------- */

    return (
        <div className="h-screen bg-background overflow-hidden">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">

                    {/* Header */}
                    <div className="flex justify-between items-center shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold">Kitchen Inventory</h1>
                            <p className="text-sm text-muted-foreground">
                                Stock, costing & procurement management
                            </p>
                        </div>
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
                        <Button variant="hero" onClick={() => setCreateOpen(true)}>
                            + Add Item
                        </Button>
                    </div>

                    {/* Inventory List */}
                    {/* <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                        {kitchenInventory && kitchenInventory?.data.map((item) => {
                            const lowStock = Number(item.stock_qty) <= item.reorder_level;

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-[3px] border bg-card p-4 flex justify-between items-center ${lowStock ? "border-red-300 bg-red-50/40" : ""
                                        }`}
                                >
                                    <div className="space-y-1">
                                        <p className="font-semibold">{item.item_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.category} • {item.stock_qty} {item.unit}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Cost: ₹{item.cost_price} • Reorder: {item.reorder_level}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {lowStock && (
                                            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                                Low Stock
                                            </span>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            onClick={() => openManage(item)}
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div> */}

                    <div className="bg-card rounded-[5px] border border-border shadow-sm overflow-hidden">

                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">Item</th>
                                    <th className="text-left px-4 py-3 font-medium">Category</th>
                                    <th className="text-left px-4 py-3 font-medium">Stock</th>
                                    <th className="text-left px-4 py-3 font-medium">Unit</th>
                                    <th className="text-left px-4 py-3 font-medium">Cost</th>
                                    <th className="text-left px-4 py-3 font-medium">Reorder</th>
                                    {/* <th className="text-left px-4 py-3 font-medium">Status</th> */}
                                    <th className="text-right px-4 py-3 font-medium">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {kitchenInventory?.data?.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No inventory items found
                                        </td>
                                    </tr>
                                )}

                                {kitchenInventory?.data?.map((item) => {
                                    const lowStock = Number(item.stock_qty) <= item.reorder_level;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`border-b border-border hover:bg-muted/30 transition ${lowStock ? "bg-red-50/30" : ""
                                                }`}
                                        >
                                            {/* Item */}
                                            <td className="px-4 py-3 font-medium">
                                                {item.item_name}
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {item.category}
                                            </td>

                                            {/* Stock */}
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`font-medium ${lowStock ? "text-red-600" : "text-foreground"
                                                        }`}
                                                >
                                                    {item.stock_qty}
                                                </span>
                                            </td>

                                            {/* Unit */}
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {item.unit}
                                            </td>

                                            {/* Cost */}
                                            <td className="px-4 py-3">
                                                ₹{item.cost_price}
                                            </td>

                                            {/* Reorder */}
                                            <td className="px-4 py-3">
                                                {item.reorder_level}
                                            </td>

                                            {/* Status */}
                                            {/* <td className="px-4 py-3">
                                                {lowStock ? (
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                                                        Low Stock
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                                                        Normal
                                                    </span>
                                                )}
                                            </td> */}

                                            {/* Action */}
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => openManage(item)}
                                                >
                                                    Manage
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                    </div>


                    {/* Pagination */}
                    <div className="shrink-0 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Page {kitchenInventory?.pagination.page} of {kitchenInventory?.pagination.totalPages}
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
                                disabled={!kitchenInventory || page >= kitchenInventory?.pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                </section>
            </main>

            {/* ================= MANAGE SHEET ================= */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Inventory Item</SheetTitle>
                    </SheetHeader>

                    {selectedItem && (
                        <div className="space-y-6 mt-6">

                            {!isEditing ? (
                                <>
                                    {/* View Mode */}
                                    <div className="space-y-3">
                                        <Info label="Item Name" value={selectedItem.item_name} />
                                        <Info label="Category" value={selectedItem.category} />
                                        <Info label="Stock" value={`${selectedItem.stock_qty} ${selectedItem.unit}`} />
                                        <Info label="Cost Price" value={`₹${selectedItem.cost_price}`} />
                                        <Info label="Reorder Level" value={String(selectedItem.reorder_level)} />
                                        <Info label="Status" value={selectedItem.is_active ? "Active" : "Inactive"} />
                                    </div>

                                    <Button variant="hero" onClick={() => setIsEditing(true)}>
                                        Edit Item
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {/* Edit Mode */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Stock Quantity</Label>
                                            <Input
                                                type="number"
                                                value={editForm.stock_qty}
                                                onChange={(e) =>
                                                    setEditForm(f => ({ ...f, stock_qty: Number(e.target.value) }))
                                                }
                                            />
                                        </div>

                                        <div>
                                            <Label>Cost Price</Label>
                                            <Input
                                                type="number"
                                                value={editForm.cost_price}
                                                onChange={(e) =>
                                                    setEditForm(f => ({ ...f, cost_price: Number(e.target.value) }))
                                                }
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-4">
                                            <Button variant="heroOutline" onClick={() => setIsEditing(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="hero" onClick={saveEdit}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ================= CREATE MODAL ================= */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Inventory Item</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Item Name *</Label>
                            <Input
                                value={createForm.item_name}
                                onChange={(e) =>
                                    setCreateForm(f => ({ ...f, item_name: e.target.value }))
                                }
                            />
                        </div>

                        <div>
                            <Label>Category</Label>
                            <Input
                                value={createForm.category}
                                onChange={(e) =>
                                    setCreateForm(f => ({ ...f, category: e.target.value }))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Stock Qty</Label>
                                <Input
                                    type="number"
                                    value={createForm.stock_qty}
                                    onChange={(e) =>
                                        setCreateForm(f => ({ ...f, stock_qty: Number(e.target.value) }))
                                    }
                                />
                            </div>

                            <div>
                                <Label>Unit</Label>
                                <Input
                                    value={createForm.unit}
                                    onChange={(e) =>
                                        setCreateForm(f => ({ ...f, unit: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Reorder Level</Label>
                                <Input
                                    type="number"
                                    value={createForm.reorder_level}
                                    onChange={(e) =>
                                        setCreateForm(f => ({ ...f, reorder_level: Number(e.target.value) }))
                                    }
                                />
                            </div>

                            <div>
                                <Label>Cost Price</Label>
                                <Input
                                    type="number"
                                    value={createForm.cost_price}
                                    onChange={(e) =>
                                        setCreateForm(f => ({ ...f, cost_price: Number(e.target.value) }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="heroOutline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="hero" onClick={createItem}>
                                Create Item
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

/* ---------------- Small UI Component ---------------- */

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
