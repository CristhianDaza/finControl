const VALID_TYPES = new Set(['income', 'expense', 'debtPayment'])

export const validateTransactionPayload = (payload = {}) => {
  const errors = []
  const amount = Number(payload.amount)
  if (!(amount > 0)) {
    errors.push('InvalidAmount')
  }
  if (payload.type != null) {
    const t = String(payload.type).trim()
    if (!VALID_TYPES.has(t)) {
      errors.push('InvalidType')
    }
  }
  if (!payload.accountId && !payload.account) {
    errors.push('AccountRequired')
  }
  const date = payload.date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
    errors.push('InvalidDate')
  }
  return {
    valid: errors.length === 0,
    errors
  }
}
