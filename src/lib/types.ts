export type Role = 'seller' | 'buyer' | 'admin';
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type Commodity = 'grain' | 'corn' | 'sunflower' | 'rapeseed' | 'sugar' | 'meal';
export type DeliveryBasis = 'EXW' | 'CPT' | 'FOB' | 'DAP';
export type ContractType = 'sales' | 'contracting' | 'forward';
export type DealStatus = 'new' | 'in_progress' | 'completed';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  display_name: string | null;
  phone: string | null;
  kyc_status: KycStatus;
  kyc_submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycRecord {
  id: string;
  user_id: string;
  company_type: 'legal' | 'entrepreneur' | null;
  legal_name: string;
  usreou: string;
  bank_name: string;
  iban: string;
  register_extract_path: string | null;
  tax_certificate_path: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  seller_id: string;
  title: string;
  commodity: Commodity;
  volume_tons: number;
  price_per_ton: number;
  delivery_basis: DeliveryBasis;
  harvest_year: number;
  moisture: number | null;
  protein: number | null;
  foreign_matter: number | null;
  description: string | null;
  media_paths: string[];
  warehouse_cert_path: string;
  ttn_lab_path: string | null;
  specifications_path: string | null;
  quality_cert_path: string | null;
  region: string | null;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  advertisement_id: string;
  buyer_id: string;
  seller_id: string;
  contract_type: ContractType;
  deposit_amount: number;
  has_deposit: boolean;
  buyer_signed_external: boolean;
  seller_signed_external: boolean;
  buyer_signed_native: boolean;
  seller_signed_native: boolean;
  buyer_signed_physical: boolean;
  seller_signed_physical: boolean;
  status: DealStatus;
  attachments: string[];
  contract_pdf_path: string | null;
  buyer_signed_path: string | null;
  seller_signed_path: string | null;
  deposit_paid: boolean;
  final_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: string;
  commodity: Commodity;
  delivery_basis: DeliveryBasis;
  price_uah: number;
  region: string | null;
  recorded_on: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  author: string | null;
  image_url: string | null;
  published_at: string;
}

export interface ContractTemplate {
  id: string;
  contract_type: ContractType;
  title: string;
  template_body: string;
  is_active: boolean;
  updated_at: string;
}

export const COMMODITY_LABELS: Record<Commodity, string> = {
  grain: 'Зерно (пшениця)',
  corn: 'Кукурудза',
  sunflower: 'Соняшник',
  rapeseed: 'Ріпак',
  sugar: 'Цукор',
  meal: 'Шрот',
};

export const COMMODITY_SHORT: Record<Commodity, string> = {
  grain: 'Пшениця',
  corn: 'Кукурудза',
  sunflower: 'Соняшник',
  rapeseed: 'Ріпак',
  sugar: 'Цукор',
  meal: 'Шрот',
};

export const COMMODITY_ICONS: Record<Commodity, string> = {
  grain: '🌾',
  corn: '🌽',
  sunflower: '🌻',
  rapeseed: '🌱',
  sugar: '🍬',
  meal: '🥜',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  sales: 'Договір купівлі-продажу',
  contracting: 'Договір контрактації',
  forward: 'Форвардний контракт',
};

export const CONTRACT_TYPE_HINT: Record<ContractType, string> = {
  sales: 'В наявності — товар готовий до відвантаження',
  contracting: 'Вирощування — продукція ще на стадії виробництва',
  forward: 'Майбутній врожай — поставка після збирання',
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  new: 'Очікує сплати завдатку',
  in_progress: 'В роботі',
  completed: 'Завершена',
};
