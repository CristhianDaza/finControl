import { computed } from 'vue'

export const useFormattedNumber = (model) => {
  return computed({
    get: () => {
      const val = Number(model.value)
      return isNaN(val)
        ? ''
        : val.toLocaleString('es-CO') // o 'de-DE' para puntos
    },
    set: (val) => {
      model.value = val.replace(/\./g, '').replace(',', '.')
    }
  })
}
