import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCreatePaymentMutation, useGetPaymentsByBookingIdQuery } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { toast } from "react-toastify";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";

/* ---------------- Types ---------------- */

type Payment = {
    id: string;
    booking_id: string;
    property_id: string;
    payment_date: string;
    paid_amount: string;
    payment_method: string;
    payment_type: string;
    payment_status: string;
    is_active: boolean;
    created_on: string;
};

type CreatePaymentPayload = {
    booking_id: string;
    property_id: string;
    payment_date: string;
    paid_amount: number;
    payment_method: string;
    payment_type: string;
    payment_status: string;
};

type Props = {
    bookingId: string;
    propertyId: string;
};

/* ---------------- Utils ---------------- */

function formatDate(date?: string) {
    if (!date) return "—";
    return new Date(date).toLocaleString();
}

/* ---------------- Component ---------------- */

const getNowForDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};


export default function PaymentsEmbedded({
    bookingId,
    propertyId,
}: Props) {
    const [open, setOpen] = useState(false);

    /* Form state */
    const [paymentDate, setPaymentDate] = useState(getNowForDatetimeLocal());
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("Cash");
    const [type, setType] = useState("Advance");
    const [status, setStatus] = useState("Paid");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    /* -------- Payload Generator -------- */
    const buildPaymentPayload = (): CreatePaymentPayload => {
        return {
            booking_id: bookingId,
            property_id: propertyId,
            payment_date: paymentDate,
            paid_amount: Number(amount),
            payment_method: method,
            payment_type: type,
            payment_status: status,
        };
    };

    const { data: payments, isLoading: paymentsLoading } = useGetPaymentsByBookingIdQuery({ bookingId }, {
        skip: !bookingId || !isLoggedIn
    })

    const [createPayment] = useCreatePaymentMutation()

    const handleCreatePayment = async () => {
        const payload = buildPaymentPayload();
        const promise = createPayment({ payload }).unwrap()

        await toast.promise(promise, {
            pending: "Creating payment please wait...",
            success: "Payment successfully saved",
            error: "Error creating payments"
        })

        setOpen(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Payments</h3>
                    <p className="text-sm text-muted-foreground">
                        Payment history for this booking
                    </p>
                </div>

                <Button variant="hero" size="sm" onClick={() => setOpen(true)}>
                    + Add Payment
                </Button>
            </div>

            {/* Empty */}
            {!paymentsLoading && payments?.data.length === 0 && (
                <div className="rounded-[3px] border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No payments recorded
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {!paymentsLoading && payments?.data?.map((p) => (
                    <div
                        key={p.id}
                        className="rounded-[5px] border border-border bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-medium">₹ {p.paid_amount}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(p.payment_date)}
                                </p>
                            </div>

                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
                                {p.payment_status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                            <Info label="Method" value={p.payment_method} />
                            {/* <Info label="Type" value={p.payment_type} /> */}
                            {/* <Info label="Booking ID" value={`#${p.booking_id}`} /> */}
                            {/* <Info label="Property ID" value={`#${p.property_id}`} /> */}
                            <Info
                                label="Created On"
                                value={formatDate(p.created_on)}
                            />
                            <Info
                                label="Created By"
                                value={p?.created_by_name}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------------- Add Payment Modal ---------------- */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div className="space-y-1">
                            <Label>Payment Date</Label>
                            <Input
                                type="datetime-local"
                                value={paymentDate}
                                onChange={(e) =>
                                    setPaymentDate(e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={amount}
                                min={0}
                                onChange={(e) =>
                                    setAmount(normalizeTextInput(e.target.value))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Method</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={method}
                                    onChange={(e) =>
                                        setMethod(e.target.value)
                                    }
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank">Bank</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <Label>Type</Label>
                                <select
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={type}
                                    onChange={(e) =>
                                        setType(e.target.value)
                                    }
                                >
                                    <option value="Advance">Advance</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Final">Final</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value)
                                }
                            >
                                <option value="Paid">Paid</option>
                                <option value="Completed">Completed</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <Button
                                variant="heroOutline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={handleCreatePayment}
                                disabled={!amount || Number(amount) === 0}
                            >
                                Add Payment
                            </Button>

                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ---------------- UI Helpers ---------------- */

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? "—"}</p>
        </div>
    );
}
