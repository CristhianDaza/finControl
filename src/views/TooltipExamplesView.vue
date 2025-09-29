<script setup>
import { ref } from 'vue'

const controlledOpen = ref(false)
const toggleControlled = () => {
  controlledOpen.value = !controlledOpen.value
}
</script>

<template>
  <div class="tooltip-examples">
    <h1>Ejemplos de FcTooltip</h1>

    <section class="example-section">
      <h2>Trigger: Hover (por defecto)</h2>
      <div class="example-grid">
        <FcTooltip content="Tooltip arriba" placement="top">
          <button class="example-button">Hover - Top</button>
        </FcTooltip>

        <FcTooltip content="Tooltip abajo" placement="bottom">
          <button class="example-button">Hover - Bottom</button>
        </FcTooltip>

        <FcTooltip content="Tooltip izquierda" placement="left">
          <button class="example-button">Hover - Left</button>
        </FcTooltip>

        <FcTooltip content="Tooltip derecha" placement="right">
          <button class="example-button">Hover - Right</button>
        </FcTooltip>
      </div>
    </section>

    <section class="example-section">
      <h2>Trigger: Click</h2>
      <div class="example-grid">
        <FcTooltip content="Click para abrir/cerrar" placement="top" trigger="click">
          <button class="example-button">Click - Top</button>
        </FcTooltip>

        <FcTooltip content="Click para abrir/cerrar" placement="bottom" trigger="click">
          <button class="example-button">Click - Bottom</button>
        </FcTooltip>

        <FcTooltip content="Click para abrir/cerrar" placement="left" trigger="click">
          <button class="example-button">Click - Left</button>
        </FcTooltip>

        <FcTooltip content="Click para abrir/cerrar" placement="right" trigger="click">
          <button class="example-button">Click - Right</button>
        </FcTooltip>
      </div>
    </section>

    <section class="example-section">
      <h2>Trigger: Focus</h2>
      <div class="example-grid">
        <FcTooltip content="Focus para abrir, presiona Enter/Space para toggle" placement="top" trigger="focus">
          <button class="example-button">Focus - Top</button>
        </FcTooltip>

        <FcTooltip content="Focus para abrir, presiona Enter/Space para toggle" placement="bottom" trigger="focus">
          <button class="example-button">Focus - Bottom</button>
        </FcTooltip>

        <FcTooltip content="Focus para abrir, presiona Enter/Space para toggle" placement="left" trigger="focus">
          <button class="example-button">Focus - Left</button>
        </FcTooltip>

        <FcTooltip content="Focus para abrir, presiona Enter/Space para toggle" placement="right" trigger="focus">
          <button class="example-button">Focus - Right</button>
        </FcTooltip>
      </div>
    </section>

    <section class="example-section">
      <h2>Opciones Avanzadas</h2>
      <div class="example-grid">
        <FcTooltip
          content="Tooltip sin flecha"
          placement="top"
          :with-arrow="false"
        >
          <button class="example-button">Sin Flecha</button>
        </FcTooltip>

        <FcTooltip
          content="Este es un tooltip con mucho más contenido para demostrar el maxWidth personalizado"
          placement="top"
          max-width="300"
          :offset="12"
        >
          <button class="example-button">Max Width 300px</button>
        </FcTooltip>

        <FcTooltip
          :open="controlledOpen"
          content="Tooltip controlado externamente"
          placement="top"
          @open="() => console.log('Tooltip abierto')"
          @close="() => console.log('Tooltip cerrado')"
        >
          <button class="example-button">Controlado</button>
        </FcTooltip>
        <button class="example-button" @click="toggleControlled">
          Toggle Controlado
        </button>
      </div>
    </section>

    <section class="example-section">
      <h2>Contenido Personalizado con Slot</h2>
      <div class="example-grid">
        <FcTooltip placement="top">
          <button class="example-button">Slot Personalizado</button>
          <template #content>
            <div style="text-align: center;">
              <strong>Contenido HTML</strong><br>
              <span style="color: var(--accent-color);">Con estilos personalizados</span>
            </div>
          </template>
        </FcTooltip>

        <FcTooltip placement="right" trigger="click">
          <span class="example-text">Texto con tooltip</span>
          <template #content>
            <ul style="margin: 0; padding-left: 16px;">
              <li>Elemento 1</li>
              <li>Elemento 2</li>
              <li>Elemento 3</li>
            </ul>
          </template>
        </FcTooltip>
      </div>
    </section>

    <section class="example-section">
      <h2>Casos Especiales</h2>
      <div class="example-grid">
        <div style="display: flex; justify-content: space-between; width: 100%; gap: 16px;">
          <FcTooltip content="Tooltip en borde izquierdo" placement="right">
            <button class="example-button">Borde Izquierdo</button>
          </FcTooltip>

          <FcTooltip content="Tooltip en borde derecho" placement="left">
            <button class="example-button">Borde Derecho</button>
          </FcTooltip>
        </div>

        <div style="margin-top: 300px;">
          <FcTooltip content="Tooltip cerca del borde inferior" placement="top">
            <button class="example-button">Borde Inferior</button>
          </FcTooltip>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tooltip-examples {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--text-color);
}

.tooltip-examples h1 {
  color: var(--accent-color);
  margin-bottom: 2rem;
  text-align: center;
}

.example-section {
  margin-bottom: 3rem;
}

.example-section h2 {
  color: var(--accent-color);
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: center;
  justify-items: center;
  padding: 2rem;
  background-color: var(--primary-color);
  border-radius: 12px;
  border: 1px solid var(--secondary-color);
}

.example-button {
  background-color: var(--accent-color);
  color: var(--background-color);
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 120px;
}

.example-button:hover {
  background-color: var(--hover-accent-color);
}

.example-button:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.example-text {
  color: var(--accent-color);
  text-decoration: underline;
  cursor: pointer;
  padding: 0.5rem;
}
</style>
