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
import { useAddGuestsByBookingMutation, useAvailableRoomsQuery, useCreateBookingMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useGetPropertyTaxQuery, useGetRoomTypesQuery, useUpdateEnquiryMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from 'react-datepicker'
import countries from '../utils/countries.json'

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

    const todayISO = () => new Date().toISOString().split("T")[0];
    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    };

    /* -------- Booking Form State -------- */
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [packageId, setPackageId] = useState<number | null>(6);

    const [arrivalDate, setArrivalDate] = useState(todayISO());
    const [departureDate, setDepartureDate] = useState(tomorrowISO());

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
        country: "",

        address: "",

        guest_type: "ADULT",

        id_type: "Aadhaar Card",
        id_number: "",

        // for "Other" ID
        other_id_type: "",

        // visa (foreigner only)
        visa_number: "",
        visa_issue_date: "",
        visa_expiry_date: "",

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
    const [availableRoomCategory, setAvailableRoomCategory] = useState([])
    const [availableBedType, setAvailableBedType] = useState([])
    const [roomFilters, setRoomFilters] = useState({
        roomCategory: "",
        bedType: "",
        acType: "AC",
        floor: ""
    })
    const [floors, setFloors] = useState([])

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

    const { data: roomTypes, isLoading: roomTypesLoading, isUninitialized: roomTypesUninitialized } = useGetRoomTypesQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
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

        if (guest.nationality === "foreigner") {
            if (!guest.country?.trim()) {
                toast.error("Country is required for foreign guest");
                return false;
            }

            if (!guest.visa_number?.trim()) {
                toast.error("Visa number is required for foreign guest");
                return false;
            }

            if (!guest.visa_issue_date) {
                toast.error("Visa issue date is required");
                return false;
            }

            if (!guest.visa_expiry_date) {
                toast.error("Visa expiry date is required");
                return false;
            }

            if (new Date(guest.visa_expiry_date) <= new Date()) {
                toast.error("Visa is expired");
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
        if (arrivalDate < todayISO()) {
            toast.error("arrival day is greater than today")
            return
        }

        const acText = `User chose ${roomFilters.acType} room`;
        let acTypeComment = ""
        if (!comments || comments.trim() === "") {
            acTypeComment = acText;
        } else {
            acTypeComment = `${comments}\n${acText}`;
        }


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
            comments: acTypeComment,
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

    useEffect(() => {
        if (!availableRooms || !availableRooms.rooms) {
            setAvailableBedType([])
            setAvailableRoomCategory([])
            return
        }

        const availableRoomCategory = availableRooms.rooms.map((room) => room.room_category_name)
        const availableBedType = availableRooms.rooms.map((room) => room.bed_type_name)
        const availableFloors = availableRooms.rooms.map((room) => room.floor_number)
        setAvailableBedType(() => Array.from(new Set(availableBedType)))
        setAvailableRoomCategory(() => Array.from(new Set(availableRoomCategory)))
        setFloors(() => Array.from(new Set(availableFloors)))
    }, [availableRooms])

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

    useEffect(() => {
        const updateDatesIfDayChanged = () => {
            const today = todayISO();
            const tomorrow = tomorrowISO();

            setArrivalDate(prev => {
                if (!prev || prev < today) return today;
                return prev;
            });

            setDepartureDate(prev => {
                if (!prev || prev < tomorrow) return tomorrow;
                return prev;
            });
        };

        const interval = setInterval(updateDatesIfDayChanged, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

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

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;   // local timezone safe
    };



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

        const selectedRoomTypes = selectedRooms.map((room) => availableRooms?.rooms.find(x => x.id == room.ref_room_id))
        const roomBaseTotal = selectedRoomTypes.reduce((sum, selRoom) => {
            const matchedType = roomTypes.find(rt =>
                rt.room_category_name === selRoom.room_category_name &&
                rt.bed_type_name === selRoom.bed_type_name &&
                rt.ac_type_name === roomFilters.acType
            );

            if (!matchedType) return sum;

            return sum + Number(matchedType.base_price || 0);
        }, 0);

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
        adult,
        roomFilters.acType
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

            const normalizedGuest = {
                ...guest,
                id_type:
                    guest.id_type === ""
                        ? guest.other_id_type
                        : guest.id_type,

                // auto-null visa if not foreigner
                visa_number: guest.nationality === "foreigner" ? guest.visa_number : null,
                visa_issue_date: guest.nationality === "foreigner" ? guest.visa_issue_date : null,
                visa_expiry_date: guest.nationality === "foreigner" ? guest.visa_expiry_date : null,
            };


            formData.append("guests", JSON.stringify([{ ...normalizedGuest, guest_type: "ADULT", temp_key: "0" }]));

            const idProofMap: Record<string, number> = {};
            let index = 0;

            Object.entries(idProofFiles).forEach(([key, file]) => {
                formData.append("id_proofs", file);
                idProofMap[key] = index++;
            });

            formData.append("id_proof_map", JSON.stringify(idProofMap));

            await createGuest({ formData, bookingId }).unwrap()
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

    function getFloorName(floor: number): string {
        if (floor === 0) return "G|F";

        const romanMap: { value: number; symbol: string }[] = [
            { value: 1000, symbol: "M" },
            { value: 900, symbol: "CM" },
            { value: 500, symbol: "D" },
            { value: 400, symbol: "CD" },
            { value: 100, symbol: "C" },
            { value: 90, symbol: "XC" },
            { value: 50, symbol: "L" },
            { value: 40, symbol: "XL" },
            { value: 10, symbol: "X" },
            { value: 9, symbol: "IX" },
            { value: 5, symbol: "V" },
            { value: 4, symbol: "IV" },
            { value: 1, symbol: "I" },
        ];

        let num = floor;
        let roman = "";

        for (const { value, symbol } of romanMap) {
            while (num >= value) {
                roman += symbol;
                num -= value;
            }
        }

        return `${roman}|F`;
    }

    /* -------------------- UI -------------------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] flex-1 overflow-hidden">

                    {/* =================== BOOKING FORM =================== */}
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-4 border-r border-border">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-foreground">New Booking</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create a direct booking.
                            </p>
                        </div>
                        {fromEnquiry && (
                            <div className="mb-4 rounded-[3px] bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                                Creating booking from enquiry
                            </div>
                        )}

                        <div className="space-y-3">


                            <CardSection title="Basic Booking Details" subtitle="Package, stay duration and guests">
                                <Grid>
                                    {(isSuperAdmin || isOwner) && <Field label="Property">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
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
                                    </Field>}
                                    <Field label="Package">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
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
                                    </Field>
                                    <Field label="AC Type">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                            value={roomFilters.acType}
                                            onChange={(e) => setRoomFilters({ ...roomFilters, acType: e.target.value })}
                                        >
                                            <option value="AC" >AC</option>
                                            <option value="Non-AC" >Non-AC</option>
                                        </select>
                                    </Field>
                                    <Field label="Arrival Date*">
                                        <div className="block">
                                            <DatePicker
                                                className="bg-white"
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
                                    </Field>
                                    <Field label="Departure Date*">
                                        <div className="block">
                                            <DatePicker
                                                className="bg-white"
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
                                    </Field>
                                    <Field label="Adults">
                                        <Input className="bg-white" disabled={isBooking} type="number" min={1} value={adult} onChange={(e) => setAdult(normalizeNumberInput(e.target.value))} />
                                    </Field>
                                    <Field label="Children">
                                        <Input disabled={isBooking} className="bg-white" type="number" min={0} value={child} onChange={(e) => setChild(normalizeNumberInput(e.target.value))} />
                                    </Field>
                                </Grid>
                            </CardSection>

                            <CardSection title="Guest Personal Information" subtitle="Primary guest identity">
                                <Grid>
                                    <Field label="First Name*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.first_name} onChange={(e) => setGuest(prev => ({ ...prev, first_name: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="Last Name">
                                        <Input className="bg-white" disabled={isBooking} value={guest.last_name} onChange={(e) => setGuest(prev => ({ ...prev, last_name: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="Gender*">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                            value={guest.gender}
                                            onChange={(e) => setGuest(prev => ({ ...prev, gender: e.target.value }))}
                                            disabled={!selectedPropertyId}
                                        >
                                            <option value="" disabled>Select gender</option>
                                            <option value={"MALE"}>Male</option>
                                            <option value={"FEMALE"}>Female</option>
                                        </select>
                                    </Field>
                                    <Field label="Date of birth*">
                                        <div className="block">
                                            <DatePicker
                                                className="bg-white"
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
                                    </Field>
                                    <Field label="Nationality*">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                            value={guest.nationality}
                                            onChange={(e) => setGuest(prev => ({ ...prev, nationality: e.target.value }))}
                                        >
                                            <option value="">Select nationality</option>
                                            <option value="indian">Indian</option>
                                            <option value="non_res_indian">Non Resident Indian</option>
                                            <option value="foreigner">Foreigner</option>
                                        </select>
                                    </Field>
                                    {guest.nationality === "foreigner" &&
                                        <Field label="Country*">
                                            <select
                                                className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                                value={guest.country || ""}
                                                onChange={(e) => setGuest(prev => ({ ...prev, country: e.target.value }))}
                                            >
                                                {
                                                    countries.map((country, i) => {
                                                        return <option value={country} key={i}>{country}</option>
                                                    })
                                                }

                                            </select>
                                        </Field>}
                                    <Field label="Phone*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.phone} onChange={(e) => e.target.value.length <= 10 && setGuest(prev => ({ ...prev, phone: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="Email*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.email} onChange={(e) => setGuest(prev => ({ ...prev, email: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                </Grid>
                            </CardSection>

                            <CardSection title="Address & Identification" subtitle="Verification details">
                                <Grid>
                                    <Field label="Address*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.address} onChange={(e) => setGuest(prev => ({ ...prev, address: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="ID Type*">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                            value={guest.id_type || (guest.other_id_type ? "Other" : "")}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "Other") {
                                                    setGuest(prev => ({ ...prev, id_type: "" }));
                                                } else {
                                                    setGuest(prev => ({ ...prev, id_type: value, other_id_type: "" }));
                                                }
                                            }}
                                        >
                                            <option value="Aadhaar Card">Aadhaar Card</option>
                                            <option value="APAAR Id">APAAR Id</option>
                                            <option value="Driving License">Driving License</option>
                                            <option value="PAN Card">PAN Card</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Voter ID">Voter ID</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </Field>
                                    {guest.id_type === "" && <Field label="Other Id type*">
                                        <Input
                                            className="bg-white"
                                            placeholder="Enter ID proof type"
                                            value={guest.other_id_type}
                                            onChange={(e) =>
                                                setGuest(prev => ({ ...prev, other_id_type: normalizeTextInput(e.target.value) }))
                                            }
                                        />
                                    </Field>}
                                    <Field label="ID Number*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.id_number} onChange={(e) => setGuest(prev => ({ ...prev, id_number: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="ID Proof*">
                                        <Input
                                            className="bg-white"
                                            disabled={isBooking}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleFile("0", e.target.files?.[0])
                                            }
                                        />
                                    </Field>


                                    {/* Foreigner Only */}
                                    {guest.nationality === "foreigner" && <>
                                        <Field label="Visa Number*">
                                            <Input
                                                className="bg-white"
                                                placeholder="Visa Number"
                                                value={guest.visa_number}
                                                onChange={(e) => setGuest(prev => ({ ...prev, visa_number: e.target.value }))}
                                            />

                                        </Field>
                                        <Field label="Visa Issue Date*">
                                            <DatePicker
                                                className="bg-white"
                                                placeholderText="dd-mm-yyyy"
                                                selected={parseDate(guest.visa_issue_date)}
                                                onChange={(d) => setGuest(prev => ({ ...prev, visa_issue_date: formatDate(d) }))}
                                                customInput={<Input readOnly />}
                                            />
                                        </Field>
                                        <Field label="Visa Expiry Date*">
                                            <DatePicker
                                                className="bg-white"
                                                placeholderText="dd-mm-yyyy"
                                                selected={parseDate(guest.visa_expiry_date)}
                                                onChange={(d) => setGuest(prev => ({ ...prev, visa_expiry_date: formatDate(d) }))}
                                                customInput={<Input readOnly />}
                                            />
                                        </Field>
                                    </>}
                                </Grid>
                            </CardSection>

                            <CardSection title="Emergency Contact" subtitle="For safety and compliance">
                                <Grid cols={2}>
                                    <Field label="Emergency Contact Name*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.emergency_contact_name} onChange={(e) => setGuest(prev => ({ ...prev, emergency_contact_name: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                    <Field label="Emergency Contact Number*">
                                        <Input className="bg-white" disabled={isBooking} value={guest.emergency_contact} onChange={(e) => e.target.value.length <= 10 && setGuest(prev => ({ ...prev, emergency_contact: normalizeTextInput(e.target.value) }))} />
                                    </Field>
                                </Grid>
                            </CardSection>

                            <CardSection title="Booking Add-ons" subtitle="Extra services">
                                <Grid cols={2}>
                                    <Field label="Extras Per Night">
                                        <Input className="bg-white" disabled={isBooking} type="number" min={0} value={extraPerNight} onChange={(e) => setExtraPerNight(normalizeNumberInput(e.target.value))} />
                                    </Field>
                                    <Field label="Advance Payment">
                                        <Input className="bg-white" disabled={isBooking} type="number" min={0} value={advancePayment} onChange={(e) => setAdvancePayment(normalizeNumberInput(e.target.value))} />
                                    </Field>


                                    <Toggle label="Pickup" checked={pickup} onChange={setPickup} />
                                    <Toggle label="Drop" checked={drop} onChange={setDrop} />
                                </Grid>
                            </CardSection>

                            <CardSection title="Discount & Special Request" subtitle="Offers and notes">
                                <Grid cols={2}>
                                    <Field label="Discount Type">
                                        <select
                                            className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as any)}
                                        >
                                            <option value="PERCENT">Percent (%)</option>
                                            <option value="FLAT">Flat</option>
                                        </select>
                                    </Field>
                                    <Field label="Discount">
                                        <Input className="bg-white" type="number" disabled={isBooking} min={0} value={discount} onChange={(e) => setDiscount(normalizeNumberInput(e.target.value))} />
                                    </Field>
                                </Grid>


                                <Field label="Comments">
                                    <textarea
                                        className="w-full min-h-[96px] rounded-[3px] border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        value={comments}
                                        onChange={(e) => setComments(normalizeTextInput(e.target.value))}
                                    />
                                </Field>
                            </CardSection>

                            <CardSection title="Billing Summary" subtitle={""}>
                                <div className="space-y-1 text-sm">
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
                            </CardSection>

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
                    <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-3 bg-muted/20">

                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Available Rooms
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-3">
                            <div className="space-y-1 mb-4">
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                    value={roomFilters.bedType}
                                    onChange={(e) => {
                                        setRoomFilters({ ...roomFilters, bedType: e.target.value })
                                    }}

                                    disabled={allAvailableRoomIds.length === 0}
                                >
                                    <option value="">Select Bed type</option>
                                    {availableBedType.map((type, i) => {
                                        return <option value={type} key={i}>{type}</option>
                                    })}
                                </select>
                            </div>
                            <div className="space-y-1 mb-4">
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                    value={roomFilters.roomCategory}
                                    onChange={(e) => {
                                        setRoomFilters({ ...roomFilters, roomCategory: e.target.value })
                                    }}

                                    disabled={allAvailableRoomIds.length === 0}
                                >
                                    <option value="">Select category</option>
                                    {availableRoomCategory.map((category, i) => {
                                        return <option value={category} key={i}>{category}</option>
                                    })}
                                </select>
                            </div>
                            <div className="space-y-1 mb-4">
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-white px-3 text-sm"
                                    value={roomFilters.floor}
                                    onChange={(e) => {
                                        setRoomFilters({ ...roomFilters, floor: e.target.value })
                                    }}

                                    disabled={floors.length === 0}
                                >
                                    <option value="">Select floor</option>
                                    {floors.map((floor, i) => {
                                        return <option value={floor} key={i}>{floor}</option>
                                    })}
                                </select>
                            </div>
                        </div>


                        {roomsByFloor.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {(arrivalError || departureError) ? "Departure date should be greater than arrival date" : !availableRoomsLoading ? "No available rooms on selected dates" : "Select dates to see available rooms."}
                            </p>
                        )}

                        <div className="space-y-3">
                            {roomsByFloor.map(({ floor, rooms }) => (
                                (roomFilters.floor === "" || roomFilters.floor == floor.toString()) && <div key={floor}>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                        Floor {floor}
                                    </h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
                                        {rooms.map((room) => {
                                            const isSelected = selectedRooms.some(
                                                (r) => r.ref_room_id === Number(room.id)
                                            );

                                            return (
                                                (isSelected ||
                                                    ((!roomFilters.bedType || room.bed_type_name === roomFilters.bedType) &&
                                                        (!roomFilters.roomCategory || room.room_category_name === roomFilters.roomCategory))) &&
                                                <button
                                                    key={room.id}
                                                    onClick={() => toggleRoom(Number(room.id))}
                                                    className={cn(
                                                        "h-[110px] rounded-[3px] border p-3 text-sm font-semibold transition",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-card border-border hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="flex flex-col h-full">

                                                        {/* Top - Left */}
                                                        <span className="text-xs opacity-70 mb-4 text-left">
                                                            {getFloorName(room.floor_number)}
                                                        </span>

                                                        {/* Middle - Center */}
                                                        <div className="flex-1 flex items-center justify-center">
                                                            <span className="text-[2rem] font-semibold">
                                                                {room.room_no}
                                                            </span>
                                                        </div>

                                                        {/* Bottom - Left */}
                                                        <span className="text-xs opacity-70 mt-4 text-left">
                                                            {room.bed_type_name.split(" ")[0]}|{room.room_category_name}
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

const CardSection = ({ title, subtitle, children }) => (
    <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
    </div>
);


const Grid = ({ cols = 2, children }) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
        {children}
    </div>
);


const Field = ({ label, children }) => (
    <div className="space-y-1">
        <Label className="text-xs font-medium">{label}</Label>
        {children}
    </div>
);


const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center gap-3 mt-2">
        <Switch checked={checked} onCheckedChange={onChange} />
        <Label className="text-sm">{label}</Label>
    </div>
);