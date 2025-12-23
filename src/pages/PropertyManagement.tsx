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
import { Building2, Phone, Mail, Image as ImageIcon } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useAddPropertyMutation, useBulkUpsertPropertyFloorsMutation, useGetPropertiesQuery, useGetPropertyFloorsQuery, useUpdatePropertiesMutation } from "@/redux/services/hmsApi";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "react-toastify";

// ---- Types ----
type Property = {
    id: string;
    brand_name: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state: string;
    postal_code?: string | null;
    country?: string | null;
    phone?: string | null;
    phone2?: string | null;
    email?: string | null;
    is_active: boolean;
    total_rooms?: number | null;
    total_floors?: number | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    image?: string | null;
};

const EMPTY_PROPERTY = {
    brand_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    checkin_time: "12:00:00",
    checkout_time: "10:00:00",
    is_active: true,
    room_tax_rate: 0,
    gst: 5,
    serial_number: "001",
    serial_suffix: "",
    total_floors: 0,
    phone: "",
    phone2: "",
    email: "",
    total_rooms: "",
    year_opened: "",
    is_pet_friendly: false,
    smoking_policy: "",
    cancellation_policy: "",
    image: null,
    id: null,
    floors: [] as {
        floor_number: number;
        total_rooms: number;
    }[],

};


export default function PropertyManagement() {
    const [mode, setMode] = useState<"add" | "edit">("add");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    // pagination
    const [page, setPage] = useState(1);
    const limit = 10;

    // filters
    const [search, setSearch] = useState("");
    const [city, setCity] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [country, setCountry] = useState("");

    const [newProperty, setNewProperty] = useState(EMPTY_PROPERTY);

    const debouncedSearch = useDebounce(search, 500)

    const [addProperty, { isLoading, isSuccess }] = useAddPropertyMutation()
    const [updateProperty, { isSuccess: propertyUpdateSuccess, isError: propertyUpdateError, isUninitialized: propertyUpdateUninitialized }] = useUpdatePropertiesMutation()
    const {
        data: properties,
        isLoading: propertiesLoading,
        isFetching: propertiesFetching,
        isError: propertiesError,
        isUninitialized: propertyUninitialized,
    } = useGetPropertiesQuery({
        page,
        limit,
        search: debouncedSearch || undefined,
        city: city || undefined,
        state: stateFilter || undefined,
        country: country || undefined,
    }, {
        refetchOnMountOrArgChange: false
    });

    const { data: floorsResponse, isLoading: floorsLoading } = useGetPropertyFloorsQuery(selectedProperty?.id, { skip: !selectedProperty?.id, });
    const floors = floorsResponse?.floors ?? [];

    const [bulkUpsertFloors] = useBulkUpsertPropertyFloorsMutation()
    console.log("🚀 ~ PropertyManagement ~ newProperty:", newProperty.floors, floors)

    useEffect(() => {
        if (mode === "edit" && floors.length > 0) {
            setNewProperty(prev => ({
                ...prev,
                total_floors: floors.length,
                floors: floors.map(f => ({
                    floor_number: f.floor_number,
                    total_rooms: f.rooms_count,
                })),
            }));
        }
    }, [floors, mode]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, city, stateFilter, country]);

    useEffect(() => {
        if (mode === "add" && newProperty.floors.length !== newProperty.total_floors) {
            syncFloors(newProperty.total_floors);
        }
    }, [newProperty.total_floors, mode]);



    const toggleActive = (id: string, is_active: boolean) => {
        const payload = { is_active }
        updateProperty({ id, payload })
    };

    function buildPropertyFormData(payload: any) {
        const fd = new FormData()

        const total_rooms = payload.floors.reduce((acc, curr) => {
            return acc + curr.total_rooms
        }, 0)

        fd.append('brand_name', payload.brand_name)
        fd.append('address_line_1', payload.address_line_1)

        if (payload.address_line_2) fd.append('address_line_2', payload.address_line_2)
        if (payload.city) fd.append('city', payload.city)
        if (payload.state) fd.append('state', payload.state)
        if (payload.postal_code) fd.append('postal_code', payload.postal_code)
        if (payload.country) fd.append('country', payload.country)

        if (payload.checkin_time) fd.append('checkin_time', payload.checkin_time)
        if (payload.checkout_time) fd.append('checkout_time', payload.checkout_time)

        fd.append('is_active', String(payload.is_active ?? true))
        fd.append('is_pet_friendly', String(payload.is_pet_friendly ?? false))

        fd.append('room_tax_rate', String(payload.room_tax_rate ?? 0))
        fd.append('gst', String(payload.gst ?? 0))

        if (payload.serial_number) fd.append('serial_number', payload.serial_number)
        if (payload.total_floors) fd.append('total_floors', String(payload.total_floors))
        if (total_rooms) fd.append('total_rooms', String(total_rooms))

        if (payload.phone) fd.append('phone', payload.phone)
        if (payload.phone2) fd.append('phone2', payload.phone2)
        if (payload.email) fd.append('email', payload.email)

        if (payload.year_opened) fd.append('year_opened', String(payload.year_opened))
        if (payload.smoking_policy) fd.append('smoking_policy', payload.smoking_policy)
        if (payload.cancellation_policy) fd.append('cancellation_policy', payload.cancellation_policy)

        if (payload.image instanceof File) {
            fd.append('image', payload.image)
            fd.append('image_mime', payload.image.type)
        }

        return fd
    }

    async function handleSubmitProperty() {

        const phoneRegex = /^(\+?\d{1,3}[- ]?)?[0-9]{10}$/;
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (!newProperty.brand_name) {
            toast.error('Hotel name is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.serial_number) {
            toast.error('Serial number is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.address_line_1) {
            toast.error('Address is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.city) {
            toast.error('City is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.state) {
            toast.error('State is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.postal_code) {
            toast.error('Postal Code is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.state) {
            toast.error('State is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!newProperty.total_floors) {
            toast.error('Minimum 1 floor is required', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }

        if (!phoneRegex.test(newProperty.phone)) {
            toast.error('Incorrect Phone Number', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (newProperty.phone2 && !phoneRegex.test(newProperty.phone2)) {
            toast.error('Incorrect Alternative Phone Number', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }
        if (!emailRegex.test(newProperty.email)) {
            toast.error('Incorrect email', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"
            });
            return
        }


        const formData = buildPropertyFormData(newProperty)

        const promise =
            mode === 'add'
                ? addProperty(formData).unwrap()
                : updateProperty({
                    id: selectedProperty.id,
                    payload: formData,
                }).unwrap()

        toast.promise(promise, {
            pending: mode === 'add'
                ? 'Creating property...'
                : 'Updating property...',
            success: mode === 'add'
                ? 'Property created successfully'
                : 'Property updated successfully',
            error: 'Something went wrong',
        })

        const { id } = await promise
        await bulkUpsertFloors({
            property_id: id,
            floors: newProperty.floors.map((f) => ({
                floor_number: f.floor_number,
                rooms_count: f.total_rooms,
            })),
        }).unwrap();
        setSheetOpen(false)
    }

    function syncFloors(totalFloors: number) {
        setNewProperty(prev => {
            const safeFloors = Array.isArray(prev.floors) ? prev.floors : [];

            let floors = [...safeFloors];

            if (totalFloors > floors.length) {
                for (let i = floors.length + 1; i <= totalFloors; i++) {
                    floors.push({
                        floor_number: i,
                        total_rooms: 0,
                    });
                }
            }

            if (totalFloors < floors.length) {
                floors = floors.slice(0, totalFloors);
            }

            floors = floors.map((f, i) => ({
                ...f,
                floor_number: i + 1,
            }));

            return {
                ...prev,
                total_floors: totalFloors,
                floors,
            };
        });
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="lg:ml-64 h-screen overflow-hidden">
                <section className="h-full overflow-y-auto scrollbar-hide p-6 lg:p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Properties</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage your hotels and property-level configuration.
                            </p>
                        </div>

                        <Button
                            variant="hero"
                            onClick={() => {
                                setMode("add");
                                setSelectedProperty(null);
                                setNewProperty(EMPTY_PROPERTY);
                                setSheetOpen(true);
                            }}
                        >
                            Add Property
                        </Button>

                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                        <Input
                            placeholder="Search property"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {/* <Input
                            placeholder="City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />

                        <Input
                            placeholder="State"
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                        />

                        <Input
                            placeholder="Country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                        /> */}
                    </div>


                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {propertiesLoading && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                            Loading properties…
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!propertyUninitialized &&
                                    !propertiesError &&
                                    properties?.data?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                                No properties found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                {!propertiesLoading && !propertyUninitialized && !propertiesError && properties.data.map((property) => (
                                    <TableRow key={property.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                {property.brand_name}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {property.city}, {property.state}
                                            </p>
                                        </TableCell>
                                        <PropertyStatusCell
                                            key={property.id}
                                            property={property}
                                            toggleActive={toggleActive}
                                        />
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() => {
                                                    setMode("edit");
                                                    setSelectedProperty(property);
                                                    setNewProperty({
                                                        ...EMPTY_PROPERTY,
                                                        ...property,
                                                        floors: [],
                                                        total_floors: property.total_floors ?? 0,
                                                    });

                                                    setSheetOpen(true);
                                                }}

                                            >
                                                Manage
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {properties?.pagination && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                                <span className="text-muted-foreground">
                                    Page {properties.pagination.page} of {properties.pagination.totalPages}
                                </span>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={page === 1 || propertiesFetching}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        disabled={
                                            page === properties.pagination.totalPages || propertiesFetching
                                        }
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
                                {mode === "add" ? "Add Property" : "Edit Property"}
                            </SheetTitle>
                        </SheetHeader>

                        {/* Property Image */}
                        <div className="space-y-2">
                            <Label>Property Image</Label>

                            <div className="relative rounded-xl border border-border overflow-hidden">
                                {newProperty.image ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/properties/${newProperty.id}/image`}
                                        alt="Property preview"
                                        className="w-full h-48 object-cover"
                                    />
                                ) : (
                                    <div className="h-48 bg-muted flex flex-col items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-6 w-6 mb-2" />
                                        <span className="text-sm">Upload property image</span>
                                    </div>
                                )}

                                {/* Overlay upload input */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setNewProperty({ ...newProperty, image: file });
                                        }
                                    }}
                                />
                            </div>

                            {newProperty.image && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-1"
                                    onClick={() => setNewProperty({ ...newProperty, image: null })}
                                >
                                    Remove image
                                </Button>
                            )}
                        </div>


                        {/* Basic Info */}
                        <div className="space-y-2">
                            <Label>Hotel Name*</Label>
                            <Input
                                required
                                value={newProperty.brand_name}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, brand_name: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Serial Suffix</Label>
                                <Input
                                    value={newProperty.serial_suffix}
                                    onChange={(e) =>
                                        setNewProperty({ ...newProperty, serial_number: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Serial Number*</Label>
                                <Input
                                    required
                                    value={newProperty.serial_number}
                                    onChange={(e) =>
                                        setNewProperty({ ...newProperty, serial_number: e.target.value })
                                    }
                                />
                            </div>

                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <Label>Address Line 1*</Label>
                            <Input
                                required
                                value={newProperty.address_line_1}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, address_line_1: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Address Line 2</Label>
                            <Input
                                value={newProperty.address_line_2}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, address_line_2: e.target.value })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>City*</Label>
                                <Input
                                    required
                                    value={newProperty.city}
                                    onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>State*</Label>
                                <Input
                                    required
                                    value={newProperty.state}
                                    onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Postal Code*</Label>
                                <Input
                                    required
                                    value={newProperty.postal_code}
                                    onChange={(e) => setNewProperty({ ...newProperty, postal_code: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Phone*</Label>
                                <Input
                                    required
                                    value={newProperty.phone}
                                    onChange={(e) => setNewProperty({ ...newProperty, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Alternative Phone</Label>
                                <Input
                                    value={newProperty.phone2}
                                    onChange={(e) => setNewProperty({ ...newProperty, phone2: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email*</Label>
                                <Input
                                    required
                                    value={newProperty.email}
                                    onChange={(e) => setNewProperty({ ...newProperty, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Timings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Check-in Time*</Label>
                                <Input type="time" value={newProperty.checkin_time}
                                    onChange={(e) => setNewProperty({ ...newProperty, checkin_time: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Check-out Time*</Label>
                                <Input type="time" value={newProperty.checkout_time}
                                    onChange={(e) => setNewProperty({ ...newProperty, checkout_time: e.target.value })} />
                            </div>
                        </div>

                        {/* Numbers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* <Input type="number" placeholder="Total Rooms"
                                onChange={(e) => setNewProperty({ ...newProperty, total_rooms: e.target.value })} /> */}
                            <div className="space-y-2">
                                <Label>Total Floors*</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={newProperty.total_floors}
                                    onChange={(e) => {
                                        const value = Number(e.target.value) || 0;
                                        syncFloors(value);
                                    }}
                                />

                            </div>
                            <div className="space-y-2">
                                <Label>GST %</Label>
                                <Input type="number" min={0} value={newProperty.gst}
                                    onChange={(e) => setNewProperty({ ...newProperty, gst: +e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Room Tax %</Label>
                                <Input type="number" min={0} value={newProperty.room_tax_rate}
                                    onChange={(e) => setNewProperty({ ...newProperty, room_tax_rate: +e.target.value })} />
                            </div>
                        </div>

                        {/* Floors & Rooms */}
                        <div className="space-y-3">
                            <Label>Floor Configuration</Label>

                            <div className="rounded-xl border border-border overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 text-sm font-medium text-muted-foreground bg-muted/30">
                                    <span>Floor</span>
                                    <span>Rooms Count</span>
                                    <span className="text-right"></span>
                                </div>

                                {/* Table Rows */}
                                {newProperty?.floors?.map((floor, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-[1fr_.6fr_auto] gap-4 px-4 py-3 items-center border-t border-border"
                                    >
                                        {/* Floor */}
                                        <span className="font-medium text-foreground">
                                            Floor {floor.floor_number}
                                        </span>

                                        {/* Rooms Count */}
                                        <Input
                                            type="number"
                                            className="border-none"
                                            min={0}
                                            value={floor.total_rooms}
                                            onChange={(e) => {
                                                const value = Number(e.target.value) || 0;

                                                setNewProperty(prev => {
                                                    const floors = [...prev.floors];
                                                    floors[index] = {
                                                        ...floors[index],
                                                        total_rooms: value,
                                                    };
                                                    return { ...prev, floors };
                                                });
                                            }}
                                        />

                                        {/* Remove */}
                                        <div className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="border"
                                                onClick={() => {
                                                    syncFloors(
                                                        Math.max((newProperty.total_floors || 0) - 1, 0)
                                                    );
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty State */}
                                {(!newProperty?.floors || newProperty.floors.length === 0) && (
                                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                                        No floors added yet
                                    </div>
                                )}
                            </div>

                            {/* Add Floor Button */}
                            <Button
                                size="sm"
                                variant="heroOutline"
                                onClick={() => {
                                    syncFloors((newProperty.total_floors || 0) + 1);
                                }}
                            >
                                Add Floor
                            </Button>
                        </div>


                        {/* Policies */}
                        <div className="space-y-2">
                            <Label>Smoking Policy</Label>
                            <textarea
                                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                value={newProperty.smoking_policy}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, smoking_policy: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cancellation Policy</Label>
                            <textarea
                                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                value={newProperty.cancellation_policy}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, cancellation_policy: e.target.value })
                                }
                            />
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={newProperty.is_active}
                                    onCheckedChange={(v) =>
                                        setNewProperty({ ...newProperty, is_active: v })
                                    }
                                />
                                <Label>Active</Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={newProperty.is_pet_friendly}
                                    onCheckedChange={(v) =>
                                        setNewProperty({ ...newProperty, is_pet_friendly: v })
                                    }
                                />
                                <Label>Pet Friendly</Label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button variant="hero" onClick={handleSubmitProperty}>
                                {mode === "add" ? "Create Property" : "Save Changes"}
                            </Button>
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

        </div>
    );
}

function PropertyStatusCell({ property, toggleActive }) {
    const [isActive, setIsActive] = useState(property.is_active);

    // Sync when parent data changes (important!)
    useEffect(() => {
        setIsActive(property.is_active);
    }, [property.is_active]);

    const debouncedIsActive = useDebounce(isActive, 500);

    useEffect(() => {
        if (debouncedIsActive !== property.is_active) {
            toggleActive(property.id, debouncedIsActive);
        }
    }, [debouncedIsActive]);

    return (
        <TableCell>
            <div className="flex items-center gap-2">
                <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                </span>
            </div>
        </TableCell>
    );
}

