import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGetOrderByIdQuery } from "@/redux/services/hmsApi";

type Props = {
    orderId: string | null;
    open: boolean;
    onClose: () => void;
};

export function OrderItemsModal({ orderId, open, onClose }: Props) {
    const { data, isLoading } = useGetOrderByIdQuery(orderId, {
        skip: !orderId || !open
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Order Items</DialogTitle>
                </DialogHeader>

                {isLoading && (
                    <p className="text-sm text-muted-foreground">Loading items...</p>
                )}

                {data && (
                    <div className="space-y-4">

                        {/* Order Summary */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">
                            <div>
                                <Label>Order ID</Label>
                                <p>#{data.id}</p>
                            </div>
                            <div>
                                <Label>Table</Label>
                                <p>{data.table_no || "—"}</p>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <p>{data.order_status}</p>
                            </div>
                            <div>
                                <Label>Payment</Label>
                                <p>{data.payment_status}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 text-left">Item</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Price</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: any) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-2">
                                                <p className="font-medium">{item.item_name}</p>
                                                {item.notes && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Note: {item.notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                {item.quantity}
                                            </td>
                                            <td className="p-2 text-right">
                                                ₹{item.unit_price}
                                            </td>
                                            <td className="p-2 text-right font-medium">
                                                ₹{item.item_total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end text-lg font-semibold">
                            Total: ₹{data.total_amount}
                        </div>

                        {/* Actions */}
                        {/* <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div> */}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
