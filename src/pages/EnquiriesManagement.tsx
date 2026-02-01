import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGetMyPropertiesQuery, useGetPropertyEnquiriesQuery, useUpdateEnquiryMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

type EnquiryStatus =
    | "open"
    | "follow_up"
    | "reserved"
    | "booked"
    | "closed"
    | "cancelled";

type Enquiry = {
    id: string;
    property_id: string;
    booking_id: string | null;

    guest_name: string;
    mobile: string;
    email: string;

    source: string;
    enquiry_type: string;
    status: EnquiryStatus;

    agent_name?: string;
    room_type?: string;
    no_of_rooms?: number;

    check_in?: string;
    check_out?: string;

    booked_by?: string;
    comment?: string;
    follow_up_date?: string;
    quote_amount?: string;

    is_reserved: boolean;
    is_active: boolean;
};

function statusBadge(status: EnquiryStatus) {
    switch (status) {
        case "open":
            return "bg-blue-100 text-blue-700";
        case "follow_up":
            return "bg-yellow-100 text-yellow-800";
        case "reserved":
            return "bg-purple-100 text-purple-700";
        case "booked":
            return "bg-green-100 text-green-700";
        case "closed":
            return "bg-gray-100 text-gray-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-muted";
    }
}


function buildUpdateEnquiryStatusPayload(
    status: EnquiryStatus,
    followUpDate?: string,
    comment?: string
) {
    return {
        status,
        ...(followUpDate && { follow_up_date: followUpDate }),
        ...(comment && { comment }),
    };
}


export default function EnquiriesManagement() {
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Enquiry | null>(null);

    const [status, setStatus] = useState<EnquiryStatus>("open");
    const [followUpDate, setFollowUpDate] = useState("");
    const [comment, setComment] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const navigate = useNavigate()

    const openManage = (enquiry: Enquiry) => {
        setSelected(enquiry);
        setStatus(enquiry.status);
        setFollowUpDate(enquiry.follow_up_date?.slice(0, 16) ?? "");
        setComment(enquiry.comment ?? "");
        setOpen(true);
    };
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: enquiries, isLoading: enquiryLoading } = useGetPropertyEnquiriesQuery({ propertyId: selectedPropertyId, page }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [updateEnquiry] = useUpdateEnquiryMutation()

    const handleUpdate = async () => {
        const payload = buildUpdateEnquiryStatusPayload(
            status,
            followUpDate,
            comment
        );

        const promise = updateEnquiry({ id: selected.id, payload }).unwrap()

        await toast.promise(promise, {
            error: "Error updating query",
            pending: "Updating please wait",
            success: "Query updated successfully"
        })

        setOpen(false);
    };

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    function handleBook(enquiry: Enquiry) {
        navigate("/reservation", {
            state: {
                fromEnquiry: true,
                enquiryId: enquiry.id,
                enquiry,
            },
        });
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
                            <h1 className="text-2xl font-bold">Enquiries</h1>
                            <p className="text-sm text-muted-foreground">
                                Track and manage customer enquiries
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
                                    {/* <option value="" disabled>properties</option> */}
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
                                navigate("/create-enquiry")
                            }}
                        >
                            New Enquiry
                        </Button>

                    </div>


                    {/* List */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                        {!enquiryLoading && enquiries && enquiries?.data.map((e) => (
                            <div
                                key={e.id}
                                className="rounded-[3px] border bg-card p-4 flex justify-between items-start"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{e.guest_name}</p>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${statusBadge(
                                                e.status
                                            )}`}
                                        >
                                            {e.status.toUpperCase()} {e.booking_id ? `#${e.booking_id}` : ""}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        {e.mobile} • {e.email}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {e.enquiry_type} • {e.room_type} • {e.no_of_rooms} room(s)
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        Check-in:{" "}
                                        {e.check_in
                                            ? new Date(e.check_in).toLocaleDateString()
                                            : "-"}{" "}
                                        | Check-out:{" "}
                                        {e.check_out
                                            ? new Date(e.check_out).toLocaleDateString()
                                            : "-"}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        Quoted Amount: {e.quote_amount}
                                    </p>

                                    {e.comment && (
                                        <p className="text-xs italic text-muted-foreground">
                                            “{e.comment}”
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        onClick={() => openManage(e)}
                                    >
                                        Manage
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="hero"
                                        disabled={e.is_reserved || e.status === "converted"}
                                        onClick={() => handleBook(e)}
                                    >
                                        Book
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="shrink-0 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                            Page {enquiries?.pagination.page} of {enquiries?.pagination.totalPages}
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
                                disabled={!enquiries || page >= enquiries?.pagination.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Manage Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Update Enquiry</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value as EnquiryStatus)
                                }
                            >
                                <option value="open">Open</option>
                                <option value="follow_up">Follow Up</option>
                                {/* <option value="reserved">Reserved</option> */}
                                {/* <option value="booked">Booked</option> */}
                                <option value="closed">Closed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {status === "follow_up" && (
                            <div className="space-y-2">
                                <Label>Follow-up Date</Label>
                                <Input
                                    type="datetime-local"
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Comment</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-[3px] border px-3 py-2 text-sm"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>

                        <Button variant="hero" className="w-full" onClick={handleUpdate}>
                            Update Enquiry
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

