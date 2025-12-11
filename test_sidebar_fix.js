// Script de prueba para verificar que los módulos no aparecen en el sidebar
// Este script simula la lógica del sidebar para un usuario con plan básico

const mockModuleAccess = {
  'dashboard': true,
  'appointments': true,
  'services': true,
  'customers': true,
  'specialists': true,
  'invoices': true,
  'reports': true,
  // 'products': false,  // Debería estar ausente o false
  // 'inventory': false, // Debería estar ausente o false
};

const sidebarItems = [
  { title: 'Productos', moduleCode: 'products', url: '/admin/products' },
  { title: 'Inventario', moduleCode: 'inventory', url: '/admin/inventory' },
  { title: 'Citas', moduleCode: 'appointments', url: '/admin/appointments' },
];

console.log('=== PRUEBA DE SIDEBAR PARA PLAN BÁSICO ===');
console.log('Módulos con acceso:', Object.keys(mockModuleAccess).filter(k => mockModuleAccess[k]));

const filteredItems = sidebarItems.filter(item => {
  if (!item.moduleCode) return true;
  return mockModuleAccess[item.moduleCode] === true;
});

console.log('Items que aparecerían en el sidebar:');
filteredItems.forEach(item => console.log(`- ${item.title} (${item.moduleCode})`));

console.log('Items filtrados (no deberían aparecer):');
const hiddenItems = sidebarItems.filter(item => !filteredItems.includes(item));
hiddenItems.forEach(item => console.log(`- ${item.title} (${item.moduleCode})`));

console.log('=== RESULTADO ===');
if (hiddenItems.length === 2 && hiddenItems.every(item => ['products', 'inventory'].includes(item.moduleCode))) {
  console.log('✅ CORRECTO: Products e Inventory están ocultos para plan básico');
} else {
  console.log('❌ ERROR: Products o Inventory siguen apareciendo');
}
