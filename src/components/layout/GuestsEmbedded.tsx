import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import {
    useGetGuestsByBookingQuery,
    useAddGuestsByBookingMutation,
} from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import DatePicker from 'react-datepicker'

/* ---------------- Types ---------------- */
export type GuestForm = {
    id?: string;
    temp_key?: string;

    first_name: string;
    middle_name?: string;
    last_name?: string;

    phone?: string;
    email?: string;

    gender?: "MALE" | "FEMALE" | "OTHER";
    dob?: string;

    nationality?: string;
    country?: string;
    address?: string;

    guest_type?: "ADULT" | "CHILD";

    id_type?: string;
    id_number?: string;
    has_id_proof?: boolean;

    emergency_contact?: string;
    emergency_contact_name?: string;

    visa_number?: string;
    visa_issue_date?: string;
    visa_expiry_date?: string;
};

type Props = {
    bookingId: string;
    guestCount: number;
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


/* ---------------- Component ---------------- */
export default function GuestsEmbedded({ bookingId, guestCount }: Props) {
    const [guests, setGuests] = useState<GuestForm[]>([]);
    const [removedGuestIds, setRemovedGuestIds] = useState<string[]>([]);
    const [idProofFiles, setIdProofFiles] = useState<Record<string, File>>({});
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data } = useGetGuestsByBookingQuery(
        { booking_id: bookingId },
        { skip: !bookingId }
    );

    const [upsertGuests, { isLoading }] =
        useAddGuestsByBookingMutation();

    /* -------- Init -------- */
    useEffect(() => {
        if (!data?.guests) return;

        const existing: GuestForm[] = data.guests.map((g: any) => ({ ...g }));

        const remaining = guestCount - existing.length;

        const emptyGuests: GuestForm[] = Array.from(
            { length: Math.max(0, remaining) },
            (_, i) => ({
                temp_key: `temp-${i}`,
                first_name: "",
                guest_type: "ADULT",
            })
        );

        setGuests([...existing, ...emptyGuests]);
    }, [data, guestCount]);

    /* -------- Helpers -------- */
    const updateGuest = (index: number, patch: Partial<GuestForm>) => {
        setGuests((prev) =>
            prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
        );
    };

    const addGuest = () => {
        setGuests((p) => [
            ...p,
            {
                temp_key: `temp-${Date.now()}`,
                first_name: "",
                guest_type: "ADULT",
            },
        ]);
    };

    const removeGuest = (index: number) => {
        const guest = guests[index];
        if (guest.id) {
            setRemovedGuestIds((p) => [...p, guest.id]);
        }
        setGuests((p) => p.filter((_, i) => i !== index));
    };

    const handleFile = (key: string, file?: File) => {
        if (!file) return;
        setIdProofFiles((p) => ({ ...p, [key]: file }));
    };

    /* -------- Validation -------- */
    const validate = () => {
        if (guests.some((g) => !g.first_name?.trim())) {
            toast.error("First name is required for all guests");
            return false;
        }

        for (const g of guests) {
            if (g.nationality?.toLowerCase() === "foreigner") {
                if (!g.visa_number || !g.visa_issue_date || !g.visa_expiry_date) {
                    toast.error("Visa details required for foreign guests");
                    return false;
                }
            }
        }

        return true;
    };

    /* -------- Save -------- */
    const handleSave = async () => {
        if (!validate()) return;

        const adultCount = guests.filter(
            (g) => g.guest_type === "ADULT"
        ).length;

        const formData = new FormData();

        formData.append("guests", JSON.stringify(guests));
        formData.append(
            "removed_guest_ids",
            JSON.stringify(removedGuestIds)
        );

        /* 🔄 booking.adult update */
        formData.append("update_adult", "true");
        formData.append("adult", String(adultCount));

        /* 🪪 ID proofs */
        const idProofMap: Record<string, number> = {};
        let i = 0;

        Object.entries(idProofFiles).forEach(([key, file]) => {
            formData.append("id_proofs", file);
            idProofMap[key] = i++;
        });

        formData.append("id_proof_map", JSON.stringify(idProofMap));

        try {
            await upsertGuests({ bookingId, formData }).unwrap();
            toast.success("Guests saved successfully");
        } catch {
            toast.error("Failed to save guests");
        }
    };

    const formatReadableDate = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const downloadImage = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = "id-proof.jpg";
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    /* -------- UI -------- */
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Guests</h2>

                <div className="flex gap-2">
                    <div className="flex gap-2">
                        {!isEditing && <Button
                            variant="heroOutline"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </Button>}

                        <Button
                            variant="heroOutline"
                            onClick={() => {
                                setIsEditing(true);
                                addGuest();
                            }}
                        >
                            + Add Guest
                        </Button>

                        {isEditing && (
                            <>
                                <Button
                                    variant="hero"
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={isLoading}
                                >
                                    Save Guests
                                </Button>
                                <Button
                                    variant="hero"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>

                </div>
            </div>

            {isEditing && guests.map((g, index) => {
                const key = g.id ?? g.temp_key!;

                return (
                    <div
                        key={key}
                        className="rounded-[5px] border bg-card p-6 space-y-4"
                    >
                        <div className="flex justify-between">
                            <p className="font-medium">
                                Guest {index + 1}
                            </p>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={index === 0}
                                onClick={() => removeGuest(index)}
                            >
                                Remove
                            </Button>
                        </div>

                        {/* Names */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <Label>First Name *</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : ""}
                                    value={g.first_name}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            first_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Middle Name</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : ""}
                                    value={g.middle_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            middle_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Last Name</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : ""}
                                    value={g.last_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            last_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Gender</Label>
                                <select
                                    disabled={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className="h-10 w-full rounded-[3px] border px-3 text-sm"
                                    value={g.gender ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            gender: e.target.value as any,
                                        })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Date of Birth</Label>

                                <div className="block">
                                    <DatePicker
                                        readOnly={!isEditing}
                                        tabIndex={isEditing ? 0 : -1}
                                        selected={parseDate(g.dob ?? "")}
                                        placeholderText="dd-MM-yyyy"
                                        onChange={(date) => {
                                            updateGuest(index, { dob: formatDate(date) })
                                        }}
                                        dateFormat="dd-MM-yyyy"
                                        customInput={<Input readOnly />}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.phone ?? ""}
                                    onChange={(e) =>
                                        e.target.value.length <= 10 &&
                                        updateGuest(index, {
                                            phone: normalizeNumberInput(e.target.value).toString(),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.email ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            email: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>Nationality</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={g.nationality ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            nationality: normalizeTextInput(e.target.value),
                                        })
                                    }
                                >
                                    <option value="">Select nationality</option>
                                    <option value="indian">Indian</option>
                                    <option value="non_res_indian">Non Resident Indian</option>
                                    <option value="foreigner">Foreigner</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Country</Label>
                                <Input
                                    readOnly={!isEditing}
                                    value={g.country ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            country: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Address</Label>
                                <Input
                                    readOnly={!isEditing}
                                    value={g.address ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            address: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>


                        {/* ID */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>ID Type</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.id_type ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            id_type: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>ID Number</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.id_number ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            id_number: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>ID Proof</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    disabled={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    onChange={(e) =>
                                        handleFile(key, e.target.files?.[0])
                                    }
                                />
                            </div>
                        </div>

                        {g.nationality?.toLowerCase() === "foreigner" && (

                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>Visa Number *</Label>
                                    <Input
                                        readOnly={!isEditing}
                                        value={g.visa_number ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                visa_number: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Issue Date *</Label>
                                    <div className="block">
                                        <DatePicker
                                            readOnly={!isEditing}
                                            selected={parseDate(g.visa_issue_date)}
                                            placeholderText="dd-MM-yyyy"
                                            onChange={(date) =>
                                                updateGuest(index, {
                                                    visa_issue_date: formatDate(date),
                                                })
                                            }
                                            dateFormat="dd-MM-yyyy"
                                            customInput={<Input readOnly />}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label>Expiry Date *</Label>
                                    <div className="block">
                                        <DatePicker
                                            readOnly={!isEditing}
                                            selected={parseDate(g.visa_expiry_date)}
                                            placeholderText="dd-MM-yyyy"
                                            onChange={(date) =>
                                                updateGuest(index, {
                                                    visa_expiry_date: formatDate(date),
                                                })
                                            }
                                            dateFormat="dd-MM-yyyy"
                                            customInput={<Input readOnly />}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Emergency */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Emergency Contact Name</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.emergency_contact_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            emergency_contact_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Emergency Contact Number</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.emergency_contact ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            emergency_contact: normalizeNumberInput(e.target.value).toString(),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {g.has_id_proof && g.id && (
                            <Button
                                size="sm"
                                variant="heroOutline"
                                onClick={() =>
                                    setPreviewId(
                                        `${import.meta.env.VITE_API_URL}/guests/${g.id}/id-proof`
                                    )
                                }
                            >
                                View ID Proof
                            </Button>
                        )}
                    </div>
                );
            })}

            {guests.map((g, i) => {
                return !isEditing && (
                    <div className="rounded-[3px] bg-muted/30 p-5 space-y-4" key={i}>
                        {/* Name */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-lg font-semibold">
                                    {g.first_name} {g.middle_name} {g.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {g.guest_type}
                                </p>
                            </div>

                            {g.gender && (
                                <span className="text-xs px-2 py-0.5 rounded bg-secondary">
                                    {g.gender}
                                </span>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <InfoRow label="Phone" value={g.phone} />
                            <InfoRow label="Email" value={g.email} />
                            <InfoRow label="Date of Birth" value={formatReadableDate(g.dob)} />
                            <InfoRow label="Nationality" value={g.nationality} />
                            <InfoRow label="Address" value={g.address} />
                        </div>

                        {/* ID */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <InfoRow label="ID Type" value={g.id_type} />
                            <InfoRow label="ID Number" value={g.id_number} />

                            {g.has_id_proof && g.id && (
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    className="w-fit"
                                    onClick={() =>
                                        setPreviewId(
                                            `${import.meta.env.VITE_API_URL}/guests/${g.id}/id-proof`
                                        )
                                    }
                                >
                                    View ID Proof
                                </Button>
                            )}
                        </div>

                        {/* Emergency */}
                        {(g.emergency_contact || g.emergency_contact_name) && (
                            <div className="border-t pt-3">
                                <p className="text-sm font-medium mb-2">
                                    Emergency Contact
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <InfoRow
                                        label="Name"
                                        value={g.emergency_contact_name}
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={g.emergency_contact}
                                    />
                                </div>
                            </div>
                        )}

                        {g.nationality?.toLowerCase() === "foreigner" && (
                            <div className="border-t pt-3">
                                <p className="text-sm font-medium mb-2">Visa Details</p>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <InfoRow label="Visa Number" value={g.visa_number} />
                                    <InfoRow label="Issue Date" value={formatReadableDate(g.visa_issue_date)} />
                                    <InfoRow label="Expiry Date" value={formatReadableDate(g.visa_expiry_date)} />
                                </div>
                            </div>
                        )}

                    </div>
                )
            }
            )}

            {guests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No guests added
                </p>
            )}

            {/* ID Preview */}
            <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
                <DialogContent className="max-w-lg [&>button.absolute]:hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>ID Proof</span>

                            {previewId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadImage(previewId)}
                                >
                                    Download
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {previewId && (
                        <div className="flex justify-center">
                            <img
                                src={previewId}
                                className="rounded-lg max-h-[70vh] object-contain"
                                alt="ID Proof"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to save guest details?
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            onClick={async () => {
                                setConfirmOpen(false);
                                await handleSave();
                                setIsEditing(false);
                            }}
                            disabled={isLoading}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    if (!value) return null;

    return (
        <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">
                {value}
            </p>
        </div>
    );
}
