// =============================================================================
// JalSeva - Complete TypeScript Type Definitions
// =============================================================================

// --- Enum-like Union Types ---

export type UserRole = 'customer' | 'supplier' | 'admin';

export type WaterType = 'ro' | 'mineral' | 'tanker';

export type OrderStatus =
  | 'searching'
  | 'accepted'
  | 'en_route'
  | 'arriving'
  | 'delivered'
  | 'cancelled';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'cash';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type DemandLevel = 'low' | 'normal' | 'high' | 'surge';

// --- Core Domain Interfaces ---

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Rating {
  average: number;
  count: number;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar?: string;
  language: string;
  location?: GeoLocation;
  rating: Rating;
  createdAt: Date;
  updatedAt: Date;
}

// --- Supplier Interfaces ---

export interface DocumentInfo {
  url: string;
  verified: boolean;
  uploadedAt: Date;
}

export interface SupplierDocuments {
  aadhaar?: DocumentInfo;
  vehicleRC?: DocumentInfo;
  license?: DocumentInfo;
  fssai?: DocumentInfo;
  waterQuality?: DocumentInfo;
}

export interface Vehicle {
  type: string;
  capacity: number; // litres
  number: string;
}

export interface ServiceArea {
  center: GeoLocation;
  radiusKm: number;
}

export interface BankDetails {
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
}

export interface Supplier {
  id: string;
  userId: string;
  documents: SupplierDocuments;
  verificationStatus: VerificationStatus;
  vehicle: Vehicle;
  isOnline: boolean;
  currentLocation?: GeoLocation;
  serviceArea: ServiceArea;
  waterTypes: WaterType[];
  rating: Rating;
  bankDetails?: BankDetails;
}

// --- Order Interfaces ---

export interface OrderPrice {
  base: number;
  distance: number;
  surge: number;
  total: number;
  commission: number;
  supplierEarning: number;
}

export interface TrackingInfo {
  supplierLocation: GeoLocation;
  eta: number; // seconds
  distance: number; // meters
  polyline?: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  amount: number;
}

export interface OrderRating {
  customerRating?: number;
  supplierRating?: number;
  customerFeedback?: string;
  supplierFeedback?: string;
}

export interface BecknInfo {
  transactionId: string;
  messageId: string;
  bapId?: string;
  bppId?: string;
}

export interface Order {
  id: string;
  customerId: string;
  supplierId?: string;
  waterType: WaterType;
  quantityLitres: number;
  price: OrderPrice;
  status: OrderStatus;
  deliveryLocation: GeoLocation;
  supplierLocation?: GeoLocation;
  tracking?: TrackingInfo;
  payment: PaymentInfo;
  rating?: OrderRating;
  beckn?: BecknInfo;
  createdAt: Date;
  acceptedAt?: Date;
  pickedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

// --- Pricing & Admin Interfaces ---

export interface PricingZone {
  id: string;
  name: string;
  basePrice: Record<WaterType, number>;
  perKmRate: number;
  surgeMultiplier: number;
  demandLevel: DemandLevel;
}

export interface AdminSettings {
  commissionPercent: number;
  surgeThresholds: {
    high: number;
    surge: number;
  };
  maxDeliveryRadius: number;
  defaultLanguage: string;
}

// --- API / Request-Response Interfaces ---

export interface VoiceCommandIntent {
  waterType: WaterType;
  quantity: number;
  language: string;
}

export interface DemandPrediction {
  zone: string;
  predictedDemand: DemandLevel;
  confidence: number;
  nextHourEstimate: number;
  recommendations: string[];
}

export interface CreateOrderRequest {
  waterType: WaterType;
  quantityLitres: number;
  deliveryLocation: GeoLocation;
  paymentMethod: PaymentMethod;
}

export interface SupplierSearchResult {
  supplier: Supplier;
  distance: number; // meters
  eta: number; // seconds
  price: OrderPrice;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PayoutRequest {
  supplierId: string;
  amount: number;
  bankDetails: BankDetails;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export interface DistanceResult {
  distanceMeters: number;
  durationSeconds: number;
}

export interface ETAResult {
  eta: number; // seconds
  distance: number; // meters
  polyline?: string;
}
