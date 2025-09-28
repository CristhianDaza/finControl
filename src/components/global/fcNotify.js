import { reactive } from 'vue'

const state = reactive({ toasts: [] })
let seed = 0

const remove = id => {
  const i = state.toasts.findIndex(t => t.id === id)
  if (i > -1) state.toasts.splice(i, 1)
}

const push = (type, message, timeout = 3500) => {
  const id = ++seed
  state.toasts.push({ id, type, message })
  if (timeout > 0) setTimeout(() => remove(id), timeout)
  return id
}

export const useNotify = () => ({
  state,
  success: m => push('success', m),
  error: m => push('error', m),
  info: m => push('info', m),
  remove
})
