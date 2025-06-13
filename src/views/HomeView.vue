<script setup>

</script>

<template>
  <section class="dashboard-grid">
    <div class="dashboard-card">
      <h3>Saldo Total</h3>
      <p class="amount">$2.500.000</p>
    </div>

    <div class="dashboard-card income">
      <h3>Ingresos</h3>
      <p class="amount">$3.200.000</p>
    </div>

    <div class="dashboard-card expense">
      <h3>Egresos</h3>
      <p class="amount">$700.000</p>
    </div>

    <div class="dashboard-card">
      <h3>Transacciones</h3>
      <p class="amount">24</p>
    </div>
  </section>
</template>


<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.dashboard-card {
  background-color: var(--primary-color);
  padding: 1.5rem;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 6px solid var(--accent-color);
  transition: transform 0.2s ease;
}

.dashboard-card:hover {
  transform: translateY(-4px);
}

.dashboard-card h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--muted-text-color);
}

.dashboard-card .amount {
  margin-top: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color);
}

.dashboard-card.income {
  border-left-color: var(--success-color);
}

.dashboard-card.expense {
  border-left-color: var(--error-color);
}

</style>
