import { apiComplaintService } from './apiComplaintService';
import { complaintService as mockComplaintService } from './mockComplaintService';

// Default export uses the real backend API service with graceful fallback
export const complaintService = apiComplaintService;

export { apiComplaintService, mockComplaintService };
