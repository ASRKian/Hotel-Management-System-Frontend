import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
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
import { Image as ImageIcon, User } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAddStaffMutation, useCreateUserMutation, useGetAllRolesQuery, useGetMyPropertiesQuery, useGetStaffByPropertyQuery, useLazyGetStaffByIdQuery, useUpdateStaffMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/hook";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import AppHeader from "@/components/layout/AppHeader";
import { validateStaff } from "@/utils/validators";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import DatePicker from "react-datepicker";
import countries from '../utils/countries.json'

/* -------------------- Types -------------------- */
type Staff = {
    id?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    phone1: string;
    phone2?: string;
    designation: string;
    department: string;
    status: "active" | "inactive";
    image?: File | null;
    id_proof?: File | null;
};

const STAFF_INITIAL_VALUE = {
    first_name: "",
    middle_name: "",
    last_name: "",
    password: "",
    role_ids: [],
    address: "",
    gender: "",
    marital_status: "",
    employment_type: "",
    email: "",
    phone1: "",
    phone2: "",
    emergency_contact: "",
    emergency_contact_name: "",
    emergency_contact_2: "",
    emergency_contact_name_2: "",
    emergency_contact_relation: "",
    emergency_contact_relation_2: "",
    designation: "",
    department: "",
    hire_date: "",
    dob: "",
    leave_days: "",
    shift_pattern: "",
    status: "active",
    blood_group: "",
    id_proof_type: "Aadhaar",
    id_number: "",
    image: null,
    id_proof: null,
    user_id: "",
    property_id: "",
    // visa fields (for foreigner)
    visa_number: "",
    visa_issue_date: "",
    visa_expiry_date: "",

    // for ID proof type "Other"
    other_id_proof: "",
    nationality: "",
    country: ""
}

export default function StaffManagement() {
    const [sheetOpen, setSheetOpen] = useState(false);

    const [mode, setMode] = useState<"add" | "edit">("add");

    const [page, setPage] = useState(1);
    const limit = 10;

    const [search, setSearch] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState("");

    const [statusFilter, setStatusFilter] = useState("");

    const [staff, setStaff] = useState<any>(STAFF_INITIAL_VALUE);
    const [idProofMode, setIdProofMode] = useState<"select" | "other">("select");
    const [staffImageExists, setStaffImageExists] = useState(false);
    const [staffIdProofExists, setStaffIdProofExists] = useState<boolean | null>(null);

    const debouncedSearch = useDebounce(search, 500);
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: staffData, isLoading } = useGetStaffByPropertyQuery({
        property_id: selectedPropertyId,
        page,
        limit,
        search: debouncedSearch,
        department: "",
        status: statusFilter,
    }, {
        skip: !selectedPropertyId
    });

    const [createStaff, { isLoading: creating }] = useAddStaffMutation();
    const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
    const [getStaffById] = useLazyGetStaffByIdQuery();
    const { data: roles } = useGetAllRolesQuery(undefined, {
        skip: !isLoggedIn
    })

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        if (sheetOpen) return
        setStaff(STAFF_INITIAL_VALUE)
    }, [sheetOpen])

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (mode === "edit" && staff.id) {
            const img = new Image();
            img.src = `${import.meta.env.VITE_API_URL}/staff/${staff.id}/image`;

            img.onload = () => setStaffImageExists(true);
            img.onerror = () => setStaffImageExists(false);
        } else {
            setStaffImageExists(false);
        }
    }, [mode, staff.id]);

    useEffect(() => {
        if (mode === "edit" && staff.id) {
            const img = new Image();
            img.src = `${import.meta.env.VITE_API_URL}/staff/${staff.id}/id-proof`;

            img.onload = () => setStaffIdProofExists(true);
            img.onerror = () => setStaffIdProofExists(false);
        } else {
            setStaffIdProofExists(false);
        }
    }, [mode, staff.id]);

    const downloadImage = async (url: string, filename = "staff-image.jpg") => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Image download failed", err);
            toast.error("Failed to download image");
        }
    };

    const handleSubmit = async () => {
        try {
            const error = validateStaff(staff, mode, isSuperAdmin, roles?.roles);

            if (error) {
                toast.error(error, {
                    position: "top-right",
                    autoClose: 4000,
                    theme: "light",
                });
                return;
            }

            if (mode === "add" && staff.role_ids.length === 0) {
                toast.error("Please select a role")
                return
            }

            const fd = new FormData()

            Object.entries(staff).forEach(([key, value]: any) => {
                if (
                    value === null ||
                    value === "" ||
                    key === "id" ||
                    key === "image" ||
                    key === "id_proof" ||
                    key === "roles"
                ) {
                    return
                }

                if (Array.isArray(value)) {
                    value.forEach((v) => fd.append(`${key}[]`, v))
                } else {
                    fd.append(key, value)
                }
            })

            if (staff.image instanceof File) {
                fd.append("image", staff.image)
                fd.append("image_mime", staff.image.type)
            }

            if (staff.id_proof instanceof File) {
                fd.append("id_proof", staff.id_proof)
                fd.append("id_proof_mime", staff.id_proof.type)
            }

            const promise =
                mode === "add"
                    ? createStaff(fd).unwrap()
                    : updateStaff({ id: staff.id, payload: fd }).unwrap()

            await toast.promise(promise, {
                pending:
                    mode === "add"
                        ? "Creating user & staff..."
                        : "Updating staff...",
                success:
                    mode === "add"
                        ? "Staff created successfully"
                        : "Staff updated successfully",
                error: "Something went wrong",
            })

            setSheetOpen(false)
        } catch (err) {
            console.error("Staff submit failed", err)
        }
    }

    const excludedRoles = isSuperAdmin ? ["SUPER_ADMIN"]
        : isOwner
            ? ["SUPER_ADMIN", "OWNER"]
            : ["SUPER_ADMIN", "OWNER", "ADMIN"];

    const toDateInput = (value?: string) =>
        value ? value.split("T")[0] : "";

    const parseDate = (value?: string) =>
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;   // local timezone safe
    };


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
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Staff</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage property staff and their details.
                            </p>
                        </div>

                        <Button
                            variant="hero"
                            onClick={() => {
                                setMode("add");
                                setSheetOpen(true);
                            }}
                        >
                            Add Staff
                        </Button>
                    </div>

                    {/* Staff Table */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        {/* Search */}
                        <div className="space-y-2">
                            <Label>Search</Label>
                            <Input
                                placeholder="Search staff name, email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Properties Filter */}
                        <div className="space-y-2">
                            <Label>Properties</Label>

                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
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

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-card rounded-[5px] border border-border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {!isLoading && staffData?.data?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                            No staff added yet
                                        </TableCell>
                                    </TableRow>
                                )}

                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                            Loading staff…
                                        </TableCell>
                                    </TableRow>
                                )}

                                {staffData?.data?.map((s: Staff, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                            {s.first_name} {s.last_name}
                                        </TableCell>
                                        <TableCell>{s.email}</TableCell>
                                        <TableCell>{s.designation}</TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {s.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={async () => {
                                                    try {
                                                        setMode("edit");
                                                        setSheetOpen(true);

                                                        const data = await getStaffById(s.id!).unwrap();
                                                        const fullStaff = data?.data
                                                        setStaff({
                                                            ...STAFF_INITIAL_VALUE,
                                                            ...fullStaff,

                                                            role_ids: fullStaff.roles?.length
                                                                ? [String(fullStaff.roles[0].id)]
                                                                : [],

                                                            hire_date: toDateInput(fullStaff.hire_date),
                                                            dob: toDateInput(fullStaff.dob),

                                                            image: null,
                                                            id_proof: null,
                                                        });

                                                    } catch (err) {
                                                        console.error("Failed to load staff", err);
                                                    }
                                                }}

                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {(
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                                <span className="text-muted-foreground">
                                    Page {staffData?.pagination?.page} of {staffData?.pagination?.totalPages}
                                </span>


                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={!staffData?.pagination?.page || staffData?.pagination?.page == 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={!staffData || staffData?.pagination?.page >= staffData?.pagination?.totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </section>
            </main>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader>
                            <SheetTitle>
                                {mode === "add" ? "Add Staff" : "Edit Staff"}
                            </SheetTitle>
                        </SheetHeader>

                        {/* Image */}
                        <div className="space-y-2">
                            <Label>Staff Photo</Label>

                            <div className="relative h-40 rounded-[3px] border border-border overflow-hidden bg-muted">

                                {/* EDIT MODE */}
                                {mode === "edit" && staff.id ? (
                                    <>
                                        {/* Show image ONLY if confirmed */}
                                        {staffImageExists === true && (
                                            <img
                                                src={`${import.meta.env.VITE_API_URL}/staff/${staff.id}/image`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}

                                        {/* Placeholder when not exists or loading */}
                                        {(staffImageExists === false || staffImageExists === null) && (
                                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                                <User className="h-6 w-6" />
                                            </div>
                                        )}

                                        {/* Download button ONLY if image exists */}
                                        {staffImageExists === true && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        downloadImage(
                                                            `${import.meta.env.VITE_API_URL}/staff/${staff.id}/image`,
                                                            `staff-${staff.first_name}-${staff.id}.jpg`
                                                        )
                                                    }
                                                >
                                                    Download
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* ADD MODE */
                                    staff.image ? (
                                        <img
                                            src={URL.createObjectURL(staff.image)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground">
                                            <User className="h-6 w-6" />
                                        </div>
                                    )
                                )}

                                {/* Upload overlay */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) =>
                                        setStaff({ ...staff, image: e.target.files?.[0] })
                                    }
                                />
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>First Name*</Label>
                                <Input
                                    value={staff.first_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, first_name: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Middle Name</Label>
                                <Input
                                    value={staff.middle_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, middle_name: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Last Name*</Label>
                                <Input
                                    value={staff.last_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, last_name: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Email*</Label>
                                <Input
                                    value={staff.email}
                                    onChange={(e) =>
                                        setStaff({ ...staff, email: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone*</Label>
                                <Input
                                    value={staff.phone1}
                                    onChange={(e) =>
                                        setStaff({ ...staff, phone1: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{mode === "add" ? "Password*" : "Password"}</Label>
                                <Input
                                    type="password"
                                    value={staff.password}
                                    onChange={(e) =>
                                        setStaff({ ...staff, password: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Emergency Contact*</Label>
                                <Input
                                    value={staff.emergency_contact}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Name*</Label>
                                <Input
                                    value={staff.emergency_contact_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact_name: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Contact Relation*</Label>
                                <Input
                                    value={staff.emergency_contact_relation}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact_relation: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Emergency Contact</Label>
                                <Input
                                    value={staff.emergency_contact_2}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact_2: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Name</Label>
                                <Input
                                    value={staff.emergency_contact_name_2}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact_name_2: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Contact Relation</Label>
                                <Input
                                    value={staff.emergency_contact_relation_2}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact_relation_2: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Alternate Phone</Label>
                                <Input
                                    value={staff.phone2}
                                    onChange={(e) =>
                                        setStaff({ ...staff, phone2: normalizeTextInput(e.target.value).slice(0, 10) })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isSuperAdmin ? "Property" : "Property*"}</Label>

                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={mode === "add" ? staff.property_id : selectedPropertyId}
                                    onChange={(e) =>
                                        setStaff({ ...staff, property_id: normalizeTextInput(e.target.value) })
                                    }
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

                            <div className="space-y-2">
                                <Label>Nationality *</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={staff.nationality || ""}
                                    onChange={(e) =>
                                        setStaff({ ...staff, nationality: normalizeTextInput(e.target.value) })
                                    }
                                >
                                    <option value="">Select nationality</option>
                                    <option value="indian">Indian</option>
                                    <option value="non_res_indian">Non Resident Indian</option>
                                    <option value="foreigner">Foreigner</option>
                                </select>
                            </div>

                            {staff.nationality === "foreigner" && (
                                <div className="space-y-2">
                                    <Label>Country *</Label>
                                    <select
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={staff.country || ""}
                                        onChange={(e) =>
                                            setStaff({ ...staff, country: normalizeTextInput(e.target.value) })
                                        }
                                    >
                                        {
                                            countries.map((country, i) => {
                                                return <option value={country} key={i}>{country}</option>
                                            })
                                        }

                                    </select>
                                </div>
                            )}


                            {/* </div> */}

                            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> */}
                            <div className="space-y-2">
                                <Label>Gender*</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={staff.gender}
                                    onChange={(e) => setStaff({ ...staff, gender: normalizeTextInput(e.target.value) })}
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Marital Status*</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={staff.marital_status}
                                    onChange={(e) =>
                                        setStaff({ ...staff, marital_status: normalizeTextInput(e.target.value) })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Blood Group*</Label>
                                <Input
                                    value={staff.blood_group}
                                    onChange={(e) =>
                                        setStaff({ ...staff, blood_group: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>
                            {/* </div> */}

                            {/* ID Proof */}
                            {/* <div className="space-y-2">
                            <Label>ID Proof</Label> */}

                            {/* <div className="rounded-[3px] border border-border p-3 space-y-3"> */}
                            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> */}
                            <div className="space-y-2">
                                <Label>ID Proof Type*</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={idProofMode === "other" ? "Other" : staff.id_proof_type}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        if (value === "Other") {
                                            setIdProofMode("other");
                                            setStaff({ ...staff, id_proof_type: "" });
                                        } else {
                                            setIdProofMode("select");
                                            setStaff({ ...staff, id_proof_type: normalizeTextInput(value) });
                                        }
                                    }}
                                >
                                    <option value="Aadhaar">Aadhaar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driving License">Driving License</option>
                                    <option value="Voter ID">Voter ID</option>
                                    <option value="Apaar ID">Apaar ID</option>
                                    <option value="Passport ID">Passport ID</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {idProofMode === "other" && (
                                <div className="space-y-2">
                                    <Label>Specify ID Proof *</Label>
                                    <Input
                                        placeholder="Enter ID proof type"
                                        value={staff.id_proof_type}
                                        onChange={(e) =>
                                            setStaff({
                                                ...staff,
                                                id_proof_type: normalizeTextInput(e.target.value)
                                            })
                                        }
                                    />
                                </div>
                            )}


                            <div className="space-y-2">
                                <Label>ID Number*</Label>
                                <Input
                                    value={staff.id_number}
                                    onChange={(e) =>
                                        setStaff({ ...staff, id_number: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>
                            {/* </div> */}

                            {staff.nationality === "foreigner" && (
                                // <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <>
                                    <div className="space-y-2">
                                        <Label>Visa Number *</Label>
                                        <Input
                                            value={staff.visa_number}
                                            onChange={(e) =>
                                                setStaff({ ...staff, visa_number: normalizeTextInput(e.target.value) })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Visa Issue Date *</Label>
                                        <DatePicker
                                            selected={parseDate(staff.visa_issue_date)}
                                            onChange={(date) =>
                                                setStaff({ ...staff, visa_issue_date: formatDate(date) })
                                            }
                                            dateFormat="dd-MM-yyyy"
                                            customInput={<Input readOnly />}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Visa Expiry Date *</Label>
                                        <DatePicker
                                            selected={parseDate(staff.visa_expiry_date)}
                                            onChange={(date) =>
                                                setStaff({ ...staff, visa_expiry_date: formatDate(date) })
                                            }
                                            dateFormat="dd-MM-yyyy"
                                            customInput={<Input readOnly />}
                                        />
                                    </div>
                                </>

                            )}
                        </div>

                        {/* ID Proof Preview */}
                        {mode === "edit" && staff.id ? (
                            staffIdProofExists === true ? (
                                <div className="space-y-2">
                                    <Label>ID Proof</Label>

                                    <div className="relative h-48 rounded-[3px] border border-border overflow-hidden bg-muted">
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/staff/${staff.id}/id-proof`}
                                            className="w-full h-full object-contain bg-black/5"
                                        />

                                        {/* Download Button */}
                                        <div className="absolute top-2 right-2 z-10">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    downloadImage(
                                                        `${import.meta.env.VITE_API_URL}/staff/${staff.id}/id-proof`,
                                                        `staff-${staff.first_name}-${staff.id}-id-proof.jpg`
                                                    )
                                                }
                                            >
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No ID proof uploaded
                                </p>
                            )
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No ID proof uploaded
                            </p>
                        )}


                        <Input
                            type="file"
                            onChange={(e) =>
                                setStaff({ ...staff, id_proof: e.target.files?.[0] })
                            }
                        />
                        {/* </div> */}
                        {/* </div> */}

                        <div className="space-y-2">
                            <Label>Address</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-[3px] border border-border bg-background px-3 py-2 text-sm"
                                value={staff.address}
                                onChange={(e) =>
                                    setStaff({ ...staff, address: normalizeTextInput(e.target.value) })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Employment Type</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={staff.employment_type}
                                    onChange={(e) =>
                                        setStaff({ ...staff, employment_type: normalizeTextInput(e.target.value) })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="full-time">Full Time</option>
                                    <option value="part-time">Part Time</option>
                                    <option value="contract">Contract</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Joining Date*</Label>
                                {/* <Input
                                    type="date"
                                    value={staff.hire_date}
                                    onChange={(e) =>
                                        setStaff({ ...staff, hire_date: normalizeTextInput(e.target.value) })
                                    }
                                /> */}

                                <DatePicker
                                    selected={parseDate(staff.hire_date)}
                                    placeholderText="dd-mm-yyyy"
                                    onChange={(date) => {
                                        setStaff({ ...staff, hire_date: formatDate(date) })
                                    }}
                                    // onChangeRaw={(e) => e.preventDefault()}
                                    dateFormat="dd-MM-yyyy"
                                    customInput={
                                        <Input readOnly />
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Date of Birth*</Label>
                                {/* <Input
                                    type="date"
                                    value={staff.dob}
                                    onChange={(e) =>
                                        setStaff({ ...staff, dob: normalizeTextInput(e.target.value) })
                                    }
                                /> */}

                                <DatePicker
                                    selected={parseDate(staff.dob)}
                                    placeholderText="dd-mm-yyyy"
                                    onChange={(date) => {
                                        setStaff({ ...staff, dob: formatDate(date) })
                                    }}
                                    // onChangeRaw={(e) => e.preventDefault()}
                                    dateFormat="dd-MM-yyyy"
                                    customInput={
                                        <Input readOnly />
                                    }
                                />
                            </div>
                        </div>

                        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Leave Days</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={staff.leave_days}
                                    onChange={(e) =>
                                        setStaff({ ...staff, leave_days: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Shift Pattern</Label>
                                <Input
                                    value={staff.shift_pattern}
                                    onChange={(e) =>
                                        setStaff({ ...staff, shift_pattern: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>User Mapping</Label>
                                <Input
                                    value={staff.user_id}
                                    disabled={mode === "edit"}
                                    onChange={(e) =>
                                        setStaff({ ...staff, user_id: normalizeTextInput(e.target.value)})
                                    }
                                />
                            </div>
                        </div> */}

                        {/* Designation */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Designation</Label>
                                <Input
                                    value={staff.designation}
                                    onChange={(e) =>
                                        setStaff({ ...staff, designation: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={staff.department}
                                    onChange={(e) =>
                                        setStaff({ ...staff, department: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role*</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={staff.role_ids[0] || ""}
                                    onChange={(e) =>
                                        setStaff({ ...staff, role_ids: normalizeTextInput(e.target.value) ? [normalizeTextInput(e.target.value)] : [] })
                                    }
                                >
                                    <option value="" disabled>Select</option>
                                    {roles?.roles
                                        ?.filter(
                                            (role) =>
                                                !excludedRoles.includes(role.name.toUpperCase())
                                        )
                                        .map((role) => (
                                            <option value={role.id} key={role.id}>
                                                {role.name}
                                            </option>
                                        ))}

                                </select>

                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={staff.status === "active"}
                                onCheckedChange={(checked) => {
                                    setStaff((prev) => ({
                                        ...prev,
                                        status: checked ? "active" : "inactive",
                                    }));
                                }}
                            />
                            <Label>{staff.status}</Label>
                        </div>


                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button variant="hero" disabled={creating || updating} onClick={handleSubmit}>
                                {mode === "add" ? "Create Staff" : "Save Changes"}
                            </Button>
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
