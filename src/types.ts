export interface Appraisal {
  id: string;
  address: string;
  city?: string | null;
  type: string;
  inspection_date: string;
  inspection_time: string;
  effective_date?: string | null;
  due_date: string;
  stats: string;
  client: string;
  lender?: string | null;
  fee: number;
  appraised_value?: number | null;
  color_category: string;
  status: 'CREATED' | 'ASSIGNED' | 'INSPECTED' | 'COMPLETED' | 'CANCELLED';
  lender_order_number?: string | null;
  client_order_number?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  fha_case_number?: string | null;
  sale_price?: number | null;
  created_at?: string;
  updated_at?: string;
  inspected_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  amount_due?: number | null;
  amount_paid?: number | null;
  paid_date?: string | null;
  payments?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface NetworkIp {
  name: string;
  address: string;
  isTailscale: boolean;
}

export interface HistoryAction {
  type: 'ADD' | 'DELETE' | 'UPDATE';
  appraisals: Appraisal[];
  beforeAppraisals?: Appraisal[];
}

export type CreateOrderDTO = Partial<Appraisal> & {
  client: string;
};

export type UpdateOrderDTO = Partial<Appraisal>;

