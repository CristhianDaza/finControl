<script setup>
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
</script>

<template>
  <button class="button">
    Agregar Transacción
  </button>
  <div class="table-container">
    <table>
      <tr>
        <th>Fecha</th>
        <th>Descripción</th>
        <th>Monto</th>
        <th>Cuenta</th>
        <th>Tipo</th>
        <th></th>
      </tr>
      <tr class="row-income">
        <td>2023-10-01</td>
        <td>Compra de libros</td>
        <td>$50.00</td>
        <td>Cuenta de Ahorros</td>
        <td>Gasto</td>
        <td>
          <div class="actions">
            <button class="button button-edit">
              <svg class="icon-edit" v-html="EditIcon"></svg>
            </button>
            <button class="button button-delete">
              <svg class="icon-delete" v-html="DeleteIcon"></svg>
            </button>
          </div>
        </td>
      </tr>
      <tr class="row-expense">
        <td>2023-10-01</td>
        <td>Compra de libros</td>
        <td>$50.00</td>
        <td>Cuenta de Ahorros</td>
        <td>Gasto</td>
        <td>
          <div class="actions">
            <button class="button button-edit">
              <svg class="icon-edit" v-html="EditIcon"></svg>
            </button>
            <button class="button button-delete">
              <svg class="icon-delete" v-html="DeleteIcon"></svg>
            </button>
          </div>
        </td>
      </tr>
      <tr class="row-debt">
        <td>2023-10-01</td>
        <td>Compra de libros</td>
        <td>$50.00</td>
        <td>Cuenta de Ahorros</td>
        <td>Gasto</td>
        <td>
          <div class="actions">
            <button class="button button-edit">
              <svg class="icon-edit" v-html="EditIcon"></svg>
            </button>
            <button class="button button-delete">
              <svg class="icon-delete" v-html="DeleteIcon"></svg>
            </button>
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.table-container::-webkit-scrollbar {
  height: 8px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: var(--secondary-color);
  border-radius: 4px;
}

table {
  margin-top: 2rem;
  width: 100%;
  border-collapse: collapse;
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

th, td {
  padding: 1rem 1.2rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-color);
}

th {
  background-color: var(--secondary-color);
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background-color: var(--hover-prrimary-color);
  color: var(--secondary-color);
}

td {
  font-size: 0.95rem;
  color: var(--text-color);
}

td:nth-child(4) {
  font-weight: bold;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.button {
  padding: 0.5rem 1rem;
}

.icon-delete, .icon-edit {
  width: 20px;
  height: 20px;
  fill: var(--text-color);
}

tr {
  position: relative;
}

tr::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  border-radius: 4px 0 0 4px;
}

.row-income::before {
  background-color: var(--success-color);
}

.row-expense::before {
  background-color: var(--error-color);
}

.row-debt::before {
  background-color: var(--accent-color); /* azul */
}

</style>
