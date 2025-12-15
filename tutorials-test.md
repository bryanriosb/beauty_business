// Archivo de prueba para verificar que los tutoriales funcionen entre páginas
// Este archivo NO es parte del código de producción, solo para pruebas

/*
Pasos para probar los tutoriales con el NUEVO flujo de bienvenida (ACTUALIZADO):

1. Abrir la aplicación en modo desarrollo: bun run dev
2. Iniciar sesión como usuario con rol BUSINESS_ADMIN en una cuenta en estado TRIAL

3. 🎭 MODAL DE BIENVENIDA (AHORA CON DB):
   - Al llegar al dashboard (/admin), después de 1.5 segundos aparece el MODAL DE BIENVENIDA
   - El modal aparece SOLO si tutorial_started = false en la BD
   - El modal tiene gradiente amarillo-violeta siguiendo la marca
   - Opciones: "Comenzar tutorial" o "Saltar tutorial"
   - Checkbox para no volver a mostrar el mensaje (cookie local)

4. 🎓 TUTORIAL DESDE MODAL:
   - Si elige "Comenzar tutorial":
     - Se actualiza tutorial_started = true en la BD
     - El modal se cierra y el tutorial comienza con el primer paso en el dashboard
     - El PRIMER PASO ahora pide hacer CLIC en "Servicios" (no navega automáticamente)

5. 🎯 TUTORIAL DESDE DROPDOWN:
   - También puede iniciarse desde el ícono de ayuda (?) en el header
   - Al hacer clic en un tutorial del dropdown:
     - Se actualiza tutorial_started = true en la BD
     - El tutorial debería iniciarse inmediatamente
   - DEBUG: Revisar consola para logs "🎓 Starting tutorial"

6. 📋 Flujo guiado completo:
   - PASO 1: Hacer clic en "Servicios" (menú lateral)
   - PASO 2: Hacer clic en "Agregar servicio"
   - PASO 3-6: Llenar formulario de servicio
   - PASO 7: Hacer clic en "Guardar servicio" → navega automáticamente a especialistas
   - PASO 8: Hacer clic en "Agregar especialista"
   - PASO 9-12: Llenar formulario de especialista  
   - PASO 13: Hacer clic en "Guardar especialista" → navega automáticamente a citas
   - PASO 14-16: Completar formulario de cita
   - PASO 17: Finalizar tutorial

7. ✅ Verificaciones CRÍTICAS:
   - Modal aparece solo cuando tutorial_started = false en BD
   - Al tomar O saltar tutorial → tutorial_started = true en BD
   - Tutorial desde dropdown funciona (revisar logs en consola)
   - Los tooltips aparecen en los elementos con data-tutorial="nombre"
   - La navegación automática solo ocurre después de guardar formularios
   - No se muestra modal después de haber tomado o saltado el tutorial

8. 🐛 DEBUG y LOOP FIXED:
   - ✅ **LOOP CORREGIDO**: Se agregaron safeguards para evitar loops infinitos:
     - `modalShownThisSession` para evitar mostrar modal múltiples veces
     - `lastFetchedId` en useBusinessAccount para evitar fetchs repetidos
   - Revisar consola para logs:
     - "🎓 Starting tutorial: [tutorial-id]" (desde dropdown)
     - "🚀 Starting tutorial from welcome modal"
     - "🎮 Tutorial state: {...}"
     - "✅ Starting Joyride with tutorial: [tutorial-id]"

9. 🐛 DEBUG DETALLADO (NUEVOS LOGS):
   - ✅ **Logs Agregados** para identificar problemas:
     - "📊 BusinessAccount data:" - Muestra datos de la BD
     - "🎓 useBusinessAccount return:" - Muestra tutorial_processed
     - "🔍 Modal check:" - Verifica condiciones para mostrar modal
     - "🎮 Tutorial state:" - Estado completo del tutorial
     - "🎯 Step check:" - Verifica elementos del tutorial
     - "✅ Element found" o "⏳ Element not found" - Estado de elementos

10. ⚠️ Si el modal NO aparece:
    - Revisar logs de "📊 BusinessAccount data" para ver tutorial_started
    - Revisar logs de "🔍 Modal check" para ver las condiciones
    - Posibles causas:
      - `tutorial_started` es `true` o `null` en BD
      - No es `/admin` pathname
      - `modalShownThisSession` ya es `true`
      - No hay `businessAccountId`

11. 🔧 **PROBLEMAS CORREGIDOS**:
   - ✅ **Pathname**: Ahora acepta `/admin` y `/admin/dashboard`
   - ✅ **Loop Infinito**: Corregido en useBusinessAccount
   - ✅ **Logs Agregados**: Ahora se ve todo el flujo del tutorial

12. 📊 **NUEVOS LOGS PARA DEBUG**:
   - "🎯 startTutorialAfterWelcome called" - Inicio del proceso
   - "📋 Tutorial available and not completed" - Tutorial disponible
   - "🚀 Actually calling startTutorial..." - Llamada real
   - "🎯 startTutorial result:" - Resultado del startTutorial
   - "📞 startTutorialAfterWelcome result:" - Resultado final

13. ⚠️ Si el tutorial AÚN NO inicia:
   - Revisar logs de "🎯 Step check" para ver si encuentra elementos
   - Revisar logs de "🎮 Tutorial state" y "✅ Starting Joyride"
   - Posibles causas:
     - `isReady: false` (elementos no encontrados)
     - `isActive: false` (tutorial no inició)
     - `isPaused: true` (tutorial en pausa)
     - `startTutorial` devuelve `false`

¿Quién debe ver el tutorial?
- ROL: business_admin (dueño del negocio) - NO company_admin
- CUENTA: En estado trial (período de prueba)
- AUTO-INICIO: Automático al primer login en una cuenta trial
- VISIBILIDAD: El tutorial "Guía de Inicio" solo aparece en el dropdown para usuarios trial

FLUJO COMPLETO:
1. Usuario business_admin en cuenta trial hace login
2. Después de 2 segundos, el tutorial inicia automáticamente
3. Si el usuario lo cierra, puede reiniciarlo desde el dropdown (solo visible si está en trial)
4. El tutorial navega automáticamente: /admin/services → /admin/specialists → /admin/appointments

Si hay problemas comunes:
- Si los tooltips no aparecen, verificar que los elementos tengan data-tutorial="nombre"
- Si la navegación no funciona, verificar las URLs en /const/tutorials.ts
- Si el estado no persiste, verificar el Zustand store en /lib/store/tutorial-store.ts
- Si el auto-inicio no funciona, verificar la lógica en /hooks/use-tutorial.ts (líneas 114-155)

Nota: El error de build con "_document" es un problema de configuración de Next.js,
no relacionado con los tutoriales. Los tutoriales deberían funcionar en modo desarrollo.
*/