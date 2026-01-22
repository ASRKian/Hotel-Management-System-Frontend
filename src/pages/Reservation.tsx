import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAddGuestsByBookingMutation, useAvailableRoomsQuery, useCreateBookingMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useGetPropertyTaxQuery, useUpdateEnquiryMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from 'react-datepicker'

/* -------------------- Types -------------------- */
type AvailableRoom = {
    id: string;
    room_no: string;
    ac_type_name: string;
    bed_type_name: string;
    room_category_name: string;
    floor_number: number;
};

type SelectedRoom = {
    ref_room_id: number;
};

type PropertyOption = {
    id: string;
    brand_name: string;
};

type PackageOption = {
    id: string;
    package_name: string;
};

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX =
    /^(?:\+91[-\s]?)?[6-9]\d{9}$/;

const isValidEmail = (email: string) =>
    EMAIL_REGEX.test(email.trim());

const isValidPhone = (phone: string) =>
    PHONE_REGEX.test(phone.trim());

/* -------------------- Component -------------------- */
export default function ReservationManagement() {
    /* -------- Booking Form State -------- */
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [packageId, setPackageId] = useState<number | null>(6);

    const [arrivalDate, setArrivalDate] = useState("");
    const [departureDate, setDepartureDate] = useState("");

    const [arrivalError, setArrivalError] = useState("");
    const [departureError, setDepartureError] = useState("");
    const isRoomCountManualChange = useRef(false);

    const [adult, setAdult] = useState<number | "">(1);
    const [child, setChild] = useState<number | "">("");
    const [guest, setGuest] = useState({
        id: "",
        temp_key: "",

        first_name: "",
        middle_name: "",
        last_name: "",

        phone: "",
        email: "",

        gender: "",
        dob: "",

        nationality: "",
        address: "",

        guest_type: "",

        id_type: "",
        id_number: "",
        has_id_proof: false,

        emergency_contact: "",
        emergency_contact_name: "",
    })
    const [comments, setComments] = useState("")
    const [advancePayment, setAdvancePayment] = useState<number | "">("")
    const [extraPerNight, setExtraPerNight] = useState<number | "">("")
    const [roomCount, setRoomCount] = useState<number | "">("");
    const [editableBasePrice, setEditableBasePrice] = useState<number | "">("");

    const [billingDetails, setBillingDetails] = useState({
        priceBeforeTax: 0,
        gstAmount: 0,
        roomTaxAmount: 0,
        discountAmount: 0,
        priceAfterTax: 0
    })

    const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
    const [discount, setDiscount] = useState<number | "">("");
    const [pickup, setPickup] = useState(false)
    const [drop, setDrop] = useState(false)

    const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)
    const [idProofFiles, setIdProofFiles] = useState<Record<string, File>>({});

    const enquiryPrefilled = useRef(false);

    const navigate = useNavigate()
    const location = useLocation();

    const enquiry = location.state?.enquiry;
    const fromEnquiry = location.state?.fromEnquiry;
    const enquiryId = location.state?.enquiryId;

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: packages, isLoading: packagesLoading, isUninitialized: packageUninitialized } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: availableRooms, isLoading: availableRoomsLoading, isUninitialized: isAvailableRoomUninitialized } = useAvailableRoomsQuery({ propertyId: selectedPropertyId, arrivalDate, departureDate }, {
        skip: !isLoggedIn || !selectedPropertyId || !arrivalDate || !departureDate || !!arrivalError || !!departureError
    })

    const { data: packageData } = useGetPackageByIdQuery({ packageId }, {
        skip: !packageId
    })

    const { data: propertyTax } = useGetPropertyTaxQuery(selectedPropertyId, {
        skip: !selectedPropertyId
    })

    const [createBooking, { isLoading: isBooking, data: bookingData, isSuccess: bookingSuccess, isUninitialized: bookingUninitialized, reset }] = useCreateBookingMutation()
    const [createGuest] = useAddGuestsByBookingMutation()
    const [updateEnquiry] = useUpdateEnquiryMutation()

    const validateReservation = () => {
        /* -------- Property & Package -------- */
        if (!selectedPropertyId) {
            toast.error("Property is required");
            return false;
        }

        if (!packageId) {
            toast.error("Package is required");
            return false;
        }

        /* -------- Dates -------- */
        if (!arrivalDate) {
            toast.error("Arrival date is required");
            return false;
        }

        if (!departureDate) {
            toast.error("Departure date is required");
            return false;
        }

        if (arrivalError || departureError) {
            toast.error("Please fix date errors");
            return false;
        }

        /* -------- Rooms & Guests -------- */
        if (!adult || adult < 1) {
            toast.error("At least one adult is required");
            return false;
        }

        if (selectedRooms.length === 0) {
            toast.error("Select at least one room");
            return false;
        }

        /* -------- Guest Fields -------- */
        const requiredGuestFields: { key: keyof typeof guest; label: string }[] = [
            { key: "first_name", label: "First name" },
            // { key: "last_name", label: "Last name" },
            { key: "gender", label: "Gender" },
            { key: "dob", label: "Date of birth" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "nationality", label: "Nationality" },
            { key: "address", label: "Address" },
            { key: "id_type", label: "ID type" },
            { key: "id_number", label: "ID number" },
            { key: "emergency_contact_name", label: "Emergency contact name" },
            { key: "emergency_contact", label: "Emergency contact number" },
        ];

        for (const field of requiredGuestFields) {
            if (!guest[field.key]?.toString().trim()) {
                toast.error(`${field.label} is required`);
                return false;
            }
        }

        /* -------- Email -------- */
        if (!isValidEmail(guest.email)) {
            toast.error("Please enter a valid email address");
            return false;
        }

        /* -------- Phone -------- */
        if (!isValidPhone(guest.phone)) {
            toast.error("Please enter a valid phone number");
            return false;
        }

        /* -------- Emergency Contact -------- */
        if (!isValidPhone(guest.emergency_contact)) {
            toast.error("Please enter a valid emergency contact number");
            return false;
        }


        /* -------- ID Proof -------- */
        if (!idProofFiles["0"]) {
            toast.error("ID proof is required");
            return false;
        }

        return true;
    };


    async function submitReservation() {
        if (!validateReservation()) return;

        const payload = {
            property_id: selectedPropertyId,
            package_id: packageId,
            booking_type: "WALK_IN",
            booking_status: "CONFIRMED",
            booking_date: new Date().toISOString().slice(0, 10),
            estimated_arrival: arrivalDate,
            estimated_departure: departureDate,
            adult,
            child: child || 0,
            discount_type: discountType,
            discount,
            rooms: selectedRooms,
            price_before_tax: billingDetails.priceBeforeTax,
            discount_amount: billingDetails.discountAmount,
            price_after_discount: billingDetails.priceBeforeTax - billingDetails.discountAmount,
            gst_amount: billingDetails.gstAmount,
            room_tax_amount: billingDetails.roomTaxAmount,
            comments,
            drop,
            pickup
        };

        const promise = createBooking(payload).unwrap()

        await toast.promise(promise, {
            pending: "Confirming your booking...",
            success: "Booking confirm",
            error: "Error creating booking"
        })

        const { booking } = await promise
        const { id } = booking

        fromEnquiry && updateEnquiry({
            id: enquiryId,
            payload: { status: "booked", is_reserved: true, booking_id: id }
        });

        resetForm()
    }

    /* -------------------- Derived -------------------- */
    const roomsByFloor = useMemo(() => {
        if (availableRoomsLoading || isAvailableRoomUninitialized) return []
        const map: Record<number, AvailableRoom[]> = {};
        availableRooms?.rooms?.forEach((room) => {
            if (!map[room.floor_number]) map[room.floor_number] = [];
            map[room.floor_number].push(room);
        });
        return Object.entries(map).map(([floor, rooms]) => ({
            floor: Number(floor),
            rooms,
        }));
    }, [availableRooms, availableRoomsLoading, isAvailableRoomUninitialized]);

    const allAvailableRoomIds = useMemo(() => {
        if (!availableRooms?.rooms) return [];
        return availableRooms.rooms.map((r: any) => Number(r.id));
    }, [availableRooms]);

    const todayISO = () => new Date().toISOString().split("T")[0];
    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    useEffect(() => {
        if (!isRoomCountManualChange.current) return;
        if (roomCount === "") return;
        if (allAvailableRoomIds.length === 0) return;

        const shuffled = [...allAvailableRoomIds].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, roomCount);

        setSelectedRooms(selected.map((id) => ({ ref_room_id: id })));

        // reset flag
        isRoomCountManualChange.current = false;
    }, [roomCount, allAvailableRoomIds]);

    useEffect(() => {
        if (selectedPropertyId && arrivalDate && departureDate) {
            setSelectedRooms([]);
            setRoomCount("");
        }
    }, [selectedPropertyId, arrivalDate, departureDate]);

    const toggleRoom = (roomId: number) => {
        setSelectedRooms((prev) => {
            let updated: SelectedRoom[];

            if (prev.some((r) => r.ref_room_id === roomId)) {
                updated = prev.filter((r) => r.ref_room_id !== roomId);
            } else {
                updated = [...prev, { ref_room_id: roomId }];
            }

            setRoomCount(updated.length || "");

            return updated;
        });
    };

    const isAfter = (a: string, b: string) => {
        if (!a || !b) return true;
        return new Date(a) > new Date(b);
    };

    const handleArrivalChange = (value: string) => {
        setArrivalDate(value);

        if (value < todayISO()) {
            setArrivalError("Arrival date cannot be in the past");
        } else {
            setArrivalError("");
        }

        if (departureDate && !isAfter(departureDate, value)) {
            setDepartureError("Departure must be after arrival date");
        } else {
            setDepartureError("");
        }
    };

    const handleDepartureChange = (value: string) => {
        setDepartureDate(value);

        if (!arrivalDate) {
            setDepartureError("Select arrival date first");
        } else if (!isAfter(value, arrivalDate)) {
            setDepartureError("Departure must be after arrival date");
        } else {
            setDepartureError("");
        }
    };

    const nextDay = (date: string) => {
        if (!date) return todayISO();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    const getNights = (arrival: string, departure: string) => {
        if (!arrival || !departure) return 0;
        const start = new Date(arrival);
        const end = new Date(departure);
        const diffTime = end.getTime() - start.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const parseDate = (value?: string) =>
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) =>
        date ? date.toISOString().slice(0, 10) : "";


    /* -------------------- Effects -------------------- */
    useEffect(() => {
        if (selectedPropertyId && arrivalDate && departureDate) {
            setSelectedRooms([]);
        }
    }, [selectedPropertyId, arrivalDate, departureDate]);


    useEffect(() => {
        if (!selectedPropertyId) {
            setPackageId(null);
            return;
        }
        setSelectedRooms([]);
    }, [selectedPropertyId]);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    const roomBasePriceMap = useMemo(() => {
        const map = new Map<number, number>();

        availableRooms?.rooms?.forEach((room: any) => {
            map.set(Number(room.id), Number(room.base_price) || 0);
        });

        return map;
    }, [availableRooms]);

    useEffect(() => {
        if (!packageData || !propertyTax || !arrivalDate || !departureDate) return;

        const basePrice = Number(editableBasePrice) || 0;
        const extras = Number(extraPerNight) || 0;
        const { gst, room_tax_rate } = propertyTax;

        const nights = getNights(arrivalDate, departureDate);
        const roomBaseTotal = selectedRooms.reduce((sum, room) => {
            return sum + (roomBasePriceMap.get(room.ref_room_id) || 0);
        }, 0);


        // const priceBeforeTax =
        //     ((roomBaseTotal || basePrice * selectedRooms.length) + extras * selectedRooms.length)
        //     * nights;

        // const priceBeforeTax =
        //     (roomBaseTotal + basePrice + extras * selectedRooms.length) * nights;
        const priceBeforeTax = roomBaseTotal * nights + (basePrice + extras) * nights * +adult

        let discountedPrice = priceBeforeTax;

        if (discountType === "FLAT") {
            discountedPrice = priceBeforeTax - (Number(discount) || 0);
        } else {
            discountedPrice =
                (priceBeforeTax * (100 - (Number(discount) || 0))) / 100;
        }

        const discountAmount = priceBeforeTax - discountedPrice;
        const gstAmount = (discountedPrice * gst) / 100;
        const roomTaxAmount = (discountedPrice * room_tax_rate) / 100;

        setBillingDetails({
            priceBeforeTax,
            discountAmount,
            gstAmount,
            roomTaxAmount,
            priceAfterTax: discountedPrice + gstAmount + roomTaxAmount,
        });
    }, [
        packageData,
        propertyTax,
        arrivalDate,
        departureDate,
        selectedRooms,
        extraPerNight,
        discount,
        discountType,
        editableBasePrice,
        adult
    ]);

    useEffect(() => {
        if (packageData?.data?.base_price != null) {
            setEditableBasePrice(Number(packageData.data.base_price));
        }
    }, [packageData]);

    const resetForm = () => {
        setArrivalDate("");
        setDepartureDate("");
        setArrivalError("");
        setDepartureError("");

        setAdult(1);
        setChild("");

        setDiscount("");
        setDiscountType("PERCENT");

        setSelectedRooms([]);

        setBillingDetails({
            priceBeforeTax: 0,
            gstAmount: 0,
            roomTaxAmount: 0,
            discountAmount: 0,
            priceAfterTax: 0
        });
    };

    useEffect(() => {
        (async () => {
            if (!bookingData || !bookingSuccess) return
            const bookingId = bookingData?.booking?.id
            if (!bookingId) return

            const formData = new FormData();

            formData.append("guests", JSON.stringify([{ ...guest, guest_type: "ADULT", temp_key: "0" }]));

            const idProofMap: Record<string, number> = {};
            let index = 0;

            Object.entries(idProofFiles).forEach(([key, file]) => {
                formData.append("id_proofs", file);
                idProofMap[key] = index++;
            });

            formData.append("id_proof_map", JSON.stringify(idProofMap));

            await createGuest({ formData, bookingId }).unwrap()

            // navigate("/guests", {
            //     state: {
            //         bookingId: bookingData?.booking?.id,
            //         guestCount: bookingData?.booking?.adult
            //     }
            // })
            navigate("/bookings")
            reset()
        })()

    }, [isBooking, bookingData, bookingSuccess])

    useEffect(() => {
        if (!fromEnquiry || !enquiry || enquiryPrefilled.current) return;

        enquiryPrefilled.current = true;

        // 🔹 Property
        if (enquiry.property_id) {
            setSelectedPropertyId(Number(enquiry.property_id));
        }

        // 🔹 Dates
        if (enquiry.check_in) {
            setArrivalDate(enquiry.check_in);
        }

        if (enquiry.check_out) {
            setDepartureDate(enquiry.check_out);
        }

        // 🔹 Guest info
        setGuest((prev) => ({
            ...prev,
            first_name: enquiry.guest_name?.split(" ")[0] || "",
            last_name: enquiry.guest_name?.split(" ").slice(1).join(" ") || "",
            phone: enquiry.mobile || "",
            email: enquiry.email || "",
        }));

        // 🔹 Rooms count (not selecting rooms)
        if (enquiry.no_of_rooms) {
            setRoomCount(Number(enquiry.no_of_rooms));
        }

        // 🔹 Comments
        if (enquiry.comment) {
            setComments(enquiry.comment);
        }

        // 🔹 Quote → advance payment (optional logic)
        if (enquiry.quote_amount) {
            setAdvancePayment(Number(enquiry.quote_amount));
        }

        // 🔹 Mark enquiry-origin booking
        setComments((prev) =>
            prev
                ? `${prev}\n(Generated from enquiry #${enquiry.id})`
                : `Generated from enquiry #${enquiry.id}`
        );

    }, [fromEnquiry, enquiry]);

    const handleFile = (key: string, file?: File) => {
        if (!file) return;
        setIdProofFiles((p) => ({ ...p, [key]: file }));
    };

    /* -------------------- UI -------------------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] flex-1 overflow-hidden">

                    {/* =================== BOOKING FORM =================== */}
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 border-r border-border">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-foreground">New Booking</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create a direct booking.
                            </p>
                        </div>
                        {fromEnquiry && (
                            <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                               Creating booking from enquiry
                                {/* #{enquiry?.id} */}
                            </div>
                        )}

                        <div className="space-y-6">

                            {/* Property & Package */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(isSuperAdmin || isOwner) && < div className="space-y-2">
                                    <Label>Property</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={selectedPropertyId ?? ""}
                                        onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                        disabled={!(isSuperAdmin || isOwner)}
                                    >
                                        <option value="">Select property</option>
                                        {!myPropertiesLoading &&
                                            myProperties?.properties?.map((property) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>}

                                <div className="space-y-2">
                                    <Label>Package</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={packageId ?? ""}
                                        onChange={(e) => setPackageId(Number(e.target.value) || null)}
                                        disabled={!selectedPropertyId}
                                    >
                                        <option value="">Select package</option>
                                        {!packageUninitialized && !packagesLoading && packages?.packages.map((pkg) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.package_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* first and last name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name*</Label>
                                    <Input disabled={isBooking} value={guest.first_name} onChange={(e) => setGuest(prev => ({ ...prev, first_name: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input disabled={isBooking} value={guest.last_name} onChange={(e) => setGuest(prev => ({ ...prev, last_name: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender*</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={guest.gender}
                                        onChange={(e) => setGuest(prev => ({ ...prev, gender: e.target.value }))}
                                        disabled={!selectedPropertyId}
                                    >
                                        <option value="" disabled>Select gender</option>
                                        <option value={"MALE"}>Male</option>
                                        <option value={"FEMALE"}>Female</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of birth</Label>
                                    <DatePicker
                                        selected={parseDate(guest.dob)}
                                        placeholderText="dd-MM-yyyy"
                                        onChange={(date) => {
                                            setGuest(prev => ({ ...prev, dob: formatDate(date) }))
                                        }}
                                        // onChangeRaw={(e) => e.preventDefault()}
                                        dateFormat="dd-MM-yyyy"
                                        // maxDate={toDate ? new Date(toDate) : undefined}
                                        customInput={
                                            <Input readOnly />
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone*</Label>
                                    <Input disabled={isBooking} value={guest.phone} onChange={(e) => e.target.value.length <= 10 && setGuest(prev => ({ ...prev, phone: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email*</Label>
                                    <Input disabled={isBooking} value={guest.email} onChange={(e) => setGuest(prev => ({ ...prev, email: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nationality*</Label>
                                    <Input disabled={isBooking} value={guest.nationality} onChange={(e) => setGuest(prev => ({ ...prev, nationality: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Address*</Label>
                                    <Input disabled={isBooking} value={guest.address} onChange={(e) => setGuest(prev => ({ ...prev, address: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ID Type*</Label>
                                    <Input disabled={isBooking} value={guest.id_type} onChange={(e) => setGuest(prev => ({ ...prev, id_type: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ID Number*</Label>
                                    <Input disabled={isBooking} value={guest.id_number} onChange={(e) => setGuest(prev => ({ ...prev, id_number: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ID Proof*</Label>
                                    <Input
                                        disabled={isBooking}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleFile("0", e.target.files?.[0])
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emergency Contact Name*</Label>
                                    <Input disabled={isBooking} value={guest.emergency_contact_name} onChange={(e) => setGuest(prev => ({ ...prev, emergency_contact_name: normalizeTextInput(e.target.value) }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emergency Contact Number*</Label>
                                    <Input disabled={isBooking} value={guest.emergency_contact} onChange={(e) => e.target.value.length <= 10 && setGuest(prev => ({ ...prev, emergency_contact: normalizeTextInput(e.target.value) }))} />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Arrival Date</Label>
                                    {/* <Input disabled={isBooking} type="date" value={arrivalDate} min={todayISO()} onChange={(e) => handleArrivalChange(e.target.value)} /> */}
                                    <DatePicker
                                        selected={parseDate(arrivalDate)}
                                        placeholderText="dd-mm-yyyy"
                                        onChange={(date) => {
                                            handleArrivalChange(formatDate(date));
                                        }}
                                        minDate={parseDate(todayISO())}
                                        // onChangeRaw={(e) => e.preventDefault()}
                                        dateFormat="dd-MM-yyyy"
                                        // maxDate={toDate ? new Date(toDate) : undefined}
                                        customInput={
                                            <Input readOnly />
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Departure Date</Label>
                                    {/* <Input type="date" disabled={!arrivalDate || isBooking} value={departureDate} min={nextDay(arrivalDate) || todayISO()} onChange={(e) => handleDepartureChange(e.target.value)} /> */}
                                    <DatePicker
                                        selected={parseDate(departureDate)}
                                        placeholderText="dd-mm-yyyy"
                                        onChange={(date) => {
                                            handleDepartureChange(formatDate(date));
                                        }}
                                        onChangeRaw={(e) => e.preventDefault()}
                                        dateFormat="dd-MM-yyyy"
                                        minDate={parseDate(nextDay(arrivalDate) || todayISO())}
                                        disabled={!arrivalDate}
                                        customInput={
                                            <Input readOnly />
                                        }
                                    />
                                </div>
                            </div>

                            {/* Guests */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Adults</Label>
                                    <Input disabled={isBooking} type="number" min={1} value={adult} onChange={(e) => setAdult(normalizeNumberInput(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Children</Label>
                                    <Input disabled={isBooking} type="number" min={0} value={child} onChange={(e) => setChild(normalizeNumberInput(e.target.value))} />
                                </div>
                            </div>

                            {/* extras and advanced payment */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Extras per night</Label>
                                    <Input disabled={isBooking} type="number" min={0} value={extraPerNight} onChange={(e) => setExtraPerNight(normalizeNumberInput(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Advance Payment</Label>
                                    <Input disabled={isBooking} type="number" min={0} value={advancePayment} onChange={(e) => setAdvancePayment(normalizeNumberInput(e.target.value))} />
                                </div>
                            </div>


                            {/* Discount */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as any)}
                                    >
                                        <option value="PERCENT">Percent (%)</option>
                                        <option value="FLAT">Flat</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Discount</Label>
                                    <Input type="number" disabled={isBooking} min={0} value={discount} onChange={(e) => setDiscount(normalizeNumberInput(e.target.value))} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={pickup}
                                        onCheckedChange={setPickup}
                                    />
                                    <Label>{"Pickup"}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={drop}
                                        onCheckedChange={setDrop}
                                    />
                                    <Label>{"Drop"}</Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Comments</Label>
                                <textarea
                                    className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    value={comments}
                                    onChange={(e) => setComments(normalizeTextInput(e.target.value))}
                                />
                            </div>

                            {
                                <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Billing Summary
                                    </h3>

                                    <div className="space-y-1 text-sm">
                                        {/* <div className="flex justify-between items-center text-muted-foreground gap-2">
                                            <span>Package Base Price</span>

                                            <div className="flex items-center gap-1">
                                                <span>₹</span>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8 text-right"
                                                    min={0}
                                                    value={editableBasePrice}
                                                    onChange={(e) =>
                                                        setEditableBasePrice(normalizeNumberInput(e.target.value))
                                                    }
                                                />
                                            </div>
                                        </div> */}
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Package Price</span>
                                            <span>₹{packageData?.data?.base_price || 0}</span>
                                        </div>


                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Extra per night</span>
                                            <span>₹{extraPerNight || 0}</span>
                                        </div>

                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Total Base Price</span>
                                            <span>₹{billingDetails.priceBeforeTax.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Discount</span>
                                            <span>- ₹{billingDetails.discountAmount.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between text-muted-foreground">
                                            <span>GST</span>
                                            <span>{propertyTax?.gst}% (₹{billingDetails.gstAmount.toFixed(2)})</span>
                                        </div>

                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Room Tax</span>
                                            <span>{propertyTax?.room_tax_rate}% (₹{billingDetails.roomTaxAmount.toFixed(2)})</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-border flex justify-between font-semibold text-foreground">
                                        <span>Total Payable</span>
                                        <span>₹{billingDetails.priceAfterTax.toFixed(2)}</span>
                                    </div>
                                </div>
                            }


                            {/* Submit */}
                            <div className="pt-4 border-t border-border flex justify-end">
                                <Button variant="hero" disabled={isBooking ||
                                    !selectedPropertyId ||
                                    !packageId ||
                                    !arrivalDate ||
                                    !departureDate ||
                                    selectedRooms.length === 0 ||
                                    +adult < 1} onClick={submitReservation}>
                                    Confirm Booking
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* =================== AVAILABLE ROOMS =================== */}
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 bg-muted/20">

                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Available Rooms
                        </h2>

                        <div className="space-y-2 mb-4">
                            <Label>Select Number of Rooms</Label>
                            <select
                                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                                value={roomCount}
                                onChange={(e) => {
                                    isRoomCountManualChange.current = true;
                                    setRoomCount(e.target.value ? Number(e.target.value) : "");
                                }}

                                disabled={allAvailableRoomIds.length === 0}
                            >
                                <option value="">Select rooms</option>
                                {Array.from(
                                    { length: allAvailableRoomIds.length },
                                    (_, i) => i + 1
                                ).map((count) => (
                                    <option key={count} value={count}>
                                        {count}
                                    </option>
                                ))}
                            </select>
                        </div>


                        {roomsByFloor.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {(arrivalError || departureError) ? "Departure date should be greater than arrival date" : !availableRoomsLoading ? "No available rooms on selected dates" : "Select dates to see available rooms."}
                            </p>
                        )}

                        <div className="space-y-6">
                            {roomsByFloor.map(({ floor, rooms }) => (
                                <div key={floor}>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                        Floor {floor}
                                    </h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {rooms.map((room) => {
                                            const isSelected = selectedRooms.some(
                                                (r) => r.ref_room_id === Number(room.id)
                                            );

                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => toggleRoom(Number(room.id))}
                                                    className={cn(
                                                        "aspect-square rounded-xl border p-3 text-sm font-semibold transition",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-card border-border hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <span>{room.room_no}</span>
                                                        <span className="text-xs opacity-70">
                                                            {room.room_category_name}
                                                        </span>
                                                        <span className="text-xs opacity-70">
                                                            {room.ac_type_name}
                                                        </span>
                                                        <span className="text-xs opacity-70">
                                                            {room.bed_type_name.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </main >
        </div >
    );
}