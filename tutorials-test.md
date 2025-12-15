// Archivo de prueba para verificar que los tutoriales funcionen entre páginas
// Este archivo NO es parte del código de producción, solo para pruebas

/*
Pasos para probar los tutoriales:

1. Abrir la aplicación en modo desarrollo: bun run dev
2. Iniciar sesión como usuario con rol company_admin
3. Hacer clic en el ícono de ayuda (?) en el header superior
4. Seleccionar "Guía de Inicio: Tu Primera Cita" del dropdown
5. Verificar que el tutorial comience y navegue automáticamente entre páginas:
   - Debe comenzar en /admin/services
   - Después de guardar el servicio, debe navegar a /admin/specialists
   - Después de guardar el especialista, debe navegar a /admin/appointments
6. Verificar que los tooltips aparezcan en los elementos correctos
7. Verificar que el botón "Siguiente" funcione correctamente
8. Verificar que el tutorial se pueda completar exitosamente

Si hay problemas comunes:
- Si los tooltips no aparecen, verificar que los elementos tengan data-tutorial="nombre"
- Si la navegación no funciona, verificar las URLs en /const/tutorials.ts
- Si el estado no persiste, verificar el Zustand store en /lib/store/tutorial-store.ts

Nota: El error de build con "_document" es un problema de configuración de Next.js,
no relacionado con los tutoriales. Los tutoriales deberían funcionar en modo desarrollo.
*/