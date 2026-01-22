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
import { useAddPropertyBySuperAdminMutation, useAddPropertyMutation, useBulkUpsertPropertyFloorsMutation, useGetMeQuery, useGetPropertiesQuery, useGetPropertyBanksQuery, useGetPropertyFloorsQuery, useLazyGetUsersByPropertyAndRoleQuery, useLazyGetUsersByRoleQuery, useUpdatePropertiesMutation, useUpsertPropertyBanksMutation } from "@/redux/services/hmsApi";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { isWithinCharLimit } from "@/utils/isWithinCharLimit";

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
        total_rooms: number | "";
    }[],
    owner_user_id: "",
    gst_no: "",
    location_link: "",
    address_line_1_office: "",
    address_line_2_office: "",
    city_office: "",
    state_office: "",
    postal_code_office: "",
    country_office: "",
    phone_office: "",
    phone2_office: "",
    email_office: "",
    status: "OWNED",
    bank_accounts: [] as BankAccount[],
    has_bank_details: false,
};

type BankAccount = {
    id?: number; // IMPORTANT for update
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
};

function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
                <h3 className="text-base font-semibold text-foreground">
                    {title}
                </h3>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

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
    const [updatingPropertyIds, setUpdatingPropertyIds] = useState<Set<string>>(new Set());
    const [newProperty, setNewProperty] = useState(EMPTY_PROPERTY);
    const [originalProperty, setOriginalProperty] = useState<any>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const [showOfficeFields, setShowOfficeFields] = useState(false);
    const [hasBankDetails, setHasBankDetails] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
        {
            account_holder_name: "",
            account_number: "",
            ifsc_code: "",
            bank_name: "",
        },
    ]);
    const [deletedBankIds, setDeletedBankIds] = useState<number[]>([]);
    const [originalBankAccounts, setOriginalBankAccounts] = useState<BankAccount[]>([]);
    const [originalHasBankDetails, setOriginalHasBankDetails] = useState(false);

    const debouncedSearch = useDebounce(search, 500)
    // const isLoggedIn = useSelector((state: any) => state.isLoggedIn.value);
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const navigate = useNavigate()

    const [addProperty] = useAddPropertyMutation()
    const [addPropertySuperAdmin] = useAddPropertyBySuperAdminMutation()
    const [updateProperty] = useUpdatePropertiesMutation()
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

    const { data: propertyBanks } = useGetPropertyBanksQuery(selectedProperty?.id, {
        skip: !isLoggedIn || !selectedProperty?.id
    })

    const [bulkUpsertFloors] = useBulkUpsertPropertyFloorsMutation()
    const [upsertPropertyBank] = useUpsertPropertyBanksMutation()

    const [getUsers, { data: users }] = useLazyGetUsersByRoleQuery()
    const [getPropertyAdmins, { data: propertyAdmins }] = useLazyGetUsersByPropertyAndRoleQuery()
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    useEffect(() => {
        if (!isLoggedIn) return
        if (isSuperAdmin) {
            getUsers("owner")
        } else if (isOwner && selectedProperty) {
            // getUsers("admin")
            getPropertyAdmins({ propertyId: selectedProperty.id, role: "admin" })
        }
    }, [isLoggedIn, isSuperAdmin, getUsers, selectedProperty])

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

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        console.log("🚀 ~ PropertyManagement ~ newProperty.address_line_1_office:", newProperty.address_line_1_office === null)
        if (mode === "edit" && newProperty.address_line_1_office) {
            setShowOfficeFields(true);
        }
    }, [mode, newProperty.address_line_1_office]);

    useEffect(() => {
        if (sheetOpen) return
        setShowOfficeFields(false)
    }, [sheetOpen])

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            if (logoPreview) URL.revokeObjectURL(logoPreview);
        };
    }, [imagePreview, logoPreview]);

    useEffect(() => {
        setImageError(false);
        setLogoError(false);
    }, [newProperty?.id]);

    useEffect(() => {
        if (mode !== "edit") return;

        if (propertyBanks?.length) {
            setHasBankDetails(true);
            setBankAccounts(propertyBanks);
        } else {
            setHasBankDetails(false);
            setBankAccounts([
                {
                    account_holder_name: "",
                    account_number: "",
                    ifsc_code: "",
                    bank_name: "",
                },
            ]);
        }
    }, [propertyBanks, mode]);

    const toggleActive = async (id: string, is_active: boolean) => {
        setUpdatingPropertyIds(prev => new Set(prev).add(id));

        try {
            await updateProperty({
                id,
                payload: { is_active },
            }).unwrap();
        } catch (err) {
            toast.error("Failed to update property status");
        } finally {
            setUpdatingPropertyIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const isValid = (value) => /^[^,\s]+(,[^,\s]+)*$/.test(value);

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

        if (selectedImageFile) {
            fd.append("image", selectedImageFile);
            fd.append("image_mime", selectedImageFile.type);
        }

        if (payload.owner_user_id) fd.append("owner_user_id", payload.owner_user_id)
        if (payload.gst_no) fd.append("gst_no", payload.gst_no)

        if (payload.location_link) fd.append("location_link", payload.location_link);

        if (payload.address_line_1_office) fd.append("address_line_1_office", payload.address_line_1_office);
        if (payload.address_line_2_office) fd.append("address_line_2_office", payload.address_line_2_office);
        if (payload.city_office) fd.append("city_office", payload.city_office);
        if (payload.state_office) fd.append("state_office", payload.state_office);
        if (payload.postal_code_office) fd.append("postal_code_office", payload.postal_code_office);
        if (payload.country_office) fd.append("country_office", payload.country_office);

        if (payload.phone_office) fd.append("phone_office", payload.phone_office);
        if (payload.phone2_office) fd.append("phone2_office", payload.phone2_office);
        if (payload.email_office) fd.append("email_office", payload.email_office);
        if (logoFile) {
            fd.append("logo", logoFile);
            fd.append("logo_mime", logoFile.type);
        }
        if (payload.status) fd.append("status", payload.status)

        return fd
    }

    async function handleSubmitProperty() {

        const phoneRegex = /^(\+?\d{1,3}[- ]?)?[0-9]{10}$/;
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (!newProperty.brand_name) {
            toast.error('Property name is required', {
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
        if (hasBankDetails) {
            for (const bank of bankAccounts) {
                if (
                    !bank.account_holder_name ||
                    !bank.account_number ||
                    !bank.ifsc_code ||
                    !bank.bank_name
                ) {
                    toast.error("Please fill all bank account fields");
                    return;
                }
            }
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
        if (!newProperty.gst_no) {
            toast.error('GST Number is required', {
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

        if (hasBankDetails) {
            for (const bank of bankAccounts) {
                if (
                    !bank.account_holder_name ||
                    !bank.account_number ||
                    !bank.ifsc_code ||
                    !bank.bank_name
                ) {
                    toast.error("Please fill all bank account fields");
                    return;
                }
            }
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

        if (showOfficeFields && !newProperty.address_line_1_office) {
            toast.error('Please add office address', {
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

        if (showOfficeFields && !newProperty.city_office) {
            toast.error('Office city required', {
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

        if (showOfficeFields && !newProperty.state_office) {
            toast.error('Office State required', {
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

        if (showOfficeFields && !newProperty.postal_code_office) {
            toast.error('Office postal code required', {
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

        if (showOfficeFields && !newProperty.country_office) {
            toast.error('Office Country required', {
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

        if (showOfficeFields && !newProperty.phone_office) {
            toast.error('Office Phone Number required', {
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

        if (newProperty.phone_office && !phoneRegex.test(newProperty.phone_office)) {
            toast.error('Incorrect office Phone Number', {
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

        if (newProperty.phone2_office && !phoneRegex.test(newProperty.phone2_office)) {
            toast.error('Incorrect alternate office Phone Number', {
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

        if (showOfficeFields && !newProperty.email_office) {
            toast.error('Office email required', {
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

        if (newProperty.email_office && !emailRegex.test(newProperty.email_office)) {
            toast.error('Incorrect office email', {
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
                ? (isSuperAdmin && newProperty.owner_user_id) ? addPropertySuperAdmin(formData).unwrap() : addProperty(formData).unwrap()
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

        if (hasBankDetails) {
            await upsertPropertyBank({
                propertyId: id,
                accounts: bankAccounts,
                deletedIds: deletedBankIds,
            }).unwrap();
        }

        await bulkUpsertFloors({
            property_id: id,
            floors: newProperty.floors.map((f) => ({
                floor_number: f.floor_number,
                rooms_count: f.total_rooms,
            })),
            prefix: newProperty.serial_suffix
        }).unwrap();
        if (mode === "add") {
            navigate("/rooms", {
                state: { propertyId: id }
            })
        }
        setSheetOpen(false)
        setDeletedBankIds([]);
    }

    function syncFloors(totalFloors: number) {
        setNewProperty(prev => {
            const safeFloors = Array.isArray(prev.floors) ? prev.floors : [];

            let floors = [...safeFloors];

            if (totalFloors > floors.length) {
                for (let i = floors.length + 1; i <= totalFloors; i++) {
                    floors.push({
                        floor_number: i,
                        total_rooms: 1,
                    });
                }
            }

            if (totalFloors < floors.length) {
                floors = floors.slice(0, totalFloors);
            }

            floors = floors.map((f, i) => ({
                ...f,
                floor_number: i,
            }));

            return {
                ...prev,
                total_floors: totalFloors,
                floors,
            };
        });
    }

    function normalizeForCompare(payload: any) {
        const clone = { ...payload };

        delete clone.id;
        delete clone.image;
        delete clone.floors;

        return clone;
    }

    const addBankAccount = () => {
        setBankAccounts(prev => [
            ...prev,
            {
                account_holder_name: "",
                account_number: "",
                ifsc_code: "",
                bank_name: "",
            },
        ]);
    };

    const updateBankField = (
        index: number,
        field: keyof BankAccount,
        value: string
    ) => {
        setBankAccounts(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                [field]: normalizeTextInput(value),
            };
            return copy;
        });
    };

    const removeBankAccount = (index: number) => {
        setBankAccounts(prev => {
            const removed = prev[index];
            if (removed?.id) {
                setDeletedBankIds(ids => [...ids, removed.id!]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    function normalizeBanks(banks: BankAccount[]) {
        return banks.map(b => ({
            id: b.id ?? null,
            account_holder_name: b.account_holder_name,
            account_number: b.account_number,
            ifsc_code: b.ifsc_code,
            bank_name: b.bank_name,
        }));
    }

    const isDirty =
        mode === "edit" &&
        originalProperty &&
        (
            JSON.stringify(normalizeForCompare(originalProperty)) !==
            JSON.stringify(normalizeForCompare(newProperty))
            ||
            JSON.stringify(normalizeBanks(originalBankAccounts)) !==
            JSON.stringify(normalizeBanks(bankAccounts))
            ||
            originalHasBankDetails !== hasBankDetails
            ||
            deletedBankIds.length > 0
            ||
            !!selectedImageFile
        );

    useEffect(() => {
        if (!sheetOpen) {
            setDeletedBankIds([]);
        }
    }, [sheetOpen]);


    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                user={{
                    name: "",
                    email: "user@atithiflow.com",
                }}
            />
            <Sidebar />
            {/* <main className="lg:ml-64 h-screen overflow-hidden"> */}
            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
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
                                // setLogoFile(null);
                                // setLogoPreview(null);

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
                                    {/* <TableHead>Status</TableHead> */}
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
                                {!propertiesLoading && !propertyUninitialized && !propertiesError && properties && properties.data.map((property) => (
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
                                        {/* <PropertyStatusCell
                                            isUpdating={updatingPropertyIds.has(property.id)}
                                            key={property.id}
                                            property={property}
                                            toggleActive={toggleActive}
                                        /> */}
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                disabled={updatingPropertyIds.has(property.id)}
                                                onClick={() => {
                                                    setMode("edit");
                                                    setSelectedProperty(property);

                                                    const prepared = {
                                                        ...EMPTY_PROPERTY,
                                                        ...property,
                                                        floors: [],
                                                        total_floors: property.total_floors ?? 0,
                                                        owner_user_id: property.owner_user_id ?? "",
                                                    };

                                                    setNewProperty(prepared);
                                                    setOriginalProperty(JSON.parse(JSON.stringify(prepared)));
                                                    setOriginalBankAccounts(
                                                        propertyBanks ? JSON.parse(JSON.stringify(propertyBanks)) : []
                                                    );
                                                    setOriginalHasBankDetails(!!propertyBanks?.length);
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
                                            page >= properties.pagination.totalPages || propertiesFetching
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
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto"
                >
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
                                {(imagePreview || (newProperty.id && !imageError)) ? (
                                    <img
                                        src={
                                            imagePreview
                                                ? imagePreview
                                                : `${import.meta.env.VITE_API_URL}/properties/${newProperty.id}/image`
                                        }
                                        alt="Property image"
                                        className="w-full h-48 object-cover"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="h-48 bg-muted flex flex-col items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-6 w-6 mb-2" />
                                        <span className="text-sm">Upload property image</span>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        setSelectedImageFile(file);
                                        setImagePreview(URL.createObjectURL(file));
                                        setImageError(false); // reset error on new upload
                                    }}
                                />
                            </div>


                            {imagePreview && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-1"
                                    onClick={() => {
                                        setSelectedImageFile(null);
                                        setImagePreview(null);
                                        // setNewProperty({ ...newProperty, image: null })
                                    }}
                                >
                                    Remove image
                                </Button>
                            )}
                        </div>


                        {/* Basic Info */}
                        <div className="space-y-2">
                            <Label>Property Name*</Label>
                            <Input
                                required
                                value={newProperty.brand_name}
                                onChange={(e) => {
                                    if (!isWithinCharLimit(e.target.value, 150)) return
                                    setNewProperty({ ...newProperty, brand_name: normalizeTextInput(e.target.value) })
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Property Logo</Label>

                            <div className="relative rounded-xl border border-border overflow-hidden">
                                {(logoPreview || (newProperty.id && !logoError)) ? (
                                    <img
                                        src={
                                            logoPreview
                                                ? logoPreview
                                                : `${import.meta.env.VITE_API_URL}/properties/${newProperty.id}/logo`
                                        }
                                        alt="Property logo"
                                        className="w-full h-28 object-contain bg-background"
                                        onError={() => setLogoError(true)}
                                    />
                                ) : (
                                    <div className="h-28 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                                        Upload property logo
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        setLogoFile(file);
                                        setLogoPreview(URL.createObjectURL(file));
                                        setLogoError(false); // reset error
                                    }}
                                />
                            </div>

                            {logoPreview && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setLogoFile(null);
                                        setLogoPreview(null);
                                    }}
                                >
                                    Remove logo
                                </Button>
                            )}
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4`}>
                            <div className="space-y-2">
                                <Label>Serial Suffix</Label>
                                <Input
                                    value={newProperty.serial_suffix}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 7)) return
                                        setNewProperty({ ...newProperty, serial_suffix: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Room Serial*</Label>
                                <select
                                    required
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={newProperty.serial_number}
                                    onChange={(e) =>
                                        setNewProperty({
                                            ...newProperty,
                                            serial_number: e.target.value,
                                        })
                                    }
                                >
                                    <option value="" disabled>
                                        Select serial number
                                    </option>
                                    <option value="001">001</option>
                                    <option value="101">101</option>
                                    <option value="201">201</option>
                                </select>

                            </div>
                            <div className="space-y-2">
                                <Label>GST Number*</Label>
                                <Input type="text" min={0} value={newProperty.gst_no}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 50)) return
                                        setNewProperty({ ...newProperty, gst_no: normalizeTextInput(e.target.value) })
                                    }} />
                            </div>
                            {(isSuperAdmin || isOwner) && <div className="space-y-2">
                                <Label>Property {isSuperAdmin ? "Owner" : "Admin"}</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={newProperty.owner_user_id}
                                    onChange={(e) => setNewProperty({ ...newProperty, owner_user_id: normalizeTextInput(e.target.value) })}
                                >
                                    <option value={null}>No {isSuperAdmin ? "Owner" : "Admin"}</option>
                                    {isSuperAdmin ? users?.users?.map((user, i) => {
                                        return <option key={i} value={user.user_id}>{user.email}</option>
                                    }) :
                                        propertyAdmins?.users?.map((user, i) => {
                                            return <option key={i} value={user.user_id}>{user.email}</option>
                                        })}
                                </select>
                            </div>}

                            <div className="space-y-2">
                                <Label>Property Status</Label>
                                <select
                                    required
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={newProperty.status}
                                    onChange={(e) =>
                                        setNewProperty({
                                            ...newProperty,
                                            status: e.target.value,
                                        })
                                    }
                                >
                                    <option value="" disabled>
                                        Select serial number
                                    </option>
                                    <option value="OWNED">OWNED</option>
                                    <option value="LEASED">LEASED</option>
                                </select>

                            </div>
                            {/* <div className="space-y-2">
                                <Label>Banks (comma separated)</Label>
                                <Input
                                    placeholder="PNB,HDFC,Axis"
                                    value={newProperty.bank_accounts}
                                    onChange={(e) =>
                                        setNewProperty({ ...newProperty, bank_accounts: normalizeTextInput(e.target.value) })
                                    }
                                />
                            </div> */}
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <Label>Address Line 1*</Label>
                            <Input
                                required
                                value={newProperty.address_line_1}
                                onChange={(e) => {
                                    if (!isWithinCharLimit(e.target.value, 200)) return
                                    setNewProperty({ ...newProperty, address_line_1: normalizeTextInput(e.target.value) })
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Address Line 2</Label>
                            <Input
                                value={newProperty.address_line_2}
                                onChange={(e) => {
                                    if (!isWithinCharLimit(e.target.value, 200)) return
                                    setNewProperty({ ...newProperty, address_line_2: normalizeTextInput(e.target.value) })
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Google Location Link</Label>
                            <Input
                                // placeholder="https://maps.google.com/..."
                                value={newProperty.location_link}
                                onChange={(e) =>
                                    setNewProperty({
                                        ...newProperty,
                                        location_link: normalizeTextInput(e.target.value),
                                    })
                                }
                            />
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>City*</Label>
                                <Input
                                    required
                                    value={newProperty.city}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 100)) return
                                        setNewProperty({ ...newProperty, city: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>State*</Label>
                                <Input
                                    required
                                    value={newProperty.state}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 100)) return
                                        setNewProperty({ ...newProperty, state: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Postal Code*</Label>
                                <Input
                                    required
                                    value={newProperty.postal_code}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 20)) return
                                        setNewProperty({ ...newProperty, postal_code: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Country*</Label>
                                <Input
                                    required
                                    value={newProperty.country}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 50)) return
                                        setNewProperty({ ...newProperty, country: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone*</Label>
                                <Input
                                    required
                                    value={newProperty.phone}
                                    onChange={(e) => e.target.value.trim().length <= 10 && setNewProperty({ ...newProperty, phone: normalizeTextInput(e.target.value.trim()) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Alternative Phone</Label>
                                <Input
                                    value={newProperty.phone2}
                                    onChange={(e) => e.target.value.trim().length <= 10 && setNewProperty({ ...newProperty, phone2: normalizeTextInput(e.target.value.trim()) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email*</Label>
                                <Input
                                    required
                                    value={newProperty.email}
                                    onChange={(e) => {
                                        if (!isWithinCharLimit(e.target.value, 150)) return
                                        setNewProperty({ ...newProperty, email: normalizeTextInput(e.target.value) })
                                    }}
                                />
                            </div>
                        </div>
                        {(mode === "add" || (mode === "edit" && !newProperty.address_line_1_office)) && (
                            <div className="flex items-center gap-3 pt-4">
                                <Switch
                                    checked={showOfficeFields}
                                    onCheckedChange={setShowOfficeFields}
                                />
                                <Label>Add corporate office address</Label>
                            </div>
                        )}

                        {showOfficeFields && (
                            <>
                                {/* Section Title */}
                                <div className="pt-2">
                                    <Label className="text-sm font-medium text-foreground">
                                        Corporate Office Address & Contact
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Corporate office communication details
                                    </p>
                                </div>

                                {/* Office Address */}
                                <div className="space-y-2">
                                    <Label>Office Address Line 1*</Label>
                                    <Input
                                        value={newProperty.address_line_1_office}
                                        onChange={(e) => {
                                            if (!isWithinCharLimit(e.target.value, 200)) return
                                            setNewProperty({
                                                ...newProperty,
                                                address_line_1_office: normalizeTextInput(e.target.value),
                                            })
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Office Address Line 2</Label>
                                    <Input
                                        value={newProperty.address_line_2_office}
                                        onChange={(e) => {
                                            if (!isWithinCharLimit(e.target.value, 200)) return
                                            setNewProperty({
                                                ...newProperty,
                                                address_line_2_office: normalizeTextInput(e.target.value),
                                            })
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>City*</Label>
                                        <Input
                                            value={newProperty.city_office}
                                            onChange={(e) => {
                                                if (!isWithinCharLimit(e.target.value, 100)) return
                                                setNewProperty({
                                                    ...newProperty,
                                                    city_office: normalizeTextInput(e.target.value),
                                                })
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>State*</Label>
                                        <Input
                                            value={newProperty.state_office}
                                            onChange={(e) => {
                                                if (!isWithinCharLimit(e.target.value, 100)) return
                                                setNewProperty({
                                                    ...newProperty,
                                                    state_office: normalizeTextInput(e.target.value),
                                                })
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Postal Code*</Label>
                                        <Input
                                            value={newProperty.postal_code_office}
                                            onChange={(e) => {
                                                if (!isWithinCharLimit(e.target.value, 20)) return
                                                setNewProperty({
                                                    ...newProperty,
                                                    postal_code_office: normalizeTextInput(e.target.value),
                                                })
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Country*</Label>
                                        <Input
                                            value={newProperty.country_office}
                                            onChange={(e) => {
                                                if (!isWithinCharLimit(e.target.value, 50)) return
                                                setNewProperty({
                                                    ...newProperty,
                                                    country_office: normalizeTextInput(e.target.value),
                                                })
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Phone*</Label>
                                        <Input
                                            value={newProperty.phone_office}
                                            onChange={(e) => e.target.value.trim().length <= 10 &&
                                                setNewProperty({
                                                    ...newProperty,
                                                    phone_office: normalizeTextInput(e.target.value.trim()),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Alternative Phone</Label>
                                        <Input
                                            value={newProperty.phone2_office}
                                            onChange={(e) => e.target.value.length <= 10 &&
                                                setNewProperty({
                                                    ...newProperty,
                                                    phone2_office: normalizeTextInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Office Email*</Label>
                                        <Input
                                            value={newProperty.email_office}
                                            onChange={(e) => {
                                                if (!isWithinCharLimit(e.target.value, 150)) return
                                                setNewProperty({
                                                    ...newProperty,
                                                    email_office: normalizeTextInput(e.target.value),
                                                })
                                            }}
                                        />
                                    </div>
                                </div>


                            </>
                        )}

                        <div className="flex items-center gap-3 pt-4">
                            <Switch
                                checked={hasBankDetails}
                                onCheckedChange={setHasBankDetails}
                            />
                            <Label>Add Bank Details</Label>
                            {hasBankDetails && <Button
                                size="sm"
                                variant="heroOutline"
                                onClick={addBankAccount}
                            >
                                + Add Account
                            </Button>}
                        </div>

                        {hasBankDetails && bankAccounts.map((bank, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border rounded-xl p-4"
                            >
                                <div>
                                    <Label>Account Holder Name</Label>
                                    <Input
                                        value={bank.account_holder_name}
                                        onChange={(e) =>
                                            updateBankField(index, "account_holder_name", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Account Number</Label>
                                    <Input
                                        value={bank.account_number}
                                        onChange={(e) =>
                                            updateBankField(index, "account_number", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>IFSC Code</Label>
                                    <Input
                                        value={bank.ifsc_code}
                                        onChange={(e) =>
                                            updateBankField(index, "ifsc_code", e.target.value.toUpperCase())
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Bank Name</Label>
                                    <Input
                                        value={bank.bank_name}
                                        onChange={(e) =>
                                            updateBankField(index, "bank_name", e.target.value)
                                        }
                                    />
                                </div>

                                {bankAccounts.length > 1 && (
                                    <div className="sm:col-span-2 flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removeBankAccount(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Timings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Check-in Time*</Label>
                                <Input type="time" value={newProperty.checkin_time}
                                    onChange={(e) => setNewProperty({ ...newProperty, checkin_time: normalizeTextInput(e.target.value) })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Check-out Time*</Label>
                                <Input type="time" value={newProperty.checkout_time}
                                    onChange={(e) => setNewProperty({ ...newProperty, checkout_time: normalizeTextInput(e.target.value) })} />
                            </div>
                        </div>

                        {/* Numbers */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            {/* <Input type="number" placeholder="Total Rooms"
                                onChange={(e) => setNewProperty({ ...newProperty, total_rooms: normalizeTextInput(e.target.value)})} /> */}
                            <div className="space-y-2">
                                <Label>Total Floors*</Label>
                                <Input
                                    type="text"
                                    disabled={mode === "edit"}
                                    min={1}
                                    value={newProperty.total_floors}
                                    onChange={(e) => {
                                        const value = normalizeNumberInput(e.target.value) || 0;
                                        syncFloors(value);
                                    }}
                                />

                            </div>
                            <div className="space-y-2">
                                <Label>GST %</Label>
                                <Input type="number" min={0} max={100} value={newProperty.gst}
                                    onChange={(e) => setNewProperty({ ...newProperty, gst: +normalizeTextInput(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Room Tax %</Label>
                                <Input type="number" min={0} max={100} value={newProperty.room_tax_rate}
                                    onChange={(e) => setNewProperty({ ...newProperty, room_tax_rate: +normalizeTextInput(e.target.value) })} />
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
                                            type="text"
                                            className="border-none"
                                            min={0}
                                            disabled={mode === "edit"}
                                            value={floor.total_rooms}
                                            onChange={(e) => {
                                                const value = Number(e.target.value) || 0;

                                                setNewProperty(prev => {
                                                    const floors = [...prev.floors];
                                                    floors[index] = {
                                                        ...floors[index],
                                                        total_rooms: normalizeNumberInput(value.toString()),
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
                                                disabled={mode === "edit"}
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
                            {mode === "add" && <Button
                                size="sm"
                                variant="heroOutline"
                                onClick={() => {
                                    syncFloors((newProperty.total_floors || 0) + 1);
                                }}
                            >
                                Add Floor
                            </Button>}
                            {mode === "edit" && <Button
                                size="sm"
                                variant="heroOutline"
                                onClick={() => {
                                    navigate("/property-rooms", {
                                        state: { propertyId: selectedProperty.id }
                                    })
                                }}
                            >
                                Manage Rooms
                            </Button>}
                        </div>


                        {/* Policies */}
                        {/* <div className="space-y-2">
                            <Label>Smoking Policy</Label>
                            <textarea
                                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                value={newProperty.smoking_policy}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, smoking_policy: normalizeTextInput(e.target.value) })
                                }
                            />
                        </div> */}

                        {/* <div className="space-y-2">
                            <Label>Cancellation Policy</Label>
                            <textarea
                                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                value={newProperty.cancellation_policy}
                                onChange={(e) =>
                                    setNewProperty({ ...newProperty, cancellation_policy: normalizeTextInput(e.target.value) })
                                }
                            />
                        </div> */}

                        {/* Toggles */}
                        {/* <div className="flex items-center gap-6">
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
                        </div> */}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancel
                            </Button>

                            {/* <Button
                                variant="ghost"
                                onClick={() => setNewProperty(originalProperty)}
                            >
                                Reset
                            </Button> */}

                            <Button
                                variant="hero"
                                onClick={handleSubmitProperty}
                                disabled={mode === "edit" && !isDirty}
                            >
                                {mode === "add" ? "Create Property" : "Save Changes"}
                            </Button>

                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

        </div>
    );
}

function PropertyStatusCell({ property, toggleActive, isUpdating }) {
    const [isActive, setIsActive] = useState(property.is_active);

    // Sync when parent data changes (important!)
    useEffect(() => {
        setIsActive(property.is_active);
    }, [property.is_active]);

    const debouncedIsActive = useDebounce(isActive, 0);

    useEffect(() => {
        if (debouncedIsActive !== property.is_active) {
            toggleActive(property.id, debouncedIsActive);
        }
    }, [debouncedIsActive]);

    return (
        <TableCell>
            <div className="flex items-center gap-2">
                <Switch
                    disabled={isUpdating}
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

