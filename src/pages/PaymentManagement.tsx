import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    useGetPaymentsByPropertyQuery,
    useGetMyPropertiesQuery,
    useGetPaymentsByIdQuery,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";

/* ---------------- Helpers ---------------- */
const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleString() : "—";

/* ---------------- Component ---------------- */
export default function PaymentsManagement() {
    const isLoggedIn = useAppSelector((s) => s.isLoggedIn.value);

    const [page, setPage] = useState(1);
    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [bookingId, setBookingId] = useState("");
    const [method, setMethod] = useState("");
    const [status, setStatus] = useState("");

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    /* Properties */
    const { data: properties } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn,
    });

    /* Payments */
    const { data: payments, isLoading: paymentsLoading } = useGetPaymentsByPropertyQuery({ page, propertyId, bookingId, method, status }, {
        skip: !isLoggedIn || !propertyId
    });

    const { data: selectedPaymentData, isLoading: selectedPaymentLoading } = useGetPaymentsByIdQuery({ paymentId: selectedPayment?.id }, {
        skip: !isLoggedIn || !selectedPayment?.id
    })

    useEffect(() => {
        if (!propertyId && properties?.properties?.length) {
            setPropertyId(properties.properties[0].id);
        }
    }, [properties]);

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Sidebar />

            <main className="lg:ml-64 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold">Payments</h1>
                        <p className="text-sm text-muted-foreground">
                            View payment transactions
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 max-w-5xl">
                        <div>
                            <Label>Property</Label>
                            <select
                                className="w-full h-10 rounded-xl border px-3 text-sm"
                                value={propertyId ?? ""}
                                onChange={(e) => {
                                    setPage(1);
                                    setPropertyId(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : undefined
                                    );
                                }}
                            >
                                <option value="" disabled>Select</option>
                                {properties?.properties?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.brand_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* <div>
                            <Label>Booking ID</Label>
                            <select
                                className="w-full h-10 rounded-xl border px-3 text-sm"
                                value={propertyId ?? ""}
                                onChange={(e) => {
                                    setPage(1);
                                    setBookingId(
                                        e.target.value
                                            ? (e.target.value)
                                            : undefined
                                    );
                                }}
                            >
                                <option value="" disabled>select</option>
                                {properties?.properties?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.brand_name}
                                    </option>
                                ))}
                            </select>
                        </div> */}

                        <div>
                            <Label>Method</Label>
                            <select
                                className="w-full h-10 rounded-xl border px-3 text-sm"
                                value={method}
                                onChange={(e) => {
                                    setPage(1);
                                    setMethod(e.target.value);
                                }}
                            >
                                <option value="">All</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>

                        {/* <div>
                            <Label>Status</Label>
                            <select
                                className="w-full h-10 rounded-xl border px-3 text-sm"
                                value={status}
                                onChange={(e) => {
                                    setPage(1);
                                    setStatus(e.target.value);
                                }}
                            >
                                <option value="">All</option>
                                <option value="Paid">Paid</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div> */}

                        {/* <div className="flex items-end">
                            <Button
                                variant="heroOutline"
                                className="w-full"
                                onClick={() => {
                                    setBookingId("");
                                    setMethod("");
                                    setStatus("");
                                    setPage(1);
                                }}
                            >
                                Clear
                            </Button>
                        </div> */}
                    </div>

                    {/* Table */}
                    <div className="bg-card border rounded-2xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {/* <TableHead>Booking</TableHead> */}
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {!paymentsLoading &&
                                    payments?.data?.map((p) => (
                                        <TableRow key={p.id}>
                                            {/* <TableCell>
                                                #{p.booking_id}
                                            </TableCell> */}
                                            <TableCell>
                                                {formatDate(
                                                    p.payment_date
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                ₹ {p.paid_amount}
                                            </TableCell>
                                            <TableCell>
                                                {p.payment_method}
                                            </TableCell>
                                            <TableCell>
                                                {p.payment_status}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => {
                                                        setSelectedPayment(p);
                                                        setDetailsOpen(true);
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {payments?.pagination && (
                            <div className="flex justify-between px-4 py-3 border-t">
                                <span className="text-sm text-muted-foreground">
                                    Page {payments.pagination.page} of{" "}
                                    {payments.pagination.totalPages}
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
                                        disabled={
                                            page >=
                                            payments.pagination.totalPages
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

            {/* Payment Details */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent side="right" className="sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Payment Details</SheetTitle>
                    </SheetHeader>

                    {selectedPayment && (
                        <div className="mt-4 space-y-4 text-sm">
                            <Detail label="Booking ID" value={selectedPayment.booking_id} />
                            <Detail label="Property Name" value={selectedPaymentData?.property_name} />
                            <Detail label="Payment Date" value={formatDate(selectedPayment.payment_date)} />
                            <Detail label="Amount" value={`₹ ${selectedPayment.paid_amount}`} />
                            <Detail label="Method" value={selectedPayment.payment_method} />
                            <Detail label="Type" value={selectedPaymentData?.payment_type} />
                            <Detail label="Status" value={selectedPayment.payment_status} />
                            <Detail label="Payment Date/Time" value={formatDate(selectedPayment.payment_date)} />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

/* ---------------- Small UI ---------------- */
function Detail({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value ?? "—"}</span>
        </div>
    );
}
