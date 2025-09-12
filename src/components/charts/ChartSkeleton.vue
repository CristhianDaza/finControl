<template>
  <div class="chart-skeleton" :style="{ height: height + 'px' }">
    <div class="skeleton-header">
      <div class="skeleton-title"></div>
    </div>
    <div class="skeleton-chart">
      <div class="skeleton-bars" v-if="type === 'bar'">
        <div 
          v-for="i in barCount" 
          :key="i" 
          class="skeleton-bar"
          :style="{ height: Math.random() * 60 + 20 + '%' }"
        ></div>
      </div>
      <div class="skeleton-doughnut" v-else-if="type === 'doughnut'">
        <div class="skeleton-circle"></div>
      </div>
      <div class="skeleton-line" v-else-if="type === 'line'">
        <svg viewBox="0 0 300 150" class="skeleton-svg">
          <path 
            d="M 10 100 Q 50 80 100 90 T 200 70 T 290 85" 
            stroke="currentColor" 
            fill="none" 
            stroke-width="2"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'bar',
    validator: (value) => ['bar', 'doughnut', 'line'].includes(value)
  },
  height: {
    type: Number,
    default: 300
  },
  barCount: {
    type: Number,
    default: 12
  }
})
</script>

<style scoped>
.chart-skeleton {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: var(--primary-color);
  border-radius: 8px;
  animation: pulse 2s ease-in-out infinite;
}

.skeleton-header {
  margin-bottom: 1rem;
}

.skeleton-title {
  width: 120px;
  height: 16px;
  background: var(--secondary-color);
  border-radius: 4px;
  animation: shimmer 2s ease-in-out infinite;
}

.skeleton-chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.skeleton-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  width: 100%;
  height: 200px;
}

.skeleton-bar {
  flex: 1;
  background: var(--secondary-color);
  border-radius: 2px 2px 0 0;
  animation: shimmer 2s ease-in-out infinite;
}

.skeleton-bar:nth-child(odd) {
  animation-delay: 0.2s;
}

.skeleton-doughnut {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
}

.skeleton-circle {
  width: 150px;
  height: 150px;
  border: 20px solid var(--secondary-color);
  border-radius: 50%;
  border-top-color: var(--accent-color);
  animation: spin 2s linear infinite;
}

.skeleton-line {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-svg {
  width: 100%;
  height: 100%;
  color: var(--secondary-color);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton-title,
.skeleton-bar {
  background: linear-gradient(
    90deg,
    var(--secondary-color) 0px,
    var(--primary-color) 40px,
    var(--secondary-color) 80px
  );
  background-size: 200px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
