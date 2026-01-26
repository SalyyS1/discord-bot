'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit, Save, Tag, Settings2, Package, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSelectedGuild } from '@/hooks/use-selected-guild';

interface TicketProduct {
    id: string;
    name: string;
    emoji: string | null;
    description: string | null;
    assignedRoleIds: string[];
    assignedUserIds: string[];
    sortOrder: number;
    enabled: boolean;
}

export default function TicketProductsPage() {
    const { guildId, loading: guildLoading, error: guildError } = useSelectedGuild();
    const [dataLoading, setDataLoading] = useState(false);
    const [products, setProducts] = useState<TicketProduct[]>([]);
    const [error, setError] = useState<string | null>(null);
    const loading = guildLoading || dataLoading;

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<TicketProduct | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        emoji: '',
        description: '',
        assignedRoleIds: '', // Comma separated for now
        enabled: true,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!guildId) return;
        fetchData();
    }, [guildId]);

    async function fetchData() {
        if (!guildId) return;
        setDataLoading(true);
        setError(guildError);
        
        try {
            const res = await fetch(`/api/guilds/${guildId}/tickets/products`);
            const { data } = await res.json();
            setProducts(data || []);
        } catch {
            setError('Failed to load products');
        } finally {
            setDataLoading(false);
        }
    }

    const handleOpenDialog = (product?: TicketProduct) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                emoji: product.emoji || '',
                description: product.description || '',
                assignedRoleIds: product.assignedRoleIds.join(', '),
                enabled: product.enabled,
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                emoji: '',
                description: '',
                assignedRoleIds: '',
                enabled: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!guildId) return;

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                emoji: formData.emoji || null,
                description: formData.description || null,
                assignedRoleIds: formData.assignedRoleIds.split(',').map(id => id.trim()).filter(Boolean),
                enabled: formData.enabled,
            };

            let res;
            if (editingProduct) {
                res = await fetch(`/api/guilds/${guildId}/tickets/products/${editingProduct.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`/api/guilds/${guildId}/tickets/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                const { data } = await res.json();
                if (editingProduct) {
                    setProducts(prev => prev.map(p => p.id === data.id ? data : p));
                    toast.success('Product updated successfully');
                } else {
                    setProducts(prev => [...prev, data]);
                    toast.success('Product created successfully');
                }
                setIsDialogOpen(false);
            } else {
                toast.error('Failed to save product');
            }
        } catch {
            toast.error('Error saving product');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (!guildId || !confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`/api/guilds/${guildId}/tickets/products/${productId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== productId));
                toast.success('Product deleted');
            } else {
                toast.error('Failed to delete product');
            }
        } catch {
            toast.error('Error deleting product');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    <div>
                        <h2 className="text-2xl font-bold">Ticket Products</h2>
                        <p className="text-muted-foreground">Manage support categories and products</p>
                    </div>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                    <Card key={product.id} className="relative">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{product.emoji || '📦'}</span>
                                    <CardTitle className="text-lg">{product.name}</CardTitle>
                                </div>
                                <Badge variant={product.enabled ? 'default' : 'secondary'}>
                                    {product.enabled ? 'Active' : 'Disabled'}
                                </Badge>
                            </div>
                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                {product.description || 'No description provided'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Tag className="h-4 w-4" />
                                    <span>{product.assignedRoleIds.length} roles assigned</span>
                                </div>

                                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(product)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {products.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
                        <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No products created yet.</p>
                        <Button variant="link" onClick={() => handleOpenDialog()}>Create your first product</Button>
                    </div>
                )}
            </div>

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
                        <DialogDescription>
                            Configure product details and automated responses.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3">
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Premium Support"
                                />
                            </div>
                            <div>
                                <Label htmlFor="emoji">Emoji</Label>
                                <Input
                                    id="emoji"
                                    value={formData.emoji}
                                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                                    placeholder="💎"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description (shown in ticket menu)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Briefly describe this support category..."
                            />
                        </div>

                        <div>
                            <Label htmlFor="roles">Assigned Role IDs</Label>
                            <Input
                                id="roles"
                                value={formData.assignedRoleIds}
                                onChange={(e) => setFormData(prev => ({ ...prev, assignedRoleIds: e.target.value }))}
                                placeholder="123456789, 987654321 (Comma separated)"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Bot will ping these roles when a ticket is created.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Switch
                                id="enabled"
                                checked={formData.enabled}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                            />
                            <Label htmlFor="enabled">Enable this product</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !formData.name}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Product
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
