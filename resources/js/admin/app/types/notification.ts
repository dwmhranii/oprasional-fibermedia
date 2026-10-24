export interface NotificationData {
  type: string;
  message: string;
  title?: string;
  submission_id?: number;
  provisioning_id?: number;
  task_id?: number;
  sla_id?: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
