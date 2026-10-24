export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    
    const now = new Date();
    // Convert to Jakarta timezone to compare
    const tzOffset = 7 * 60; // UTC+7 for Asia/Jakarta
    
    // Format time (HH.mm WIB)
    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
    const timeStr = timeFormatter.format(d).replace(':', '.') + ' WIB';

    // Format full date
    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
    
    // To calculate today/yesterday, we format both to local string day/month/year in Jakarta
    const checkDateFormatter = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
    
    const targetDateStr = checkDateFormatter.format(d);
    const todayStr = checkDateFormatter.format(now);
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = checkDateFormatter.format(yesterday);

    if (targetDateStr === todayStr) {
      return `Hari ini, ${timeStr}`;
    }
    
    if (targetDateStr === yesterdayStr) {
      return `Kemarin, ${timeStr}`;
    }

    return `${dateFormatter.format(d)}, ${timeStr}`;
  } catch {
    return dateStr;
  }
};

export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export const formatDateOnly = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    }).format(d);
  } catch {
    return dateStr;
  }
};
