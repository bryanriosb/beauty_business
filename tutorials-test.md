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

13. 🐛 **BUG CRITICO CORREGIDO**:
   ❌ **Problema**: `isTutorialCompleted` siempre devolvía `true` para usuarios trial
   ✅ **Solución**: Para usuarios trial con `tutorial_started: false`, ignora cookies
   
   **Nuevo Log Esperado**:
   ```
   🎯 startTutorialAfterWelcome called
   📋 Tutorial available and not completed, starting...
   📊 State: { isOnTrial: true, tutorialStarted: false, isCompleted: false, cookieStatus: "false" }
   🚀 Actually calling startTutorial...
   🎯 startTutorial result: true
   ```

14. ✅ **BUG FINAL CORREGIDO**:
   ❌ **Problema**: `startTutorial` devolvía `false` por verificación de cookies
   ✅ **Solución**: Para usuarios trial, ignora cookies de completado

   **Nuevo Log Esperado**:
   ```
   🎯 startTutorialAfterWelcome called
   📋 Tutorial available and not completed, starting...
   📊 State: { isOnTrial: true, tutorialStarted: false, isCompleted: false, cookieStatus: "true" }
   🚀 Actually calling startTutorial...
   ✅ Starting tutorial: appointment-start
   🎯 startTutorial result: true
   🎮 Tutorial state: { isActive: true, isPaused: false, isReady: true, tutorialId: "appointment-start" }
   ✅ Starting Joyride with tutorial: "appointment-start"
   ```

15. 🎯 **PROBLEMAS CORREGIDOS**:

   **Problema 1: Modal no se abre en página correcta**
   ✅ **Solución**: Agregado `/admin/services` a páginas válidas para modal
   ✅ **Logs Esperados**:
   ```
   🔍 Modal check: { pathname: '/admin/services', tutorialStarted: false, ... }
   📋 Showing welcome modal
   ```

   **Problema 2: Joyride no apunta a elementos correctos**
   ✅ **Solución**: Agregados logs detallados para cada paso
   ✅ **Logs Esperados**:
   ```
   🎯 Processing steps for tutorial: appointment-start
   🎯 Step 0: { originalTarget: 'services-menu', elementFound: true, finalTarget: '[data-tutorial="services-menu"]' }
   🎯 Step 1: { originalTarget: 'add-service-button', elementFound: true, finalTarget: '[data-tutorial="add-service-button"]' }
   ```

   **Problema 3: Modal de formulario interfiere con Joyride**
   ✅ **Solución**: Joyride espera que no haya modales abiertos
   ✅ **Logs Esperados**:
   ```
   ✅ Starting Joyride with tutorial: appointment-start
   🔐 Modal detectado, esperando que se cierre...
   ```

16. 🧪 **PARA PROBAR EL FLUJO COMPLETO**:

   1. **Iniciar tutorial** desde el modal
   2. **Ir a Servicios** → El primer paso debería estar apuntando
   3. **Hacer clic en "Crear Servicio"** → Debería avanzar al paso 2
   4. **Modal debería abrir** → Joyride debería esperar
   5. **Cerrar modal** → Joyride debería continuar al paso 2

17. 🚀 **SOLUCIONES ACTUALES**:

   **Modal Visibility**: Simplificado para mostrar modal en dashboard/services
   ```
   📋 Showing welcome modal (simplified)
   ```

   **Element Detection**: Joyride ahora busca dentro de modales abiertos
   ```
   🔍 Element not found in main document, searching in modals...
   ✅ Found element in modal: [role="dialog"]
   ```

18. 🧪 **PARA PROBAR AHORA**:

   **Paso 1**: Ir a `/admin/services`
   - Debería ver: `📋 Showing welcome modal (simplified)`

   **Paso 2**: Iniciar tutorial
   - Debería ver los tooltips apuntando a elementos correctos
   - Debería poder avanzar con "Siguiente"

   **Paso 3**: Hacer clic en "Crear Servicio"
   - Debería abrir el modal del formulario
   - Joyride debería esperar a que se cierre el modal
   - Al cerrar, debería continuar con el paso siguiente

19. ⚠️ **Si el modal sigue sin aparecer**:
   - Revisar logs de "🔍 Modal visibility check"
   - Verificar que sea `shouldShow: true`
   - Posible causa: `modalShownThisSession` ya está en `true`

20. ⚠️ **Si Joyride no apunta a los elementos del formulario**:
   - Revisar logs de "🔍 Element not found in main document, searching in modals..."
   - Debería ver: "✅ Found element in modal"
   - Si no, el problema puede ser z-index o visibilidad

21. 📊 **Logs Clave a Observar**:
   ```
   🔍 Modal visibility check: { shouldShow: true }
   🎯 Processing steps for tutorial: appointment-start
   🎯 Step 2: { elementFound: true }
   🔍 Element not found in main document, searching in modals...
   ✅ Found element in modal: [role="dialog"]
   ✅ Starting Joyride with tutorial: appointment-start
   ```

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