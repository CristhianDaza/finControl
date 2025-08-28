import { useGlobalLoadingStore } from '@/stores/loading.js'

export function createLoadingPlugin () {
  return ({ store, pinia }) => {
    if (store.$id === 'globalLoading') return
    const loading = useGlobalLoadingStore(pinia)

    const wrapFn = (fn) => {
      if (typeof fn !== 'function') return fn
      if (fn.__wrappedWithGlobalLoader) return fn
      const wrapped = function (...args) {
        let result
        try { result = fn.apply(this, args) } catch (e) { throw e }
        if (result && typeof result.then === 'function') {
          loading._inc()
          return result.finally(() => loading._dec())
        }
        return result
      }
      wrapped.__wrappedWithGlobalLoader = true
      return wrapped
    }

    if (store.$options && store.$options.actions) {
      for (const name of Object.keys(store.$options.actions)) {
        store[name] = wrapFn(store[name])
      }
    }

    for (const key of Object.keys(store)) {
      if (key.startsWith('$')) continue
      if (key === 'constructor') continue

      const val = store[key]
      if (typeof val === 'function') {
        store[key] = wrapFn(val)
      }
    }
  }
}
