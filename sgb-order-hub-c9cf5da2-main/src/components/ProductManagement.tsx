import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { StockDisplay } from '@/components/StockDisplay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Upload, X } from 'lucide-react';

interface ProductFormData {
  product_name: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
  weight_kg: number | '';
  length_cm: number | '';
  width_cm: number | '';
  height_cm: number | '';
}

const ProductManagement = () => {
  const { data: products } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    description: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    image_url: '',
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
  });

  const categories = [
    'Brush Cutters',
    'Garden Tools',
    'Sprayers',
    'Tillers',
    'Chainsaws',
    'Lawn Equipment',
  ];

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_name: product.product_name,
        description: product.description || '',
        category: product.category,
        price: product.price,
        stock_quantity: product.stock_quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        image_url: product.image_url || '',
        weight_kg: product.weight_kg || '',
        length_cm: product.length_cm || '',
        width_cm: product.width_cm || '',
        height_cm: product.height_cm || '',
      });
      setPreviewUrl(product.image_url || '');
    } else {
      setEditingProduct(null);
      setFormData({
        product_name: '',
        description: '',
        category: categories[0],
        price: 0,
        stock_quantity: 0,
        low_stock_threshold: 10,
        image_url: '',
        weight_kg: '',
        length_cm: '',
        width_cm: '',
        height_cm: '',
      });
      setPreviewUrl('');
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      setPreviewUrl(publicUrl);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.product_name || !formData.category || formData.price <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    // Convert empty strings to null for numeric fields
    const payload = {
      ...formData,
      weight_kg: formData.weight_kg === '' ? null : formData.weight_kg,
      length_cm: formData.length_cm === '' ? null : formData.length_cm,
      width_cm: formData.width_cm === '' ? null : formData.width_cm,
      height_cm: formData.height_cm === '' ? null : formData.height_cm,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...payload });
        toast.success('Product updated successfully!');
      } else {
        await createProduct.mutateAsync(payload);
        toast.success('Product created successfully!');
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Product deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockBadge = (stock: number, threshold: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock <= threshold) {
      return <Badge className="bg-orange-500">Low Stock</Badge>;
    } else {
      return <Badge className="bg-success">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Management
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button onClick={() => handleOpenDialog()} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.product_name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>₹{product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <StockDisplay
                      productId={product.id}
                      totalStock={product.stock || 0}
                      lowStockThreshold={10}
                      showBreakdown={true}
                    />
                  </TableCell>
                  <TableCell>
                    {getStockBadge(product.stock || 0, 10)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(product.id, product.product_name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredProducts || filteredProducts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No products found matching your search' : 'No products yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price (₹) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Alert</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {previewUrl ? (
                <div className="relative w-32 h-32">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-32 w-32 rounded object-cover border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"
                    onClick={() => { setPreviewUrl(''); setFormData((p) => ({ ...p, image_url: '' })); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload from device</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                </div>
              )}
              {!previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Weight & Dimensions (optional)</Label>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                  <Input
                    type="number" min="0" step="0.001"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value ? parseFloat(e.target.value) : '' })}
                    placeholder="0.000"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Length (cm)</Label>
                  <Input
                    type="number" min="0" step="0.1"
                    value={formData.length_cm}
                    onChange={(e) => setFormData({ ...formData, length_cm: e.target.value ? parseFloat(e.target.value) : '' })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Width (cm)</Label>
                  <Input
                    type="number" min="0" step="0.1"
                    value={formData.width_cm}
                    onChange={(e) => setFormData({ ...formData, width_cm: e.target.value ? parseFloat(e.target.value) : '' })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Height (cm)</Label>
                  <Input
                    type="number" min="0" step="0.1"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value ? parseFloat(e.target.value) : '' })}
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createProduct.isPending || updateProduct.isPending || uploading}
              >
                {createProduct.isPending || updateProduct.isPending
                  ? 'Saving...'
                  : uploading
                  ? 'Uploading image...'
                  : editingProduct
                  ? 'Update Product'
                  : 'Create Product'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={createProduct.isPending || updateProduct.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
