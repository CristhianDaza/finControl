import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  PointElement
} from 'chart.js'

let isRegistered = false

export const useCharts = () => {
  const registerChartComponents = () => {
    if (!isRegistered) {
      Chart.register(
        BarController,
        BarElement,
        CategoryScale,
        LinearScale,
        Tooltip,
        Legend,
        DoughnutController,
        ArcElement,
        LineController,
        LineElement,
        PointElement
      )

      Chart.defaults.plugins.colors = {
        enabled: false
      }
      Chart.defaults.color = '#E0E1E9'

      isRegistered = true
    }
  }

  const createChart = (canvas, config) => {
    registerChartComponents()
    return new Chart(canvas, config)
  }

  const destroyChart = (chart) => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy()
    }
  }

  return {
    Chart,
    createChart,
    destroyChart,
    registerChartComponents
  }
}
