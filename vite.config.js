import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    hmr: {
      overlay: false
    },
    host: '0.0.0.0',
    port: 5174
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-charts': ['chart.js'],
          
          // Feature-based chunks
          'auth': [
            './src/stores/auth.js',
            './src/composables/useAuth.js',
            './src/views/LoginView.vue'
          ],
          'transactions': [
            './src/stores/transactions.js',
            './src/composables/useTransactions.js',
            './src/views/TransactionsView.vue'
          ],
          'accounts': [
            './src/stores/accounts.js',
            './src/composables/useAccounts.js',
            './src/views/AccountsView.vue'
          ],
          'budgets': [
            './src/stores/budgets.js',
            './src/composables/useBudgets.js',
            './src/views/BudgetsView.vue'
          ],
          'goals': [
            './src/stores/goals.js',
            './src/composables/useGoals.js',
            './src/views/GoalsView.vue'
          ],
          'debts': [
            './src/stores/debts.js',
            './src/composables/useDebts.js',
            './src/views/DebtsView.vue'
          ],
          'admin': [
            './src/stores/admin.js',
            './src/composables/useAdmin.js',
            './src/views/AdminDashboard.vue'
          ]
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['chart.js'] // Let chart.js be tree-shaken
  },
  // Bundle analyzer configuration
  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})
