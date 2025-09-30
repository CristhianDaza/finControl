<script setup>
defineProps({
  type: {
    type: String,
    default: 'bar',
    validator: (value) => ['bar', 'doughnut', 'line', 'generic'].includes(value)
  },
  height: {
    type: Number,
    default: 300
  }
})
</script>

<template>
  <div class="chart-skeleton" :style="{ height: height + 'px' }">
    <div class="skeleton-content">
      <div v-if="type === 'bar'" class="bar-skeleton">
        <div class="skeleton-legend">
          <div class="legend-item"></div>
          <div class="legend-item"></div>
        </div>
        <div class="bars-container">
          <div
            v-for="i in 20"
            :key="i"
            class="skeleton-bar"
            :style="{
              height: Math.random() * 80 + 20 + '%',
              animationDelay: i * 50 + 'ms'
            }"
          ></div>
        </div>
      </div>

      <div v-else-if="type === 'doughnut'" class="doughnut-skeleton">
        <div class="skeleton-donut">
          <div class="donut-ring"></div>
          <div class="donut-center"></div>
        </div>
        <div class="skeleton-legend bottom">
          <div class="legend-item"></div>
          <div class="legend-item"></div>
          <div class="legend-item"></div>
        </div>
      </div>

      <div v-else-if="type === 'line'" class="line-skeleton">
        <div class="skeleton-legend">
          <div class="legend-item large"></div>
        </div>
        <div class="line-container">
          <svg class="skeleton-line-svg" viewBox="0 0 400 200">
            <path
              class="skeleton-line-path"
              d="M 0 180 Q 50 120 100 140 T 200 100 T 300 120 T 400 80"
              fill="none"
              stroke="url(#gradient)"
              stroke-width="3"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color: var(--accent-color); stop-opacity: 0.6" />
                <stop offset="50%" style="stop-color: var(--accent-color); stop-opacity: 0.8" />
                <stop offset="100%" style="stop-color: var(--accent-color); stop-opacity: 0.6" />
              </linearGradient>
            </defs>
          </svg>
          <div class="skeleton-points">
            <div
              v-for="i in 8"
              :key="i"
              class="skeleton-point"
              :style="{
                left: (i * 12.5) + '%',
                top: Math.random() * 60 + 20 + '%',
                animationDelay: i * 100 + 'ms'
              }"
            ></div>
          </div>
        </div>
      </div>

      <div v-else class="generic-skeleton">
        <div class="skeleton-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-body">
          <div class="skeleton-chart-area"></div>
        </div>
      </div>
    </div>

    <div class="loading-indicator">
      <div class="loading-spinner"></div>
      <p class="loading-text">Cargando gráfico...</p>
    </div>
  </div>
</template>

<style scoped>
.chart-skeleton {
  position: relative;
  width: 100%;
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.02));
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
}

.skeleton-content {
  width: 100%;
  height: 100%;
  padding: 2rem;
  position: relative;
}

@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: 200px 0;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-4px) scale(1.1);
  }
}

.skeleton-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.skeleton-legend.bottom {
  margin-bottom: 0;
  margin-top: 2rem;
}

.legend-item {
  height: 16px;
  border-radius: 20px;
  background: linear-gradient(
    90deg,
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.3),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1)
  );
  background-size: 200px 100%;
  animation: shimmer 2s infinite;
  width: 80px;
}

.legend-item.large {
  width: 120px;
}

.bar-skeleton {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bars-container {
  flex: 1;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2px;
  padding: 0 1rem;
}

.skeleton-bar {
  width: 100%;
  max-width: 20px;
  background: linear-gradient(
    180deg,
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.4),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.2),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1)
  );
  border-radius: 4px 4px 0 0;
  animation: pulse 2s infinite;
  transition: all 0.3s ease;
}

.skeleton-bar:hover {
  transform: scale(1.05);
}

/* Skeleton para gráfico donut */
.doughnut-skeleton {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.skeleton-donut {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 1rem 0;
}

.donut-ring {
  width: 100%;
  height: 100%;
  border: 20px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  border-top-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.4);
  border-right-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.3);
  border-radius: 50%;
  animation: spin 3s linear infinite;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60%;
  height: 60%;
  transform: translate(-50%, -50%);
  background: var(--primary-color);
  border-radius: 50%;
  border: 2px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.line-skeleton {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.line-container {
  flex: 1;
  position: relative;
  padding: 1rem;
}

.skeleton-line-svg {
  width: 100%;
  height: 100%;
}

.skeleton-line-path {
  stroke-dasharray: 5;
  animation: dash 3s linear infinite;
}

@keyframes dash {
  0% {
    stroke-dashoffset: 20;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.skeleton-points {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.skeleton-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--accent-color);
  border-radius: 50%;
  animation: bounce 2s infinite;
  box-shadow: 0 0 8px rgba(var(--accent-color-rgb, 59, 130, 246), 0.6);
}

.generic-skeleton {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-header {
  display: flex;
  justify-content: center;
}

.skeleton-title {
  width: 150px;
  height: 24px;
  background: linear-gradient(
    90deg,
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.3),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1)
  );
  background-size: 200px 100%;
  animation: shimmer 2s infinite;
  border-radius: 12px;
}

.skeleton-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-chart-area {
  width: 80%;
  height: 80%;
  background: linear-gradient(
    135deg,
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.2),
    rgba(var(--accent-color-rgb, 59, 130, 246), 0.1)
  );
  border-radius: 12px;
  animation: pulse 2s infinite;
}

.loading-indicator {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(var(--primary-color), 0.9);
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
  backdrop-filter: blur(10px);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted-text-color);
  font-weight: 500;
}

@media (max-width: 768px) {
  .skeleton-content {
    padding: 1rem;
  }

  .skeleton-donut {
    width: 150px;
    height: 150px;
  }

  .bars-container {
    padding: 0 0.5rem;
  }

  .loading-indicator {
    bottom: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.75rem;
  }

  .loading-text {
    font-size: 0.7rem;
  }
}
</style>
