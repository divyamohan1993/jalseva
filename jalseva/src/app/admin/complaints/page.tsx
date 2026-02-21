'use client';
export const dynamic = 'force-dynamic';

// =============================================================================
// JalSeva - Complaint Management Page
// =============================================================================
// Lists all complaints from orders. Supports filtering by status, reply/resolve
// functionality, and links to related orders.
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  MessageSquareWarning,
  Search,
  ChevronRight,
  X,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  ExternalLink,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Card, } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

interface Complaint {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  text: string;
  status: ComplaintStatus;
  category?: string;
  adminReply?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
}

type FilterTab = 'all' | ComplaintStatus;

// =============================================================================
// Constants
// =============================================================================

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  open: {
    label: 'Open',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: AlertTriangle,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle,
  },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

// =============================================================================
// Complaint Management Component
// =============================================================================

export default function ComplaintsPage() {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected complaint for reply/resolve
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Resolve confirmation
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Firestore listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const complaintsQuery = query(
      collection(db, 'complaints'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
      const complaintList: Complaint[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        complaintList.push({
          id: docSnap.id,
          orderId: data.orderId || '',
          customerId: data.customerId || '',
          customerName: data.customerName || data.name || 'Unknown Customer',
          customerPhone: data.customerPhone || data.phone || '',
          text: data.text || data.message || data.complaint || '',
          status: data.status || 'open',
          category: data.category || undefined,
          adminReply: data.adminReply || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
          resolvedAt: data.resolvedAt?.toDate?.() || undefined,
        });
      });

      setComplaints(complaintList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading complaints:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // Filtered & searched complaints
  // --------------------------------------------------------------------------
  const filteredComplaints = useMemo(() => {
    let result = complaints;

    // Status filter
    if (activeFilter !== 'all') {
      result = result.filter((c) => c.status === activeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.orderId.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.text.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [complaints, activeFilter, searchQuery]);

  // Status counts
  const counts = useMemo(() => {
    return {
      all: complaints.length,
      open: complaints.filter((c) => c.status === 'open').length,
      in_progress: complaints.filter((c) => c.status === 'in_progress').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
    };
  }, [complaints]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const handleSendReply = async () => {
    if (!selectedComplaint || !replyText.trim()) return;
    setReplyLoading(true);

    try {
      const updates: Record<string, any> = {
        adminReply: replyText.trim(),
        updatedAt: Timestamp.now(),
      };

      // If complaint was open, move to in_progress when replying
      if (selectedComplaint.status === 'open') {
        updates.status = 'in_progress';
      }

      await updateDoc(doc(db, 'complaints', selectedComplaint.id), updates);

      setSelectedComplaint({
        ...selectedComplaint,
        adminReply: replyText.trim(),
        status: selectedComplaint.status === 'open' ? 'in_progress' : selectedComplaint.status,
        updatedAt: new Date(),
      });

      setReplyText('');
      toast.success('Reply sent successfully');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    setResolveLoading(true);

    try {
      await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setSelectedComplaint({
        ...selectedComplaint,
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      });

      setResolveModalOpen(false);
      toast.success('Complaint resolved');
    } catch (error) {
      console.error('Error resolving complaint:', error);
      toast.error('Failed to resolve complaint');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleStatusChange = async (complaint: Complaint, newStatus: ComplaintStatus) => {
    try {
      const updates: Record<string, any> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      if (newStatus === 'resolved') {
        updates.resolvedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'complaints', complaint.id), updates);
      toast.success(`Status changed to ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setReplyText('');
    setDetailOpen(true);
  };

  // --------------------------------------------------------------------------
  // Format helpers
  // --------------------------------------------------------------------------
  const _formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer complaints and support tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.open > 0 && (
            <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {counts.open} Open
            </span>
          )}
          {counts.in_progress > 0 && (
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              {counts.in_progress} In Progress
            </span>
          )}
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
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
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
              placeholder="Search by Order ID, customer name, or complaint text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              size="sm"
            />
          </div>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Complaints List                                                    */}
      {/* ================================================================== */}
      <div className="space-y-3">
        {loading ? (
          <Card padding="lg">
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading complaints...</span>
              </div>
            </div>
          </Card>
        ) : filteredComplaints.length === 0 ? (
          <Card padding="lg">
            <div className="flex flex-col items-center py-12">
              <MessageSquareWarning className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                {searchQuery
                  ? 'No complaints match your search'
                  : activeFilter !== 'all'
                  ? `No ${STATUS_CONFIG[activeFilter as ComplaintStatus]?.label.toLowerCase()} complaints`
                  : 'No complaints yet'}
              </p>
            </div>
          </Card>
        ) : (
          filteredComplaints.map((complaint) => {
            const statusConfig = STATUS_CONFIG[complaint.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={complaint.id}
                padding="none"
                hover
                className="overflow-hidden"
                onClick={() => openDetail(complaint)}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Status badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
                            statusConfig.bgColor,
                            statusConfig.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>

                        {/* Order link */}
                        <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          #{complaint.orderId.slice(0, 8)}
                        </span>

                        {/* Category */}
                        {complaint.category && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {complaint.category}
                          </span>
                        )}

                        {/* Time */}
                        <span className="text-xs text-gray-400">
                          {getTimeSince(complaint.createdAt)}
                        </span>
                      </div>

                      {/* Customer name */}
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {complaint.customerName}
                        {complaint.customerPhone && (
                          <span className="text-xs text-gray-400 font-normal ml-2">
                            {complaint.customerPhone}
                          </span>
                        )}
                      </p>

                      {/* Complaint text */}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {complaint.text}
                      </p>

                      {/* Admin reply indicator */}
                      {complaint.adminReply && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs text-blue-600 font-medium">
                            Admin replied
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Action arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-1" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Results count */}
      {!loading && filteredComplaints.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </p>
      )}

      {/* ================================================================== */}
      {/* Complaint Detail Side Panel                                        */}
      {/* ================================================================== */}
      {detailOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDetailOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Complaint Details
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  #{selectedComplaint.id.slice(0, 12)}
                </p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border',
                    STATUS_CONFIG[selectedComplaint.status].bgColor,
                    STATUS_CONFIG[selectedComplaint.status].color
                  )}
                >
                  {React.createElement(STATUS_CONFIG[selectedComplaint.status].icon, {
                    className: 'w-4 h-4',
                  })}
                  {STATUS_CONFIG[selectedComplaint.status].label}
                </span>

                {/* Quick status change */}
                {selectedComplaint.status !== 'resolved' && (
                  <div className="flex items-center gap-1">
                    {selectedComplaint.status === 'open' && (
                      <button
                        onClick={() =>
                          handleStatusChange(selectedComplaint, 'in_progress')
                        }
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        Mark In Progress
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Related Order */}
              <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Order #{selectedComplaint.orderId.slice(0, 8)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Navigate to orders page - in a real app, this would deep-link
                    window.open(`/admin/orders`, '_blank');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View Order
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Customer Info */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Customer</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-900">
                      {selectedComplaint.customerName}
                    </span>
                  </div>
                  {selectedComplaint.customerPhone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-gray-900">
                        {selectedComplaint.customerPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Filed</span>
                    <span className="text-gray-700">
                      {formatDateTime(selectedComplaint.createdAt)}
                    </span>
                  </div>
                  {selectedComplaint.category && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category</span>
                      <span className="text-gray-700 capitalize">
                        {selectedComplaint.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Complaint Text */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">
                  Complaint
                </h5>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.text}
                  </p>
                </div>
              </div>

              {/* Admin Reply (if exists) */}
              {selectedComplaint.adminReply && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">
                    Admin Response
                  </h5>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                      {selectedComplaint.adminReply}
                    </p>
                    {selectedComplaint.updatedAt && (
                      <p className="text-xs text-blue-400 mt-2">
                        Replied {formatDateTime(selectedComplaint.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Resolution Info */}
              {selectedComplaint.resolvedAt && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Resolved
                    </p>
                    <p className="text-xs text-green-600">
                      {formatDateTime(selectedComplaint.resolvedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {selectedComplaint.status !== 'resolved' && (
              <div className="border-t border-gray-200 p-4 space-y-3 shrink-0 bg-white">
                {/* Reply input */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the customer..."
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 text-sm py-2.5 px-4 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={
                        replyLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )
                      }
                      disabled={!replyText.trim() || replyLoading}
                      onClick={handleSendReply}
                      className="h-full"
                    >
                      Reply
                    </Button>
                  </div>
                </div>

                {/* Resolve button */}
                <Button
                  variant="secondary"
                  fullWidth
                  size="sm"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => setResolveModalOpen(true)}
                >
                  Mark as Resolved
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Resolve Confirmation Modal                                         */}
      {/* ================================================================== */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Complaint"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50">
            <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                Mark this complaint as resolved? The customer will be notified that
                their issue has been addressed.
              </p>
              {!selectedComplaint?.adminReply && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  Note: No reply has been sent yet. Consider replying before resolving.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setResolveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              fullWidth
              loading={resolveLoading}
              onClick={handleResolve}
            >
              Resolve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
