import Sidebar from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/redux/hook";
import { useCreatePackageMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useUpdatePackageMutation } from "@/redux/services/hmsApi";
import AppHeader from "@/components/layout/AppHeader";
import { toast } from "react-toastify";
import { selectIsAdmin, selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";

/* -------------------- Types -------------------- */
type PackageListItem = {
    id: string;
    package_name: string;
};

type PackageDetail = {
    id?: string;
    property_id?: string;
    package_name: string;
    description: string;
    base_price: string;
    is_active: boolean;
};

/* -------------------- Component -------------------- */
export default function PackageManagement() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit">("add");
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const [selectedPackage, setSelectedPackage] = useState<PackageDetail>({
        package_name: "",
        description: "",
        base_price: "",
        is_active: true,
    });
    const [selectedPackageId, setSelectedPackageId] = useState(0)

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const { data: properties, isLoading: propertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: packages, isLoading: packagesLoading, isUninitialized: packageUninitialized } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: selectedPackageData, isLoading: packageLoading } = useGetPackageByIdQuery({ packageId: selectedPackageId }, {
        skip: !selectedPackageId || !isLoggedIn
    })

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)
    const isAdmin = useAppSelector(selectIsAdmin)

    const [createPackage] = useCreatePackageMutation()
    const [updatePackage] = useUpdatePackageMutation()

    /* -------------------- Handlers -------------------- */
    const handleOpenAdd = () => {
        setMode("add");
        setSelectedPackage({
            package_name: "",
            description: "",
            base_price: "",
            is_active: true,
        });
        setSheetOpen(true);
    };

    const handleOpenEdit = async (pkg: PackageListItem) => {
        setSelectedPackageId(() => +pkg?.id)
        setMode("edit");
        setSheetOpen(true);
    };

    const handleSubmit = () => {
        const payload = {
            propertyId: selectedPropertyId,
            packageName: selectedPackage.package_name,
            description: selectedPackage.description,
            basePrice: selectedPackage.base_price,
            isActive: selectedPackage.is_active
        }
        if (mode === "add") {
            const promise = createPackage(payload).unwrap()

            toast.promise(promise, {
                pending: "Creating package",
                success: "Package created successfully",
                error: "Error creating package"
            })
        } else {
            const promise = updatePackage({ payload, packageId: selectedPackageId }).unwrap()

            toast.promise(promise, {
                pending: "Updating package",
                success: "Package updated successfully",
                error: "Error updating package"
            })
        }

        setSheetOpen(false);
    };

    useEffect(() => {
        if (packageLoading) return
        setSelectedPackage(selectedPackageData?.data)
    }, [selectedPackageData, packageLoading])

    useEffect(() => {
        if (propertiesLoading || !properties || !Array.isArray(properties?.properties)) return
        const propertyId = properties?.properties[0].id
        setSelectedPropertyId(propertyId)
    }, [properties])

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
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Packages
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage room packages and pricing
                            </p>
                        </div>

                        <Button variant="hero" disabled={!(isSuperAdmin || isOwner || isAdmin)} onClick={handleOpenAdd}>
                            Add Package
                        </Button>
                    </div>

                    {/* Property Filter */}
                    <div className="mb-4 max-w-sm space-y-2">
                        <Label>Property</Label>
                        <select
                            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                        >
                            <option value="" disabled>Select Properties</option>

                            {!propertiesLoading &&
                                properties?.properties?.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.brand_name}
                                    </option>
                                ))}
                        </select>

                    </div>


                    {/* Table */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Package Name</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {!packageUninitialized && !packagesLoading && packages?.packages.map((pkg) => (
                                    <TableRow key={pkg.id}>
                                        <TableCell className="font-medium">
                                            {pkg.package_name}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() =>
                                                    handleOpenEdit(pkg)
                                                }
                                            >
                                                {!(isSuperAdmin || isOwner || isAdmin) ? "View" : "Manage"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!packageUninitialized && !packagesLoading && packages?.packages.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center py-6 text-muted-foreground"
                                        >
                                            No packages found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {/* -------------------- Add / Edit Sheet -------------------- */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-xl overflow-y-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader>
                            <SheetTitle>
                                {mode === "add"
                                    ? "Add Package"
                                    : "Edit Package"}
                            </SheetTitle>
                        </SheetHeader>

                        {/* Package Name */}
                        <div className="space-y-2">
                            <Label>Package Name</Label>
                            <Input
                                disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                value={selectedPackage?.package_name}
                                onChange={(e) =>
                                    setSelectedPackage((prev) => ({
                                        ...prev,
                                        package_name: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <textarea
                                disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                className="w-full min-h-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                value={selectedPackage?.description}
                                onChange={(e) =>
                                    setSelectedPackage((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Price */}
                        <div className="space-y-2">
                            <Label>Base Price</Label>
                            <Input
                                disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                type="number"
                                value={selectedPackage?.base_price}
                                onChange={(e) =>
                                    setSelectedPackage((prev) => ({
                                        ...prev,
                                        base_price: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Active */}
                        <div className="flex items-center gap-2">
                            <Switch
                                disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                checked={selectedPackage?.is_active}
                                onCheckedChange={(v) =>
                                    setSelectedPackage((prev) => ({
                                        ...prev,
                                        is_active: v,
                                    }))
                                }
                            />
                            <Label>Active</Label>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button variant="hero" disabled={!(isSuperAdmin || isOwner || isAdmin)} onClick={handleSubmit}>
                                {mode === "add"
                                    ? "Create Package"
                                    : "Save Changes"}
                            </Button>
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
