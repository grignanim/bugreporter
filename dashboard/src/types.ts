export type Priority = 'low' | 'medium' | 'high';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'closed';

export interface Company {
  id: string;
  name: string;
  slug: string;
  password?: string;
  members: string[];
}

export interface Report {
  id: string;
  companyId: string;
  title: string;
  description: string;
  priority: Priority;
  status: ReportStatus;
  reporter: string;
  url: string;
  attachmentUrl: string;
  createdAt: string;
  internalNotes?: string;
  portal?: string;
  correlationId?: string;
  userCredentials?: string;
}

export interface Settings {
  globalClientPassword?: string;
  adminPassword?: string;
}
