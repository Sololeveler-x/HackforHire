import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useInquiries } from '@/hooks/useInquiries';
import { useProducts } from '@/hooks/useProducts';
import { extractAllData } from '@/utils/messageExtractor';
import { MessageSquare, Sparkles, Save } from 'lucide-react';

export function WhatsAppInquiry() {
  const [rawMessage, setRawMessage] = useState('');
  const [extractedData, setExtractedData] = useState({
    customerName: '',
    phoneNumber: '',
    productName: '',
    quantity: '',
    deliveryCity: ''
  });
  const [isExtracted, setIsExtracted] = useState(false);

  const { toast } = useToast();
  const { createInquiry } = useInquiries();
  const { data: productsData } = useProducts();
  const products = productsData || [];

  const handleExtract = () => {
    if (!rawMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste a WhatsApp message first',
        variant: 'destructive'
      });
      return;
    }

    // Get product names from database (with fallback)
    const productNames = products.map((p: any) => p.product_name);
    
    // Extract data from message
    const extracted = extractAllData(rawMessage, productNames);
    
    setExtractedData({
      customerName: extracted.customerName,
      phoneNumber: extracted.phoneNumber,
      productName: extracted.productName,
      quantity: extracted.quantity?.toString() || '',
      deliveryCity: extracted.deliveryCity
    });
    
    setIsExtracted(true);
    
    toast({
      title: 'Data Extracted',
      description: 'Information has been extracted from the message. Please review and edit if needed.',
    });
  };

  const handleCreateInquiry = async () => {
    if (!extractedData.customerName || !extractedData.phoneNumber) {
      toast({
        title: 'Missing Information',
        description: 'Customer name and phone number are required',
        variant: 'destructive'
      });
      return;
    }

    const result = await createInquiry({
      customer_name: extractedData.customerName,
      phone_number: extractedData.phoneNumber,
      product_name: extractedData.productName || undefined,
      quantity: extractedData.quantity ? parseInt(extractedData.quantity) : undefined,
      delivery_city: extractedData.deliveryCity || undefined,
      raw_message: rawMessage
    });

    if (result.success) {
      toast({
        title: 'Inquiry Created',
        description: 'The inquiry has been saved and is now visible to the billing team',
      });
      
      // Reset form
      setRawMessage('');
      setExtractedData({
        customerName: '',
        phoneNumber: '',
        productName: '',
        quantity: '',
        deliveryCity: ''
      });
      setIsExtracted(false);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to create inquiry. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleReset = () => {
    setRawMessage('');
    setExtractedData({
      customerName: '',
      phoneNumber: '',
      productName: '',
      quantity: '',
      deliveryCity: ''
    });
    setIsExtracted(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          WhatsApp Message Extractor
        </CardTitle>
        <CardDescription>
          Paste WhatsApp messages from customers to automatically extract order information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Raw Message Input */}
        <div className="space-y-2">
          <Label htmlFor="raw-message">WhatsApp Message</Label>
          <Textarea
            id="raw-message"
            placeholder="Paste the WhatsApp message here...&#10;&#10;Example:&#10;Hi I need 20 steel pipes delivered to Shivamogga.&#10;Name: Ramesh&#10;Phone: 9876543210"
            value={rawMessage}
            onChange={(e) => setRawMessage(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleExtract}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Extract Details
            </Button>
            {isExtracted && (
              <Button 
                onClick={handleReset}
                variant="outline"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Extracted Data Form */}
        {isExtracted && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold text-sm">Extracted Information (Editable)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name *</Label>
                <Input
                  id="customer-name"
                  value={extractedData.customerName}
                  onChange={(e) => setExtractedData({ ...extractedData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number *</Label>
                <Input
                  id="phone-number"
                  value={extractedData.phoneNumber}
                  onChange={(e) => setExtractedData({ ...extractedData, phoneNumber: e.target.value })}
                  placeholder="10-digit phone number"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={extractedData.productName}
                  onChange={(e) => setExtractedData({ ...extractedData, productName: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={extractedData.quantity}
                  onChange={(e) => setExtractedData({ ...extractedData, quantity: e.target.value })}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-city">Delivery City</Label>
                <Input
                  id="delivery-city"
                  value={extractedData.deliveryCity}
                  onChange={(e) => setExtractedData({ ...extractedData, deliveryCity: e.target.value })}
                  placeholder="Enter delivery city"
                />
              </div>
            </div>

            <Button 
              onClick={handleCreateInquiry}
              className="w-full flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Create Inquiry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
