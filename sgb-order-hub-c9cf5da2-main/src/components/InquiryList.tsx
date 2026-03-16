import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInquiries } from '@/hooks/useInquiries';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, Phone, Package, MapPin, Calendar, Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface InquiryListProps {
  onConvertToOrder?: (inquiry: any) => void;
}

export function InquiryList({ onConvertToOrder }: InquiryListProps) {
  const { inquiries, loading, updateInquiryStatus } = useInquiries();
  const { toast } = useToast();
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const pendingInquiries = inquiries.filter(i => i.status === 'pending');

  const handleViewDetails = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setDialogOpen(true);
  };

  const handleConvertToOrder = (inquiry: any) => {
    setDialogOpen(false);
    
    // Store inquiry data in sessionStorage for the New Order form
    sessionStorage.setItem('inquiryToConvert', JSON.stringify({
      inquiryId: inquiry.id,
      customerName: inquiry.customer_name,
      phone: inquiry.phone_number,
      city: inquiry.delivery_city || '',
      productName: inquiry.product_name || '',
      quantity: inquiry.quantity || 1,
    }));
    
    // Switch to new-order tab
    setSearchParams({ tab: 'new-order' });
    
    toast({
      title: 'Converting to Order',
      description: 'Pre-filling order form with inquiry data...',
    });
    
    // Call parent callback if provided
    if (onConvertToOrder) {
      onConvertToOrder(inquiry);
    }
  };

  const handleMarkRejected = async (id: string) => {
    const result = await updateInquiryStatus(id, 'rejected');
    if (result.success) {
      toast({
        title: 'Inquiry Rejected',
        description: 'The inquiry has been marked as rejected',
      });
      setDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Converted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading inquiries...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Customer Inquiries
          </CardTitle>
          <CardDescription>
            WhatsApp inquiries from customers waiting to be processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending inquiries at the moment
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInquiries.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell className="font-medium">{inquiry.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {inquiry.phone_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {inquiry.product_name ? (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {inquiry.product_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{inquiry.quantity || '-'}</TableCell>
                      <TableCell>
                        {inquiry.delivery_city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {inquiry.delivery_city}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(inquiry.created_at), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(inquiry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inquiry Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              Review the customer inquiry and take action
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer Name</Label>
                  <p className="text-sm mt-1">{selectedInquiry.customer_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone Number</Label>
                  <p className="text-sm mt-1">{selectedInquiry.phone_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Product</Label>
                  <p className="text-sm mt-1">{selectedInquiry.product_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm mt-1">{selectedInquiry.quantity || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Delivery City</Label>
                  <p className="text-sm mt-1">{selectedInquiry.delivery_city || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedInquiry.status)}</div>
                </div>
              </div>

              {/* Raw Message */}
              <div>
                <Label className="text-sm font-medium">Original WhatsApp Message</Label>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap font-mono">{selectedInquiry.raw_message}</p>
                </div>
              </div>

              {/* Actions */}
              {selectedInquiry.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleConvertToOrder(selectedInquiry)}
                    className="flex-1 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Convert to Order
                  </Button>
                  <Button
                    onClick={() => handleMarkRejected(selectedInquiry.id)}
                    variant="destructive"
                    className="flex-1 flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Inquiry
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
