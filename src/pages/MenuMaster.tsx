import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCreateMenuItemMutation, useGetMyPropertiesQuery, useGetPropertyMenuQuery, useUpdateMenuItemMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";

type MenuItem = {
    id: string;
    property_id: string;
    item_name: string;
    category: string;
    price: string;
    is_active: boolean;
    is_veg: boolean;
    description?: string | null;
    image?: string | null;      // raw binary from API
    prep_time?: number | null;
};

type MenuForm = {
    item_name: string;
    category: string;
    price: string;
    is_active: boolean;
    is_veg: boolean;
    prep_time?: number | "";
    image?: File | null;
};


function buildCreateMenuPayload(
    form: MenuForm,
    propertyId: number
) {
    const fd = new FormData();

    fd.append("propertyId", String(propertyId));
    fd.append("itemName", form.item_name);
    fd.append("category", form.category);
    fd.append("price", form.price);
    fd.append("isActive", String(form.is_active));
    fd.append("isVeg", String(form.is_veg));

    if (form.prep_time !== "") {
        fd.append("prepTime", String(form.prep_time));
    }

    if (form.image) {
        fd.append("image", form.image);
    }

    return fd;
}

function buildUpdateMenuPayload(
    form: Partial<MenuForm>
) {
    const fd = new FormData();

    if (form.item_name) fd.append("itemName", form.item_name);
    if (form.category) fd.append("category", form.category);
    if (form.price) fd.append("price", form.price);

    if (form.prep_time !== undefined && form.prep_time !== "") {
        fd.append("prepTime", String(form.prep_time));
    }

    if (form.is_active !== undefined) {
        fd.append("isActive", String(form.is_active));
    }

    if (form.is_veg !== undefined) {
        fd.append("isVeg", String(form.is_veg));
    }

    if (form.image) {
        fd.append("image", form.image);
    }

    return fd;
}

export default function MenuMaster() {
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [selected, setSelected] = useState<MenuItem | null>(null);

    const [form, setForm] = useState<MenuForm>({
        item_name: "",
        category: "",
        price: "",
        is_active: true,
        is_veg: true,
        prep_time: "",
        image: null,
    });

    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetPropertyMenuQuery({ page, propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createMenuItem] = useCreateMenuItemMutation()
    const [updateMenuItem] = useUpdateMenuItemMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (!form.image) return;

        const previewUrl = URL.createObjectURL(form.image);
        return () => URL.revokeObjectURL(previewUrl);
    }, [form.image]);

    const openView = (item: MenuItem) => {
        setSelected(item);
        setMode("view");
    };

    const openEdit = (item: MenuItem) => {
        setSelected(item);
        setForm({
            item_name: item.item_name,
            category: item.category,
            price: item.price,
            is_active: item.is_active,
            is_veg: item.is_veg,
            prep_time: item.prep_time ?? "",
            image: null,
        });
        setMode("edit");
    };

    async function handleForm() {
        if (!selectedPropertyId) return;

        try {
            if (mode === "add") {
                const payload = buildCreateMenuPayload(
                    form,
                    selectedPropertyId
                );

                await createMenuItem(payload).unwrap();
            }

            if (mode === "edit" && selected) {
                const payload = buildUpdateMenuPayload(form);

                await updateMenuItem({
                    id: selected.id,
                    payload,
                }).unwrap();
            }

            setMode(null);
            setSelected(null);
            setPage(1); // refresh list
        } catch (err) {
            console.error("Menu save failed", err);
        }
    }

    return (
        <div className="h-screen bg-background overflow-hidden">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">

                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left: Title */}
                        <div className="shrink-0">
                            <h1 className="text-2xl font-bold">Menu Master</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage restaurant menu items
                            </p>
                        </div>

                        {/* Right: Property Dropdown */}
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
                        <Button
                            variant="hero"
                            onClick={() => {
                                setForm({
                                    item_name: "",
                                    category: "",
                                    price: "",
                                    is_active: true,
                                    is_veg: true,
                                    prep_time: "",
                                    image: null,
                                });
                                setMode("add");
                            }}
                        >
                            Add Menu Item
                        </Button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                        {data && data?.data.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-[3px] border bg-card p-4 flex justify-between"
                            >
                                <div className="flex gap-4 items-center">
                                    {/* IMAGE */}
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/menu/${item.id}/image`}
                                        alt={item.item_name}
                                        className="h-16 w-16 rounded-lg object-cover border"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                "https://placehold.co/64x64?text=No+Image";
                                        }}
                                    />

                                    {/* TEXT */}
                                    <div className="space-y-1">
                                        <p className="font-semibold">{item.item_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.category} • ₹{item.price}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.is_veg ? "Veg" : "Non-Veg"} • {item.prep_time} min
                                        </p>
                                    </div>
                                </div>


                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        onClick={() => openView(item)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        onClick={() => openEdit(item)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="shrink-0 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Page {data?.pagination.page} of {data?.pagination.totalPages}
                        </span>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="heroOutline"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="heroOutline"
                                disabled={!data || page >= data?.pagination.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* VIEW / EDIT / ADD */}
            <Dialog open={!!mode} onOpenChange={() => setMode(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "view"
                                ? "View Menu Item"
                                : mode === "edit"
                                    ? "Edit Menu Item"
                                    : "Add Menu Item"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* VIEW MODE */}
                    {mode === "view" && selected && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">

                            {/* LEFT: DETAILS */}
                            <div className="space-y-3">
                                <div>
                                    <Label>Name</Label>
                                    <p className="font-medium">{selected.item_name}</p>
                                </div>

                                <div>
                                    <Label>Category</Label>
                                    <p>{selected.category}</p>
                                </div>

                                <div>
                                    <Label>Price</Label>
                                    <p>₹{selected.price}</p>
                                </div>

                                <div>
                                    <Label>Type</Label>
                                    <p>{selected.is_veg ? "Veg" : "Non-Veg"}</p>
                                </div>

                                <div>
                                    <Label>Preparation Time</Label>
                                    <p>{selected.prep_time} minutes</p>
                                </div>
                            </div>

                            {/* RIGHT: IMAGE */}
                            <div className="flex justify-center items-start">
                                <img
                                    src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                    alt={selected.item_name}
                                    className="h-48 w-48 rounded-[3px] object-cover border"
                                    onError={(e) => {
                                        e.currentTarget.src =
                                            "https://placehold.co/200x200?text=No+Image";
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* EDIT / ADD MODE */}
                    {(mode === "edit" || mode === "add") && (
                        <div className="space-y-4">

                            {/* FORM GRID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Item Name</Label>
                                    <Input
                                        value={form.item_name}
                                        onChange={(e) =>
                                            setForm({ ...form, item_name: e.target.value })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Category</Label>
                                    <Input
                                        value={form.category}
                                        onChange={(e) =>
                                            setForm({ ...form, category: e.target.value })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Price</Label>
                                    <Input
                                        type="text"
                                        value={form.price}
                                        onChange={(e) =>
                                            setForm({ ...form, price: normalizeNumberInput(e.target.value).toString() })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Prep Time (min)</Label>
                                    <Input
                                        type="text"
                                        value={form.prep_time}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                prep_time: normalizeNumberInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* SWITCHES */}
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(v) =>
                                            setForm({ ...form, is_active: v })
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.is_veg}
                                        onCheckedChange={(v) =>
                                            setForm({ ...form, is_veg: v })
                                        }
                                    />
                                    <Label>Veg</Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                                {/* LEFT: IMAGE INPUT */}
                                <div className="space-y-2">
                                    <Label>Image</Label>

                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                image: e.target.files?.[0] ?? null,
                                            })
                                        }
                                    />
                                </div>

                                {/* RIGHT: IMAGE PREVIEW */}
                                <div className="flex justify-center">
                                    {/* Existing image (edit mode, no new image selected) */}
                                    {mode === "edit" && selected && !form.image && (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                            alt="Current"
                                            className="h-40 w-40 rounded-[3px] object-cover border"
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    "https://placehold.co/160x160?text=No+Image";
                                            }}
                                        />
                                    )}

                                    {/* New image preview */}
                                    {form.image && (
                                        <img
                                            src={URL.createObjectURL(form.image)}
                                            alt="Preview"
                                            className="h-40 w-40 rounded-[3px] object-cover border"
                                        />
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="hero"
                                className="w-full"
                                onClick={handleForm}
                            >
                                {mode === "add" ? "Create Item" : "Save Changes"}
                            </Button>
                        </div>

                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
