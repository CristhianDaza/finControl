const messages = {
  es: {
    common: {
      loading: 'Cargando…',
      empty: 'Aún no tienes cuentas',
      retry: 'Reintentar',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Agregar',
      type: 'Tipo',
      from: 'Desde',
      to: 'Hasta',
    },
    currency: {
      default: 'COP',
      invalid: 'Moneda inválida',
    },
    accounts: {
      title: 'Cuentas',
      addButton: 'Agregar Cuenta',
      editTitle: 'Editar Cuenta',
      addTitle: 'Agregar Cuenta',
      form: {
        name: 'Nombre de la Cuenta',
        namePlaceholder: 'Ej: Ahorros, Efectivo, Tarjeta',
        nameError: 'El nombre es obligatorio y debe tener un máximo de 40 caracteres',
        balance: 'Saldo Inicial',
        balanceError: 'El saldo es obligatorio y debe ser un número positivo',
        currency: 'Moneda',
      },
      notifications: {
        created: 'Cuenta creada',
        updated: 'Cuenta actualizada',
        deleted: 'Cuenta eliminada',
        deleteBlocked: 'No se puede eliminar la cuenta porque tiene transacciones asociadas.',
      },
      confirmDelete: {
        title: 'Eliminar cuenta',
        message: 'No puedes eliminar una cuenta con transacciones. Puedes mover o eliminar las transacciones antes de eliminar la cuenta.',
        cta: 'Ver transacciones',
      },
    },
    transactions: {
      addTitle: 'Agregar Transacción',
      editTitle: 'Editar Transacción',
      empty: 'No hay transacciones',
      form: {
        description: 'Descripción',
        descriptionPlaceholder: 'Ej: Pago de arriendo',
        descriptionError: 'La descripción es obligatoria y debe ser corta',
        amount: 'Monto',
        amountError: 'Ingresa un valor mayor a 0',
        type: 'Tipo',
        income: 'Ingreso',
        expense: 'Gasto',
        account: 'Cuenta',
        accountError: 'Selecciona una cuenta válida',
        date: 'Fecha',
        dateError: 'La fecha es obligatoria',
      },
      notifications: {
        created: 'Transacción creada',
        updated: 'Transacción actualizada',
        deleted: 'Transacción eliminada',
        balanceNegative: 'La operación dejaría la cuenta con saldo negativo',
        accountNotFound: 'Cuenta no encontrada',
        unauthorized: 'Operación no autorizada',
      },
      confirmDelete: {
        title: 'Eliminar transacción',
        message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      }
    }
  }
}

let currentLocale = 'es'
export const setLocale = (locale) => { currentLocale = locale || 'es' }
export const t = (path, params) => {
  const parts = path.split('.')
  let val = messages[currentLocale]
  for (const p of parts) {
    if (!val) break
    val = val[p]
  }
  if (val == null) return path
  if (params && typeof val === 'string') {
    return val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '')
  }
  return val
}
