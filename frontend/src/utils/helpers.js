export function getSeverityColor(severity) {
  switch (severity) {
    case 'High':
      return '#e53935';
    case 'Medium':
      return '#fbc02d';
    case 'Low':
      return '#43a047';
    default:
      return '#757575';
  }
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

export function getStatusLabel(status) {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}
