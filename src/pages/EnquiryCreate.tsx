import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import DatePicker from "react-datepicker";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAvailableRoomsQuery, useCreateEnquiryMutation, useGetMeQuery, useGetMyPropertiesQuery, useGetRoomTypesQuery } from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";

type AvailableRoom = {
    id: string;
    room_no: string;
    floor_number: number;
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
    base_price: string;
};

function groupRoomsByFloor(rooms: AvailableRoom[]) {
    if (!rooms) return []
    const map: Record<number, AvailableRoom[]> = {};

    rooms.forEach((room) => {
        if (!map[room.floor_number]) {
            map[room.floor_number] = [];
        }
        map[room.floor_number].push(room);
    });

    return Object.entries(map).map(([floor, rooms]) => ({
        floor: Number(floor),
        rooms,
    }));
}


type EnquiryForm = {
    property_id: string;
    guest_name: string;
    mobile: string;
    email: string;
    agent_name: string;
    room_type: string;
    no_of_rooms: number;
    check_in: string;
    check_out: string;
    follow_up_date: string;
    quote_amount: number;
    comment: string;
};

/* ---------------- Helpers ---------------- */
const parseDate = (v?: string) => (v ? new Date(v) : null);
const formatDate = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : "";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const isValidEmail = (email: string) =>
    EMAIL_REGEX.test(email.trim());

const isValidPhone = (phone: string) =>
    PHONE_REGEX.test(phone.trim());


/* ---------------- Component ---------------- */
export default function EnquiryCreate() {
    const [form, setForm] = useState<EnquiryForm>({
        property_id: "",
        guest_name: "",
        mobile: "",
        email: "",
        agent_name: "",
        room_type: "",
        no_of_rooms: 1,
        check_in: "",
        check_out: "",
        follow_up_date: "",
        quote_amount: 0,
        comment: "",
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: availableRooms, isLoading: availableRoomsLoading, isUninitialized: isAvailableRoomUninitialized } = useAvailableRoomsQuery({ propertyId: selectedPropertyId, arrivalDate: form.check_in, departureDate: form.check_out }, {
        skip: !isLoggedIn || !selectedPropertyId || !form.check_in || !form.check_out
        // || !!arrivalError || !!departureError
    })

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetMeQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: roomTypes, isLoading: roomTypesLoading, isUninitialized: roomTypesUninitialized } = useGetRoomTypesQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createEnquiry] = useCreateEnquiryMutation()

    const roomsByFloor = groupRoomsByFloor(availableRooms?.rooms);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (!data) return
        setForm({ ...form, agent_name: data?.user?.staff?.first_name + " " + data?.user?.staff?.last_name })
    }, [data])

    const todayISO = () => new Date().toISOString().split("T")[0];

    const nextDay = (date: string) => {
        if (!date) return todayISO();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    function validateEnquiryForm(form: EnquiryForm, propertyId: number | null) {
        if (!propertyId) {
            toast.error("Property is required");
            return false;
        }

        if (!form.guest_name.trim()) {
            toast.error("Guest name is required");
            return false;
        }

        if (!form.mobile.trim()) {
            toast.error("Mobile number is required");
            return false;
        }

        if (!isValidPhone(form.mobile)) {
            toast.error("Enter a valid 10-digit mobile number");
            return false;
        }

        if (!form.email) {
            toast.error("Email address is required");
            return false;
        }

        if (form.email && !isValidEmail(form.email)) {
            toast.error("Enter a valid email address");
            return false;
        }

        if (!form.check_in) {
            toast.error("Check-in date is required");
            return false;
        }

        if (!form.check_out) {
            toast.error("Check-out date is required");
            return false;
        }

        if (new Date(form.check_out) <= new Date(form.check_in)) {
            toast.error("Check-out must be after check-in");
            return false;
        }

        if (!form.room_type) {
            toast.error("Room type is required");
            return false;
        }

        if (!form.no_of_rooms || form.no_of_rooms < 1) {
            toast.error("At least 1 room is required");
            return false;
        }

        if (!form.quote_amount || form.quote_amount <= 0) {
            toast.error("Quote amount must be greater than 0");
            return false;
        }

        if (form.follow_up_date) {
            const followUp = new Date(form.follow_up_date);
            const now = new Date();
            if (followUp < now) {
                toast.error("Follow-up date cannot be in the past");
                return false;
            }
        }

        return true;
    }

    function buildEnquiryPayload(form: EnquiryForm) {

        if (!validateEnquiryForm(form, selectedPropertyId)) return;

        const payload = {
            property_id: selectedPropertyId,
            booking_id: null,
            guest_name: form.guest_name,
            mobile: form.mobile,
            email: form.email,
            source: "Walk-in",
            enquiry_type: "Room",
            status: "open",
            agent_name: form.agent_name,
            room_type: form.room_type,
            no_of_rooms: form.no_of_rooms,
            check_in: form.check_in,
            check_out: form.check_out,
            // booked_by: "Front Desk",
            comment: form.comment,
            follow_up_date: form.follow_up_date || undefined,
            quote_amount: form.quote_amount,
            is_reserved: false,
        };
        console.log("🚀 ~ buildEnquiryPayload ~ payload:", payload)
        const promise = createEnquiry(payload).unwrap()
        toast.promise(promise, {
            error: "Error creating enquiry",
            pending: "Creating enquiry, please wait",
            success: "Enquiry created"
        })
    }

    return (
        <div className="h-screen bg-background overflow-hidden">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 h-[calc(100vh-3.5rem)] grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
                {/* ================= LEFT ================= */}
                <section className="overflow-y-auto scrollbar-hide p-6 lg:p-8 border-r border-border">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left: Title */}
                        <div className="shrink-0">
                            <h1 className="text-2xl font-bold">New Enquiry</h1>
                            <p className="text-sm text-muted-foreground">
                                Capture guest enquiry
                            </p>
                        </div>

                        {/* Right: Property Dropdown */}
                        {(isSuperAdmin || isOwner) && (
                            <div className="w-full sm:w-64 space-y-1">
                                <Label className="text-xs">Property</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) =>
                                        setSelectedPropertyId(Number(e.target.value) || null)
                                    }
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
                    </div>

                    <div className="space-y-5 mt-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Guest Name*</Label>
                                <Input
                                    value={form.guest_name}
                                    onChange={(e) =>
                                        setForm({ ...form, guest_name: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Agent Name</Label>
                                <Input
                                    disabled
                                    value={form.agent_name}
                                    onChange={(e) =>
                                        setForm({ ...form, agent_name: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Mobile*</Label>
                                <Input
                                    value={form.mobile}
                                    onChange={(e) =>
                                        setForm({ ...form, mobile: e.target.value.slice(0, 10) })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Email*</Label>
                                <Input
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({ ...form, email: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Check-in*</Label>
                                <DatePicker
                                    selected={parseDate(form.check_in)}
                                    onChange={(d) =>
                                        setForm({ ...form, check_in: formatDate(d) })
                                    }
                                    placeholderText="dd-mm-yyyy"
                                    dateFormat="dd-MM-yyyy"
                                    customInput={<Input readOnly />}
                                    minDate={parseDate(todayISO())}
                                />
                            </div>

                            <div>
                                <Label>Check-out*</Label>
                                <DatePicker
                                    disabled={!form.check_in}
                                    selected={parseDate(form.check_out)}
                                    onChange={(d) =>
                                        setForm({ ...form, check_out: formatDate(d) })
                                    }
                                    placeholderText="dd-mm-yyyy"
                                    dateFormat="dd-MM-yyyy"
                                    customInput={<Input readOnly />}
                                    minDate={parseDate(nextDay(form.check_in) || todayISO())}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Room Type*</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                    value={form.room_type}
                                    onChange={(e) =>
                                        setForm({ ...form, room_type: e.target.value })
                                    }
                                    disabled={!(isSuperAdmin || isOwner)}
                                >
                                    <option value="" disabled>Room type</option>
                                    {!roomTypesLoading && !roomTypesUninitialized &&
                                        roomTypes?.map((type, i) => (
                                            <option key={type.id} value={type.room_category_name + " " + type.ac_type_name + " " + type.bed_type_name}>
                                                {type.room_category_name + " " + type.ac_type_name + " " + type.bed_type_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <Label>No of Rooms</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.no_of_rooms}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            no_of_rooms: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Quote Amount*</Label>
                                <Input
                                    type="text"
                                    value={form.quote_amount}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            quote_amount: +normalizeNumberInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Follow-up Date</Label>
                                <DatePicker
                                    selected={parseDate(form.follow_up_date)}
                                    onChange={(d) =>
                                        setForm({
                                            ...form,
                                            follow_up_date: d?.toISOString() || "",
                                        })
                                    }
                                    dateFormat="dd-MM-yyyy"
                                    customInput={<Input readOnly />}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Comments</Label>
                            <textarea
                                className="w-full min-h-[90px] rounded-xl border px-3 py-2 text-sm"
                                value={form.comment}
                                onChange={(e) =>
                                    setForm({ ...form, comment: e.target.value })
                                }
                            />
                        </div>

                        <div className="pt-4 border-t flex justify-end" onClick={() => {
                            buildEnquiryPayload(form)
                        }}>
                            <Button
                                variant="hero"
                                disabled={
                                    !form.guest_name ||
                                    !form.mobile ||
                                    !form.email ||
                                    !form.check_in ||
                                    !form.check_out ||
                                    !form.room_type ||
                                    !form.quote_amount
                                }
                            >
                                Create Enquiry
                            </Button>

                        </div>
                    </div>
                </section>

                {/* ================= RIGHT ================= */}
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Available Rooms
                    </h2>

                    {roomsByFloor.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No rooms available for selected dates
                        </p>
                    )}

                    <div className="space-y-6">
                        {roomsByFloor?.map(({ floor, rooms }) => (
                            <div key={floor}>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                    Floor {floor}
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="
                                                    aspect-square
                                                    rounded-xl
                                                    border
                                                    p-3
                                                    text-sm
                                                    bg-card
                                                    border-border
                                                    opacity-90
                                                "
                                        >
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                {/* <span className="font-semibold">
                                                    {room.room_no}
                                                </span> */}

                                                <span className="text-xs text-muted-foreground mt-1">
                                                    {room.room_category_name}
                                                </span>

                                                <span className="text-xs text-muted-foreground">
                                                    {room.ac_type_name}
                                                </span>

                                                <span className="text-xs text-muted-foreground">
                                                    {room.bed_type_name.slice(0, 8)}
                                                </span>

                                                <span className="text-xs font-medium text-primary mt-1">
                                                    ₹{room.base_price}/night
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}