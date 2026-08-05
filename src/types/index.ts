export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | 'superadmin';

export interface SavedAddress {
  id: string;
  label: 'Rumah' | 'Kantor' | 'Sekolah' | 'Tempat Favorit';
  name: string;
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatar: string;
  rating?: number;
  password?: string;
  storeName?: string;
  vehicleInfo?: string;
  savedAddresses?: SavedAddress[];
}

export interface Review {
  id: string;
  targetId: string; // storeId, driverId, or productId
  targetType: 'store' | 'driver' | 'product';
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  orderId?: string;
  rideId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  receiverRole?: UserRole;
  message: string;
  createdAt: string;
  isRead?: boolean;
}

export interface Store {
  id: string;
  ownerId?: string;
  name: string;
  category: 'Kuliner' | 'Hasil Tani' | 'Kerajinan' | 'Toko Kelontong' | 'Jasa';
  address: string;
  lat: number;
  lng: number;
  ownerName: string;
  phone: string;
  rating: number;
  reviewCount: number;
  image: string;
  isActive: boolean;
  description?: string;
}

export interface ProductVariantOption {
  id: string;
  name: string;
  extraPrice: number;
}

export interface ProductVariantGroup {
  id: string;
  name: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: ProductVariantOption[];
}

export interface SelectedVariant {
  groupName: string;
  optionName: string;
  extraPrice: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  description: string;
  ingredients?: string[];
  category: string;
  image: string;
  images?: string[]; // Up to 10 photos (Shopee style gallery)
  isAvailable: boolean;
  unit?: string;
  rating?: number;
  salesCount?: number;
  isPreOrder?: boolean;
  preOrderDays?: number;
  variantGroups?: ProductVariantGroup[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  selectedVariants?: SelectedVariant[];
}

export type OrderStatus = 'pending' | 'cooking' | 'ready_for_pickup' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
  selectedVariants?: SelectedVariant[];
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  storeId: string;
  storeName: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryFee: number;
  status: OrderStatus;
  paymentMethod?: 'qris' | 'cod';
  paymentStatus?: 'paid' | 'unpaid' | 'cod';
  isPaid?: boolean;
  deliveryAddress: string;
  lat: number;
  lng: number;
  createdAt: string;
  progressPercent?: number;
  isRated?: boolean;
  cancelReason?: string;
}

export type RideStatus = 'requested' | 'accepted' | 'arrived_pickup' | 'on_the_way' | 'completed' | 'cancelled';

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  fare: number;
  distanceKm: number;
  status: RideStatus;
  paymentMethod?: 'qris' | 'cod';
  paymentStatus?: 'paid' | 'unpaid' | 'cod';
  isPaid?: boolean;
  createdAt: string;
  progressPercent?: number;
  isRated?: boolean;
  cancelReason?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel: string;
  isOnline: boolean;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  activeJobType?: 'ride' | 'delivery';
  activeJobId?: string;
}

export interface PlacePOI {
  id: string;
  name: string;
  category: 'Pemerintahan' | 'Ibadah' | 'Pendidikan' | 'Kesehatan' | 'Olahraga' | 'Perdagangan' | 'Wisata' | 'Lainnya';
  icon: string;
  address: string;
  lat: number;
  lng: number;
  description?: string;
  image?: string;
}
