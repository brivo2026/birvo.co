export const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  pending: 'Pendiente',
  resolved: 'Resuelta',
  closed: 'Cerrada',
  requires_human: 'Requiere atención',
};

export const CONVERSATION_STATUS_OPTIONS = Object.entries(CONVERSATION_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
