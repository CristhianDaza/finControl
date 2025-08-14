import { computed } from 'vue'
import { intlLocale } from '@/i18n/index.js'

export const useFormattedNumber = (model) => {
  return computed({
    get: () => {
      const val = Number(model.value)
      if (isNaN(val)) return ''
      const loc = intlLocale.value
      return new Intl.NumberFormat(loc).format(val)
    },
    set: (val) => {
      if (typeof val !== 'string') { model.value = val; return }
const s = val.replace(/\s/g, '')
      const lastDot = s.lastIndexOf('.')
      const lastComma = s.lastIndexOf(',')
      const lastSepIndex = Math.max(lastDot, lastComma)
      const hasSep = lastSepIndex !== -1

      const digitsOnly = s.replace(/\D/g, '')

      if (!hasSep) {
        model.value = digitsOnly
        return
      }

      const fracLen = s.length - lastSepIndex - 1

      if (fracLen <= 0) {
        model.value = digitsOnly
        return
      }

      if (fracLen > 2) {
         model.value = digitsOnly
        return
      }
      const intDigits = s.slice(0, lastSepIndex).replace(/\D/g, '')
      const fracDigits = s.slice(lastSepIndex + 1).replace(/\D/g, '').slice(0, 2)
      model.value = `${intDigits}.${fracDigits}`
    }
  })
}
