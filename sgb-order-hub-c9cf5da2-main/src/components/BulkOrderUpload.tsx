import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCreateOrder } from '@/hooks/useOrders';

interface ParsedOrder {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentStatus: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export function BulkOrderUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: 'Empty File',
          description: 'CSV file has no data rows',
          variant: 'destructive',
        });
        return;
      }

      // Skip header row
      const dataLines = lines.slice(1);
      const parsed: ParsedOrder[] = [];

      dataLines.forEach((line, index) => {
        const values = line.split(',').map(v => v.trim());
        
        if (values.length >= 10) {
          parsed.push({
            customerName: values[0],
            phone: values[1],
            address: values[2],
            city: values[3],
            state: values[4],
            pincode: values[5],
            paymentStatus: values[6].toLowerCase(),
            productName: values[7],
            quantity: parseInt(values[8]) || 1,
            unitPrice: parseFloat(values[9]) || 0,
          });
        }
      });

      setOrders(parsed);
      toast({
        title: 'File Parsed',
        description: `Found ${parsed.length} orders in CSV`,
      });
    };

    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (orders.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const unmatchedProducts: string[] = [];

    for (const order of orders) {
      try {
        // Smart product matching - find product by name
        let matchedProduct = null;
        if (products && products.length > 0) {
          // Try exact match first
          matchedProduct = products.find(p => 
            p.product_name.toLowerCase() === order.productName.toLowerCase()
          );
          
          // If no exact match, try partial match
          if (!matchedProduct) {
            matchedProduct = products.find(p => 
              p.product_name.toLowerCase().includes(order.productName.toLowerCase()) ||
              order.productName.toLowerCase().includes(p.product_name.toLowerCase())
            );
          }
        }

        // Track unmatched products
        if (!matchedProduct && !unmatchedProducts.includes(order.productName)) {
          unmatchedProducts.push(order.productName);
        }

        await createOrder.mutateAsync({
          customer_name: order.customerName,
          phone: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          total_amount: order.quantity * order.unitPrice,
          payment_status: order.paymentStatus,
          items: [{
            product_id: matchedProduct?.id || null as any,
            product_name: order.productName,
            quantity: order.quantity,
            unit_price: order.unitPrice,
            total_price: order.quantity * order.unitPrice,
          }],
        });
        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error('Failed to create order for:', order.customerName, error);
      }
    }

    setUploading(false);
    setUploadComplete(true);

    if (successCount > 0) {
      let description = `${successCount} order${successCount > 1 ? 's' : ''} created successfully`;
      if (errorCount > 0) description += `. ${errorCount} failed`;
      if (unmatchedProducts.length > 0) {
        description += `. Warning: Products not found in system: ${unmatchedProducts.join(', ')}`;
      }
      
      toast({
        title: 'Bulk Upload Complete! ✅',
        description,
      });
      
      // Clear orders after successful upload
      setTimeout(() => {
        setOrders([]);
        setFile(null);
        setUploadComplete(false);
      }, 2000);
    } else {
      toast({
        title: 'Upload Failed',
        description: `All ${errorCount} orders failed to create. Check console for details.`,
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = () => {
    const template = `Customer Name,Phone,Street Address,City,State,Pincode,Payment Status,Product Name,Quantity,Unit Price
Rajesh Kumar,9110404193,123 MG Road,Hubli,Karnataka,580001,paid,Garden Spade,2,450
Priya Sharma,9110404193,456 Station Road,Dharwad,Karnataka,580008,paid,Steel Hammer,1,850
Amit Patel,9110404193,789 Market Street,Belgaum,Karnataka,590001,unpaid,Fertilizer Bag,5,320
Sunita Reddy,9110404193,321 Temple Road,Hubli,Karnataka,580020,paid,Water Pump,1,12500
Vijay Singh,9110404193,654 Gandhi Nagar,Dharwad,Karnataka,580002,partial,Garden Hose,3,280
Lakshmi Iyer,9110404193,987 Park Avenue,Hubli,Karnataka,580030,paid,Pruning Shears,2,550
Ramesh Naik,9110404193,147 Church Street,Belgaum,Karnataka,590016,paid,Wheelbarrow,1,2800
Kavita Desai,9110404193,258 College Road,Hubli,Karnataka,580029,unpaid,Rake Tool,4,180
Suresh Gowda,9110404193,369 Bus Stand Road,Dharwad,Karnataka,580004,paid,Shovel,2,620
Anjali Hegde,9110404193,741 Railway Station,Hubli,Karnataka,580024,paid,Garden Fork,1,480`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_order_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Order Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file with multiple customer orders to create them in bulk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={downloadTemplate} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
            
            <div className="flex-1">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild variant="default">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {file ? file.name : 'Choose CSV File'}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {orders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{orders.length} orders ready to upload</Badge>
                <Button 
                  onClick={handleBulkUpload} 
                  disabled={uploading || uploadComplete}
                >
                  {uploading ? 'Creating Orders...' : uploadComplete ? 'Orders Created!' : 'Create All Orders'}
                </Button>
              </div>

              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{order.phone}</TableCell>
                        <TableCell>{order.city}</TableCell>
                        <TableCell>{order.productName}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>₹{(order.quantity * order.unitPrice).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">CSV Format Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-medium text-blue-900">Important: Add products to your system first!</p>
          <p className="text-blue-800">Product names in CSV will be matched with products in your inventory. Make sure products exist before uploading.</p>
          <p className="mt-3">Your CSV file must have these columns in order:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Customer Name</li>
            <li>Phone (10 digits)</li>
            <li>Street Address</li>
            <li>City</li>
            <li>State</li>
            <li>Pincode (6 digits)</li>
            <li>Payment Status (paid/unpaid/partial)</li>
            <li>Product Name (must match products in system)</li>
            <li>Quantity (number)</li>
            <li>Unit Price (number)</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            Download the template to see example format with 10 sample orders.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
