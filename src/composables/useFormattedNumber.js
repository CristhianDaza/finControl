import { computed } from 'vue'
import { intlLocale } from '@/i18n/index.js'

export const useFormattedNumber = (model) => {
  const getSeparators = (loc) => {
    try {
      const parts = new Intl.NumberFormat(loc).formatToParts(1000.1)
      const dec = parts.find(p => p.type === 'decimal')?.value || '.'
      const grp = parts.find(p => p.type === 'group')?.value || ','
      return { dec, grp }
    } catch {
      return { dec: '.', grp: ',' }
    }
  }

  return computed({
    get: () => {
      const raw = model.value
      const val = Number(raw)
      if (raw === '' || raw === null || raw === undefined || isNaN(val)) return ''
      const loc = intlLocale.value
   
      let minFrac = 0
      let maxFrac = 2
      if (typeof raw === 'string' && raw.includes('.')) {
        const frac = (raw.split('.')[1] || '').slice(0, 2)
        minFrac = Math.min(frac.length, 2)
      }
      return new Intl.NumberFormat(loc, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac }).format(val)
    },
    set: (val) => {
      if (typeof val !== 'string') { model.value = val; return }
      const loc = intlLocale.value
      const { dec, grp } = getSeparators(loc)

       let s = val.replace(/\s/g, '')
      if (grp) {
        const grpEsc = grp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        s = s.replace(new RegExp(grpEsc, 'g'), '')
      }
      if (dec && dec !== '.') {
        const decEsc = dec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        s = s.replace(new RegExp(decEsc, 'g'), '.')
      }
      
      s = s.replace(/,/g, '.')

      s = s.replace(/[^0-9.]/g, '')

      const parts = s.split('.')
      const intDigits = parts[0].replace(/\D/g, '')
      const fracDigits = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2)

      model.value = fracDigits.length ? `${intDigits}.${fracDigits}` : intDigits
    }
  })
}
