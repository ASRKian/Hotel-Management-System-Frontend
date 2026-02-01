import { useEffect, useState } from "react";
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
import {
    useCreateVendorMutation,
    useGetMyPropertiesQuery,
    useGetPropertyVendorsQuery,
    useUpdateVendorMutation,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import {
    selectIsOwner,
    selectIsSuperAdmin,
} from "@/redux/selectors/auth.selectors";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";

/* ---------------- Types ---------------- */
type Vendor = {
    id: string;
    property_id: string;
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active: boolean;
};

type VendorForm = {
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
};

/* ---------------- Component ---------------- */
export default function VendorsManagement() {
    const [page, setPage] = useState(1);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit">("add");
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const [form, setForm] = useState<VendorForm>({
        name: "",
    });

    const isLoggedIn = useAppSelector((s) => s.isLoggedIn.value);
    const isOwner = useAppSelector(selectIsOwner);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

    const { data: myProperties } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn,
    });

    const { data: vendors, isLoading, isUninitialized, } = useGetPropertyVendorsQuery({ propertyId: selectedPropertyId, page }, {
        skip: !isLoggedIn || !selectedPropertyId,
    });

    const [createVendor] = useCreateVendorMutation()
    const [updateVendor] = useUpdateVendorMutation()


    /* ---------------- Effects ---------------- */
    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length) {
            setSelectedPropertyId(String(myProperties.properties[0].id));
        }
    }, [myProperties, selectedPropertyId]);

    /* ---------------- Handlers ---------------- */
    const openAdd = () => {
        setMode("add");
        setEditingVendor(null);
        setForm({ name: "" });
        setSheetOpen(true);
    };

    const openEdit = (vendor: Vendor) => {
        setMode("edit");
        setEditingVendor(vendor);
        setForm({
            name: vendor.name,
            pan_no: vendor.pan_no,
            gst_no: vendor.gst_no,
            address: vendor.address,
            contact_no: vendor.contact_no,
            email_id: vendor.email_id,
            vendor_type: vendor.vendor_type,
        });
        setSheetOpen(true);
    };

    const handleSave = () => {
        const payload =
            mode === "add"
                ? buildVendorPayload(form, Number(selectedPropertyId))
                : buildVendorPayload(form);

        console.log("VENDOR PAYLOAD", payload);
        let promise
        if (mode === "add") {
            promise = createVendor(payload).unwrap()
        } else {
            promise = updateVendor({ payload, vendorId: editingVendor.id }).unwrap()
        }

        toast.promise(promise, {
            error: `Error ${mode === "add" ? "creating" : "updating"} vendor`,
            pending: `${mode === "add" ? "Creating" : "Updating"} vendor...`,
            success: `Vendor ${mode === "add" ? "creating" : "Updating"} successfully`
        })

        setSheetOpen(false);
    };


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

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
                            <h1 className="text-2xl font-bold">Vendors</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage suppliers & vendors
                            </p>
                        </div>

                        {permission?.can_create && <Button variant="hero" onClick={openAdd}>
                            Add Vendor
                        </Button>}
                    </div>

                    {/* Filters */}
                    {(isOwner || isSuperAdmin) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                            <div className="space-y-1">
                                <Label>Property</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSelectedPropertyId(e.target.value);
                                    }}
                                >
                                    <option value="" disabled>
                                        Select property
                                    </option>
                                    {myProperties?.properties?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-card border rounded-[5px] overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {!isLoading &&
                                    !isUninitialized &&
                                    vendors?.data?.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center text-muted-foreground py-6"
                                            >
                                                No vendors found
                                            </TableCell>
                                        </TableRow>
                                    )}

                                {vendors?.data?.map((v: Vendor) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">
                                            {v.name}
                                        </TableCell>
                                        <TableCell>
                                            {v.vendor_type || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {v.contact_no || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {v.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() => openEdit(v)}
                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="flex justify-between px-4 py-3 border-t">
                            <span className="text-sm text-muted-foreground">
                                Page {vendors?.pagination?.page} of{" "}
                                {vendors?.pagination?.totalPages}
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
                                    disabled={
                                        page >=
                                        vendors?.pagination?.totalPages
                                    }
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Add / Edit Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>
                            {mode === "add"
                                ? "Add Vendor"
                                : "Edit Vendor"}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-6">
                        <div>
                            <Label>Name*</Label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    e.target.value.length < 50 &&
                                    setForm({
                                        ...form,
                                        name: normalizeTextInput(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>PAN*</Label>
                                <Input
                                    value={form.pan_no ?? ""}
                                    onChange={(e) =>
                                        e.target.value.length < 20 &&
                                        setForm({
                                            ...form,
                                            pan_no: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>GST*</Label>
                                <Input
                                    value={form.gst_no ?? ""}
                                    onChange={(e) =>
                                        e.target.value.length < 20 &&
                                        setForm({
                                            ...form,
                                            gst_no: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Address*</Label>
                            <Input
                                value={form.address ?? ""}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        address: normalizeTextInput(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Contact No*</Label>
                                <Input
                                    value={form.contact_no ?? ""}
                                    onChange={(e) =>
                                        e.target.value.trim().length <= 10 &&
                                        setForm({
                                            ...form,
                                            contact_no: normalizeTextInput(e.target.value.trim()),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Email*</Label>
                                <Input
                                    value={form.email_id ?? ""}
                                    onChange={(e) =>
                                        e.target.value.length < 150 &&
                                        setForm({
                                            ...form,
                                            email_id: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Vendor Type</Label>
                            <Input
                                value={form.vendor_type ?? ""}
                                onChange={(e) =>
                                    e.target.value.length < 50 &&
                                    setForm({
                                        ...form,
                                        vendor_type: normalizeTextInput(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>
                            {permission?.can_create && <Button variant="hero" onClick={handleSave}>
                                {mode === "add"
                                    ? "Create Vendor"
                                    : "Save Changes"}
                            </Button>}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

/* ---------------- Helpers ---------------- */
function buildVendorPayload(
    form: VendorForm,
    propertyId?: number
) {
    const payload: any = {
        name: form.name,
        pan_no: form.pan_no,
        gst_no: form.gst_no,
        address: form.address,
        contact_no: form.contact_no,
        email_id: form.email_id,
        vendor_type: form.vendor_type,
    };

    if (propertyId) payload.property_id = propertyId;

    return payload;
}












// import { useEffect, useState } from "react";
// import Sidebar from "@/components/layout/Sidebar";
// import AppHeader from "@/components/layout/AppHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import { useGetMyPropertiesQuery, useGetPropertyVendorsQuery } from "@/redux/services/hmsApi";
// import { useAppSelector } from "@/redux/hook";
// import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";

// /* ---------------- Types ---------------- */
// type Vendor = {
//     id: string;
//     property_id: string;
//     name: string;
//     pan_no?: string;
//     gst_no?: string;
//     address?: string;
//     contact_no?: string;
//     email_id?: string;
//     vendor_type?: string;
//     is_active: boolean;
// };

// type VendorForm = {
//     name: string;
//     pan_no?: string;
//     gst_no?: string;
//     address?: string;
//     contact_no?: string;
//     email_id?: string;
//     vendor_type?: string;
// };

// export default function VendorsManagement() {

//     const [page, setPage] = useState(1);
//     const [limit] = useState(10);
//     const [selectedPropertyId, setSelectedPropertyId] = useState("")

//     const [open, setOpen] = useState(false);
//     const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
//     const [form, setForm] = useState<VendorForm>({
//         name: "",
//     });

//     const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
//     const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
//     const isOwner = useAppSelector(selectIsOwner)

//     const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
//         skip: !isLoggedIn
//     })

//     const { data: vendors, isLoading: vendorsLoading, isUninitialized: vendorsUninitialized } = useGetPropertyVendorsQuery(selectedPropertyId, {
//         skip: !isLoggedIn || !selectedPropertyId
//     })

//     /* ---------------- Handlers ---------------- */
//     const openEdit = (vendor: Vendor) => {
//         setEditingVendor(vendor);
//         setForm({
//             name: vendor.name,
//             pan_no: vendor.pan_no,
//             gst_no: vendor.gst_no,
//             address: vendor.address,
//             contact_no: vendor.contact_no,
//             email_id: vendor.email_id,
//             vendor_type: vendor.vendor_type,
//         });
//         setOpen(true);
//     };

//     const handleChange = (key: keyof VendorForm, value: string) => {
//         setForm((prev) => ({ ...prev, [key]: value }));
//     };

//     const handleSave = () => {
//         const payload = buildVendorPayload(form);
//         console.log("UPDATE PAYLOAD", payload);

//         // 🔸 API call later
//         setOpen(false);
//     };

//     useEffect(() => {
//         if (!selectedPropertyId && myProperties?.properties?.length > 0) {
//             setSelectedPropertyId(myProperties.properties[0].id);
//         }
//     }, [myProperties]);
//     /* ---------------- UI ---------------- */
//     return (
//         <div className="h-screen bg-background overflow-hidden">
//             <AppHeader />
//             <Sidebar />

//             <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
//                 <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">
//                     {/* Header */}
//                     <div className="flex items-center justify-between shrink-0">
//                         <div>
//                             <h1 className="text-2xl font-bold">Vendors</h1>
//                             <p className="text-sm text-muted-foreground">
//                                 Manage suppliers & vendors
//                             </p>
//                         </div>
//                         {/* Filters */}
//                         {(isOwner || isSuperAdmin) && (
//                             <div className="space-y-2">
//                                 <Label>Properties</Label>

//                                 <select
//                                     className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
//                                     value={selectedPropertyId}
//                                     onChange={(e) => setSelectedPropertyId(e.target.value)}
//                                 >
//                                     <option value="" disabled>
//                                         Select property
//                                     </option>

//                                     {!myPropertiesLoading &&
//                                         myProperties?.properties?.map((property) => (
//                                             <option key={property.id} value={property.id}>
//                                                 {property.brand_name}
//                                             </option>
//                                         ))}
//                                 </select>
//                             </div>
//                         )}
//                     </div>

//                     {/* Vendor List */}
//                     <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
//                         {!vendorsLoading && !vendorsUninitialized && vendors?.data?.map((vendor) => (
//                             <div
//                                 key={vendor.id}
//                                 className="rounded-[3px] border bg-card p-4 flex items-center justify-between"
//                             >
//                                 <div className="space-y-1">
//                                     <p className="font-semibold">
//                                         {vendor.name}
//                                     </p>
//                                     <p className="text-sm text-muted-foreground">
//                                         {vendor.vendor_type} •{" "}
//                                         {vendor.contact_no}
//                                     </p>
//                                     <p className="text-xs text-muted-foreground">
//                                         {vendor.address}
//                                     </p>
//                                 </div>

//                                 <Button
//                                     size="sm"
//                                     variant="heroOutline"
//                                     onClick={() => openEdit(vendor)}
//                                 >
//                                     Manage
//                                 </Button>
//                             </div>
//                         ))}
//                     </div>

//                     {/* Pagination */}
//                     <div className="flex justify-end gap-2 shrink-0">
//                         <Button
//                             size="sm"
//                             variant="outline"
//                             disabled={page === 1}
//                             onClick={() => setPage((p) => p - 1)}
//                         >
//                             Previous
//                         </Button>
//                         <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => setPage((p) => p + 1)}
//                             disabled={vendorsLoading || vendorsUninitialized || page >= vendors?.pagination?.total}
//                         >
//                             Next
//                         </Button>
//                     </div>
//                 </section>
//             </main>

//             {/* Edit Vendor Modal */}
//             <Dialog open={open} onOpenChange={setOpen}>
//                 <DialogContent className="max-w-lg">
//                     <DialogHeader>
//                         <DialogTitle>Update Vendor</DialogTitle>
//                     </DialogHeader>

//                     <div className="space-y-4">
//                         <div>
//                             <Label>Name *</Label>
//                             <Input
//                                 value={form.name}
//                                 onChange={(e) =>
//                                     handleChange("name", e.target.value)
//                                 }
//                             />
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <Label>PAN</Label>
//                                 <Input
//                                     value={form.pan_no ?? ""}
//                                     onChange={(e) =>
//                                         handleChange(
//                                             "pan_no",
//                                             e.target.value
//                                         )
//                                     }
//                                 />
//                             </div>

//                             <div>
//                                 <Label>GST</Label>
//                                 <Input
//                                     value={form.gst_no ?? ""}
//                                     onChange={(e) =>
//                                         handleChange(
//                                             "gst_no",
//                                             e.target.value
//                                         )
//                                     }
//                                 />
//                             </div>
//                         </div>

//                         <div>
//                             <Label>Address</Label>
//                             <Input
//                                 value={form.address ?? ""}
//                                 onChange={(e) =>
//                                     handleChange(
//                                         "address",
//                                         e.target.value
//                                     )
//                                 }
//                             />
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <Label>Contact No</Label>
//                                 <Input
//                                     value={form.contact_no ?? ""}
//                                     onChange={(e) =>
//                                         handleChange(
//                                             "contact_no",
//                                             e.target.value
//                                         )
//                                     }
//                                 />
//                             </div>

//                             <div>
//                                 <Label>Email</Label>
//                                 <Input
//                                     value={form.email_id ?? ""}
//                                     onChange={(e) =>
//                                         handleChange(
//                                             "email_id",
//                                             e.target.value
//                                         )
//                                     }
//                                 />
//                             </div>
//                         </div>

//                         <div>
//                             <Label>Vendor Type</Label>
//                             <Input
//                                 value={form.vendor_type ?? ""}
//                                 onChange={(e) =>
//                                     handleChange(
//                                         "vendor_type",
//                                         e.target.value
//                                     )
//                                 }
//                             />
//                         </div>

//                         <div className="pt-4">
//                             <Button
//                                 className="w-full"
//                                 variant="hero"
//                                 onClick={handleSave}
//                             >
//                                 Update Vendor
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }

// /* ---------------- Helpers ---------------- */
// function buildVendorPayload(form: VendorForm, propertyId?: number) {
//     const payload: any = {
//         name: form.name,
//         pan_no: form.pan_no,
//         gst_no: form.gst_no,
//         address: form.address,
//         contact_no: form.contact_no,
//         email_id: form.email_id,
//         vendor_type: form.vendor_type,
//     };

//     if (propertyId) {
//         payload.property_id = propertyId;
//     }

//     return payload;
// }
