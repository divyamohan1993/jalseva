'use client';
export const dynamic = 'force-dynamic';

// =============================================================================
// JalSeva - Supplier Management Page
// =============================================================================
// Full CRUD management for suppliers: table view with filters, search,
// side-panel details, approve/reject with confirmation modal, document viewing.
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import {
  Search,
  CheckCircle,
  XCircle,
  X,
  Phone,
  MapPin,
  Star,
  FileText,
  Truck,
  Eye,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Supplier, VerificationStatus, } from '@/types';

// =============================================================================
// Types
// =============================================================================

type FilterTab = 'all' | 'pending' | 'verified' | 'rejected';

interface SupplierWithUser extends Supplier {
  userName?: string;
  userPhone?: string;
}

// =============================================================================
// Filter Tabs
// =============================================================================

const FILTER_TABS: { key: FilterTab; label: string; count?: number }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

// =============================================================================
// Supplier Management Component
// =============================================================================

export default function SuppliersPage() {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [suppliers, setSuppliers] = useState<SupplierWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithUser | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmSupplierId, setConfirmSupplierId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);

  // --------------------------------------------------------------------------
  // Firestore listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      orderBy('userId')
    );

    const unsubscribe = onSnapshot(suppliersQuery, async (snapshot) => {
      const supplierList: SupplierWithUser[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const supplier: SupplierWithUser = {
          id: docSnap.id,
          userId: data.userId || '',
          documents: data.documents || {},
          verificationStatus: data.verificationStatus || 'pending',
          vehicle: data.vehicle || { type: '', capacity: 0, number: '' },
          isOnline: data.isOnline || false,
          currentLocation: data.currentLocation || undefined,
          serviceArea: data.serviceArea || { center: { lat: 0, lng: 0 }, radiusKm: 10 },
          waterTypes: data.waterTypes || [],
          rating: data.rating || { average: 0, count: 0 },
          bankDetails: data.bankDetails || undefined,
          supportsSubscription: data.supportsSubscription ?? false,
          userName: data.userName || data.name || '',
          userPhone: data.userPhone || data.phone || '',
        };

        // Try to fetch user name/phone if not embedded
        if (!supplier.userName && supplier.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', supplier.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              supplier.userName = userData.name || '';
              supplier.userPhone = userData.phone || '';
            }
          } catch {
            // Silently continue if user fetch fails
          }
        }

        supplierList.push(supplier);
      }

      setSuppliers(supplierList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading suppliers:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // Filtered & searched suppliers
  // --------------------------------------------------------------------------
  const filteredSuppliers = useMemo(() => {
    let result = suppliers;

    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter((s) => s.verificationStatus === activeFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.userName || '').toLowerCase().includes(q) ||
          (s.userPhone || '').toLowerCase().includes(q) ||
          (s.vehicle.number || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [suppliers, activeFilter, searchQuery]);

  // Count by status
  const counts = useMemo(() => {
    return {
      all: suppliers.length,
      pending: suppliers.filter((s) => s.verificationStatus === 'pending').length,
      verified: suppliers.filter((s) => s.verificationStatus === 'verified').length,
      rejected: suppliers.filter((s) => s.verificationStatus === 'rejected').length,
    };
  }, [suppliers]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const handleApproveReject = (supplierId: string, action: 'approve' | 'reject') => {
    setConfirmSupplierId(supplierId);
    setConfirmAction(action);
  };

  const executeAction = async () => {
    if (!confirmSupplierId || !confirmAction) return;
    setActionLoading(true);

    try {
      const newStatus: VerificationStatus =
        confirmAction === 'approve' ? 'verified' : 'rejected';

      await updateDoc(doc(db, 'suppliers', confirmSupplierId), {
        verificationStatus: newStatus,
      });

      // Update local selected supplier if it's the same
      if (selectedSupplier?.id === confirmSupplierId) {
        setSelectedSupplier({
          ...selectedSupplier,
          verificationStatus: newStatus,
        });
      }
    } catch (error) {
      console.error('Error updating supplier status:', error);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setConfirmSupplierId(null);
    }
  };

  const openDetails = (supplier: SupplierWithUser) => {
    setSelectedSupplier(supplier);
    setSidePanelOpen(true);
  };

  // --------------------------------------------------------------------------
  // Document list helper
  // --------------------------------------------------------------------------
  const getDocumentList = (supplier: SupplierWithUser) => {
    const docs: { name: string; key: string; info: { url: string; verified: boolean; uploadedAt?: Date } | undefined }[] = [
      { name: 'Aadhaar Card', key: 'aadhaar', info: supplier.documents?.aadhaar },
      { name: 'Vehicle RC', key: 'vehicleRC', info: supplier.documents?.vehicleRC },
      { name: 'Driving License', key: 'license', info: supplier.documents?.license },
      { name: 'FSSAI License', key: 'fssai', info: supplier.documents?.fssai },
      { name: 'Water Quality Report', key: 'waterQuality', info: supplier.documents?.waterQuality },
    ];
    return docs;
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and verify water tanker suppliers
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium">
            {counts.verified} Verified
          </span>
          <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-medium">
            {counts.pending} Pending
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500',
                  activeFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, or vehicle number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              size="sm"
            />
          </div>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Suppliers Table                                                    */}
      {/* ================================================================== */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Online</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading suppliers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    {searchQuery ? 'No suppliers match your search' : 'No suppliers found'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDetails(supplier)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {supplier.userName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 sm:hidden">
                            {supplier.userPhone || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {supplier.userPhone || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-700 font-medium">
                          {supplier.vehicle.number || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {supplier.vehicle.type} - {supplier.vehicle.capacity}L
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={supplier.verificationStatus as any}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-gray-700 font-medium">
                          {supplier.rating.average.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({supplier.rating.count})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          supplier.isOnline ? 'text-green-600' : 'text-gray-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            supplier.isOnline ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        />
                        {supplier.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {supplier.verificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveReject(supplier.id, 'approve')}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveReject(supplier.id, 'reject')}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openDetails(supplier)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Side Panel - Supplier Details                                      */}
      {/* ================================================================== */}
      {sidePanelOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidePanelOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Details</h3>
              <button
                onClick={() => setSidePanelOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">
                  {selectedSupplier.userName || 'Unknown'}
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge
                    variant={selectedSupplier.verificationStatus as any}
                    size="lg"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {selectedSupplier.userPhone || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    Service radius: {selectedSupplier.serviceArea.radiusKm} km
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm text-gray-700">
                    {selectedSupplier.rating.average.toFixed(1)} rating ({selectedSupplier.rating.count} reviews)
                  </span>
                </div>
              </div>

              {/* Vehicle Info */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Vehicle Details</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">{selectedSupplier.vehicle.type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Number</span>
                    <span className="font-medium text-gray-900 font-mono">{selectedSupplier.vehicle.number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium text-gray-900">{selectedSupplier.vehicle.capacity} litres</span>
                  </div>
                </div>
              </div>

              {/* Water Types */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Water Types</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplier.waterTypes.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium capitalize"
                    >
                      {type === 'ro' ? 'RO Water' : type === 'mineral' ? 'Mineral Water' : 'Tanker Water'}
                    </span>
                  ))}
                  {selectedSupplier.waterTypes.length === 0 && (
                    <span className="text-sm text-gray-400">No water types specified</span>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Documents</h5>
                <div className="space-y-2">
                  {getDocumentList(selectedSupplier).map((docItem) => (
                    <div
                      key={docItem.key}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        docItem.info
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileText
                          className={cn(
                            'w-4 h-4',
                            docItem.info ? 'text-blue-500' : 'text-gray-300'
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {docItem.name}
                          </p>
                          {docItem.info?.verified && (
                            <p className="text-xs text-green-600">Verified</p>
                          )}
                        </div>
                      </div>
                      {docItem.info?.url ? (
                        <button
                          onClick={() =>
                            setPreviewDoc({ name: docItem.name, url: docItem.info!.url })
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Not uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Details */}
              {selectedSupplier.bankDetails && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Bank Details</h5>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Account Holder</span>
                      <span className="font-medium text-gray-900">
                        {selectedSupplier.bankDetails.accountHolderName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Account No.</span>
                      <span className="font-medium text-gray-900 font-mono">
                        ****{selectedSupplier.bankDetails.accountNumber.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">IFSC</span>
                      <span className="font-medium text-gray-900 font-mono">
                        {selectedSupplier.bankDetails.ifsc}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedSupplier.verificationStatus === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handleApproveReject(selectedSupplier.id, 'approve')}
                  >
                    Approve Supplier
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => handleApproveReject(selectedSupplier.id, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {selectedSupplier.verificationStatus === 'rejected' && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handleApproveReject(selectedSupplier.id, 'approve')}
                  >
                    Re-approve Supplier
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Confirmation Modal                                                 */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => {
          setConfirmAction(null);
          setConfirmSupplierId(null);
        }}
        title={confirmAction === 'approve' ? 'Approve Supplier' : 'Reject Supplier'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
            {confirmAction === 'approve' ? (
              <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
            )}
            <p className="text-sm text-gray-700">
              {confirmAction === 'approve'
                ? 'This will verify the supplier and allow them to accept orders on the platform. Please ensure all documents have been reviewed.'
                : 'This will reject the supplier application. The supplier will be notified and can re-apply after addressing issues.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setConfirmAction(null);
                setConfirmSupplierId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'approve' ? 'secondary' : 'danger'}
              fullWidth
              loading={actionLoading}
              onClick={executeAction}
            >
              {confirmAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* Document Preview Modal                                             */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name || 'Document'}
        size="lg"
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-xl p-2 min-h-[300px] flex items-center justify-center">
              {previewDoc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <Image
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  width={400}
                  height={400}
                  className="max-w-full max-h-[400px] rounded-lg object-contain"
                  unoptimized
                />
              ) : previewDoc.url.match(/\.pdf$/i) ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[400px] rounded-lg"
                  title={previewDoc.name}
                />
              ) : (
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Preview not available</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
