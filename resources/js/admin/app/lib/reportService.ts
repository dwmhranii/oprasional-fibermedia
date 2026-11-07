/**
 * Report Export Service
 * Integrates with Laravel API backend endpoints for Excel & PDF report generation
 */

import { API_BASE_URL, getAuthHeader, ApiError } from './api';

export const reportService = {
  /**
   * Export Submissions Report to Excel (.xlsx)
   * GET /api/reports/submissions/excel?status=...
   * Restricted to reports.view permission
   */
  exportSubmissionsExcel: async (status?: string): Promise<void> => {
    try {
      const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      const url = `${API_BASE_URL}/reports/submissions/excel${query}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: getAuthHeader() || '',
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
        },
      });

      if (!response.ok) {
        let errorMsg = 'Gagal mengunduh laporan Excel.';
        try {
          const jsonErr = await response.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch {
          // Response body is binary or non-json
        }
        throw new ApiError(errorMsg, response.status);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `Laporan_Pengajuan_Provisioning_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Gagal ekspor Excel:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menyambung ke server untuk ekspor Excel.', 500);
    }
  },

  /**
   * Export Single Submission Detail to PDF (.pdf)
   * GET /reports/submissions/{submissionId}/pdf
   */
  exportSubmissionPdf: async (submissionId: string | number): Promise<void> => {
    try {
      const url = `${API_BASE_URL}/reports/submissions/${submissionId}/pdf`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: getAuthHeader() || '',
          Accept: 'application/pdf, application/octet-stream, */*',
        },
      });

      if (!response.ok) {
        let errorMsg = 'Gagal mencetak dokumen PDF pengajuan.';
        try {
          const jsonErr = await response.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch {
          // Response body is binary or non-json
        }
        throw new ApiError(errorMsg, response.status);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `Dokumen_Detail_Pengajuan_${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Failed to export PDF detail:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menyambung ke server untuk unduh PDF.', 500);
    }
  },

  /**
   * Export BAST (Berita Acara Serah Terima) PDF
   * GET /reports/submissions/{submissionId}/bast
   */
  exportBastPdf: async (submissionId: string | number): Promise<void> => {
    try {
      const url = `${API_BASE_URL}/reports/submissions/${submissionId}/bast`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: getAuthHeader() || '',
          Accept: 'application/pdf, application/octet-stream, */*',
        },
      });

      if (!response.ok) {
        let errorMsg = 'Gagal mengunduh dokumen BAST PDF.';
        try {
          const jsonErr = await response.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch {
          // Response body is binary or non-json
        }
        throw new ApiError(errorMsg, response.status);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `BAST_SUB-${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Failed to export BAST PDF:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menyambung ke server untuk unduh BAST PDF.', 500);
    }
  },
};
