export interface Appraisal {
  id: string;
  address: string;
  type: string;
  inspection_date: string;
  inspection_time: string;
  due_date: string;
  stats: string;
  client: string;
  fee: number;
  color_category: string;
  status: 'CREATED' | 'ASSIGNED' | 'INSPECTED' | 'COMPLETED' | 'CANCELLED';
  created_at?: string;
  updated_at?: string;
  inspected_at?: string;
  completed_at?: string;
  cancelled_at?: string;
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
