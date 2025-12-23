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
import { useAddStaffMutation, useGetStaffByPropertyQuery, useLazyGetStaffByIdQuery, useUpdateStaffMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";

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
    address: "",
    gender: "",
    marital_status: "",
    employment_type: "",
    email: "",
    phone1: "",
    phone2: "",
    emergency_contact: "",
    designation: "",
    department: "",
    hire_date: "",
    dob: "",
    leave_days: "",
    shift_pattern: "",
    status: "active",
    blood_group: "",
    id_proof_type: "",
    id_number: "",
    image: null,
    id_proof: null,
    user_id: "",
}

/* -------------------- Component -------------------- */
export default function StaffManagement() {
    const [sheetOpen, setSheetOpen] = useState(false);

    const [mode, setMode] = useState<"add" | "edit">("add");

    const [page, setPage] = useState(1);
    const limit = 10;

    const [search, setSearch] = useState("");
    const [property, setProperty] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const propertyId = "1";

    const [staff, setStaff] = useState<any>(STAFF_INITIAL_VALUE);

    const debouncedSearch = useDebounce(search, 500);

    const { data, isLoading } = useGetStaffByPropertyQuery({
        property_id: propertyId,
        page,
        limit,
        search: debouncedSearch,
        property,
        status: statusFilter,
    });
    const [createStaff, { isLoading: creating }] = useAddStaffMutation();
    const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
    const [getStaffById] = useLazyGetStaffByIdQuery();


    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, property, statusFilter]);

    useEffect(() => {
        if (sheetOpen) return
        setStaff(STAFF_INITIAL_VALUE)
    }, [sheetOpen])

    const handleSubmit = async () => {
        try {
            const fd = new FormData();

            Object.entries(staff).forEach(([key, value]: any) => {
                if (
                    value === null ||
                    value === "" ||
                    key === "id" ||
                    key === "image" ||
                    key === "id_proof" ||
                    key === "created_on" ||
                    key === "updated_on"
                ) {
                    return;
                }

                if (typeof value === "boolean") {
                    fd.append(key, value ? "true" : "false");
                } else {
                    fd.append(key, value);
                }
            });

            if (staff.image instanceof File) {
                fd.append("image", staff.image);
                fd.append("image_mime", staff.image.type);
            }

            if (staff.id_proof instanceof File) {
                fd.append("id_proof", staff.id_proof);
                fd.append("id_proof_mime", staff.id_proof.type);
            }

            // if (mode === "add") {
            //     await createStaff(fd).unwrap();
            // } else {
            //     await updateStaff({
            //         id: staff.id,
            //         payload: fd,
            //     }).unwrap();
            // }
            const promise =
                mode === "add"
                    ? createStaff(fd).unwrap()
                    : updateStaff({
                        id: staff.id,
                        payload: fd,
                    }).unwrap();

            await toast.promise(promise, {
                pending: mode === "add"
                    ? "Creating staff..."
                    : "Updating staff...",
                success: mode === "add"
                    ? "Staff created successfully"
                    : "Staff updated successfully",
                error: {
                    render({ data }) {
                        return "Something went wrong";
                    },
                },
            });

            setSheetOpen(false);
        } catch (err) {
            console.error("Staff submit failed", err);
        }
    };

    const toDateInput = (value?: string) =>
        value ? value.split("T")[0] : "";


    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            <main className="lg:ml-64 h-screen overflow-hidden">
                <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Staff</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage hotel staff and their details.
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
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                value={property}
                                onChange={(e) => setProperty(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                <option value="Reception">Reception</option>
                                <option value="Housekeeping">Housekeeping</option>
                                <option value="Kitchen">Kitchen</option>
                                {/* dynamic later */}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
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
                                {!isLoading && data?.data?.length === 0 && (
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

                                {data?.data?.map((s: Staff, idx: number) => (
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

                                                            hire_date: toDateInput(fullStaff.hire_date),
                                                            dob: toDateInput(fullStaff.dob),

                                                            // status: fullStaff.status === "active",

                                                            image: null,
                                                            id_proof: null,
                                                        });

                                                    } catch (err) {
                                                        console.error("Failed to load staff", err);
                                                    }
                                                }}

                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {(
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                                <span className="text-muted-foreground">
                                    Page {data?.pagination?.page} of {data?.pagination?.totalPages}
                                </span>


                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={data?.pagination?.page === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={data?.pagination?.page === data?.pagination?.totalPages}
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
                            <div className="relative h-40 rounded-xl border border-border overflow-hidden">
                                {staff.image ? (
                                    <img
                                        src={URL.createObjectURL(staff.image)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        <User className="h-6 w-6" />
                                    </div>
                                )}

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
                                <Label>First Name</Label>
                                <Input
                                    value={staff.first_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, first_name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Middle Name</Label>
                                <Input
                                    value={staff.middle_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, middle_name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={staff.last_name}
                                    onChange={(e) =>
                                        setStaff({ ...staff, last_name: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={staff.email}
                                    onChange={(e) =>
                                        setStaff({ ...staff, email: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={staff.phone1}
                                    onChange={(e) =>
                                        setStaff({ ...staff, phone1: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Emergency Contact</Label>
                                <Input
                                    value={staff.emergency_contact}
                                    onChange={(e) =>
                                        setStaff({ ...staff, emergency_contact: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Alternate Phone</Label>
                                <Input
                                    value={staff.phone2}
                                    onChange={(e) =>
                                        setStaff({ ...staff, phone2: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={staff.gender}
                                    onChange={(e) => setStaff({ ...staff, gender: e.target.value })}
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Marital Status</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={staff.marital_status}
                                    onChange={(e) =>
                                        setStaff({ ...staff, marital_status: e.target.value })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Blood Group</Label>
                                <Input
                                    value={staff.blood_group}
                                    onChange={(e) =>
                                        setStaff({ ...staff, blood_group: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* ID Proof */}
                        <div className="space-y-2">
                            <Label>ID Proof</Label>

                            <div className="rounded-xl border border-border p-3 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>ID Proof Type</Label>
                                        <select
                                            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                            value={staff.id_proof_type}
                                            onChange={(e) =>
                                                setStaff({ ...staff, id_proof_type: e.target.value })
                                            }
                                        >
                                            <option value="">Select type</option>
                                            <option value="Aadhaar">Aadhaar</option>
                                            <option value="PAN">PAN</option>
                                            <option value="Passport">Passport</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>ID Number</Label>
                                        <Input
                                            value={staff.id_number}
                                            onChange={(e) =>
                                                setStaff({ ...staff, id_number: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                {staff.id_proof_url ? (
                                    <a
                                        href={staff.id_proof_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View uploaded ID proof
                                    </a>
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
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Address</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                value={staff.address}
                                onChange={(e) =>
                                    setStaff({ ...staff, address: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Employment Type</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={staff.employment_type}
                                    onChange={(e) =>
                                        setStaff({ ...staff, employment_type: e.target.value })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="full-time">Full Time</option>
                                    <option value="part-time">Part Time</option>
                                    <option value="contract">Contract</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Hire Date</Label>
                                <Input
                                    type="date"
                                    value={staff.hire_date}
                                    onChange={(e) =>
                                        setStaff({ ...staff, hire_date: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input
                                    type="date"
                                    value={staff.dob}
                                    onChange={(e) =>
                                        setStaff({ ...staff, dob: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Leave Days</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={staff.leave_days}
                                    onChange={(e) =>
                                        setStaff({ ...staff, leave_days: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Shift Pattern</Label>
                                <Input
                                    value={staff.shift_pattern}
                                    onChange={(e) =>
                                        setStaff({ ...staff, shift_pattern: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>User Mapping</Label>
                                <Input
                                    value={staff.user_id}
                                    disabled={mode === "edit"}
                                    onChange={(e) =>
                                        setStaff({ ...staff, user_id: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Designation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Designation</Label>
                                <Input
                                    value={staff.designation}
                                    onChange={(e) =>
                                        setStaff({ ...staff, designation: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={staff.department}
                                    onChange={(e) =>
                                        setStaff({ ...staff, department: e.target.value })
                                    }
                                />
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
