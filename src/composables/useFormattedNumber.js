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
      model.value = val
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(/,(?=\d{3}(\D|$))/g, '')
        .replace(/[.,](\d{2,})$/, '.$1')
    }
  })
}
