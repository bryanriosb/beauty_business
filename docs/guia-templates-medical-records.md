🎯 GUÍA COMPLETA: USO DE TEMPLATES EN HISTORIAS CLÍNICAS
📋 Paso 1: Crear Templates
1. Accede al Menú:
      Historias Clínicas → Templates
   
2. Crea un Nuevo Template:
   - Click en "Nuevo Template"
   - Configura información básica:
     - Nombre: "Historia Clínica Estética"
     - Descripción: "Para procedimientos estéticos faciales"
     - Requiere firma: ✅ (si quieres firma digital)
     - Template por defecto: ✅ (será el predeterminado)
3. Configura las Secciones:
   - Sección 1: Datos Personales
     - Campo: nombre_completo (Texto, Requerido)
     - Campo: documento (Texto, Requerido)
     - Campo: telefono (Texto, Requerido)
     - Campo: email (Email, Opcional)
   - Sección 2: Datos Clínicos
     - Campo: motivo_consulta (Textarea, Requerido)
     - Campo: alergias (Sí/No con observación, Requerido)
📋 Paso 2: Usar Templates en Historias Clínicas
1. Crear Nueva Historia Clínica:
   - Ve a /admin/medical-records
   - Click "Nueva Historia Clínica"
2. Selecciona un Template:
      📋 Template de Historia Clínica
   ▼ Selecciona un template (opcional)
     - Sin template (formulario tradicional)
     - Historia Clínica Estética ⭐ Por defecto
     - Historia Clínica Corporal
   
3. Completa el Formulario:
   - Pestaña "Información Básica": Datos del paciente y médico
   - Pestaña "Formulario Dinámico": Campos definidos en el template
4. Guarda la Historia:
   - Si el template requiere firma, se genera automáticamente
   - El paciente puede firmar vía enlace WhatsApp/Email
📋 Paso 3: Gestionar Templates
1. Editar Templates:
   - En la lista de templates → Click "Editar"
   - Modifica secciones y campos
   - Agrega/quita campos dinámicamente
2. Establecer por Defecto:
   - Click "Establecer por defecto" en cualquier template
   - Se usará automáticamente al crear nuevas historias
3. Desactivar Templates:
   - Click "Desactivar" para ocultar sin eliminar datos
🔄 Flujo Completo
graph TD
    A[Crear Template] --> B[Definir Secciones]
    B --> C[Configurar Campos]
    C --> D[Guardar Template]
    D --> E[Crear Historia Clínica]
    E --> F[Seleccionar Template]
    F --> G[Completar Formulario]
    G --> H[Guardar Historia]
    H --> I[Generar Solicitud de Firma?]
    I -->|Sí| J[Enviar Enlace al Paciente]
    I -->|No| K[Historia Completada]
🎯 Características Avanzadas
1. Tipos de Campos Soportados:
   - ✅ Texto, Email, Número, Fecha
   - ✅ Textarea (múltiples líneas)
   - ✅ Select, Radio buttons
   - ✅ Checkbox
   - ✅ Sí/No con observación
   - ✅ Frecuencia (Sí/No/Ocasional)
   - ✅ Medición (Inicial/Final)
2. Validaciones:
   - Campos requeridos
   - Tipos de datos
   - Opciones predefinidas
3. Campos Condicionales:
   - Secciones pueden mostrarse/ocultarse según condiciones
   - Ej: "Si edad < 18, mostrar datos del acompañante"
🚀 Ejemplos Prácticos
1. Template para Tratamientos Faciales:
      📋 Template: Tratamiento Facial
   └── 📄 Datos del Tratamiento
       ├── producto_usado (Select)
       ├── zona_tratada (Radio)
       └── tiempo_aplicación (Número)
   
2. Template para Pre-Operatorio:
      📋 Template: Evaluación Pre-Operatoria
   └── 📄 Evaluación Médica
       ├── medicamentos_actuales (Sí/No + obs)
       ├── alergias_conocidas (Sí/No + obs)
       └── tipo_anestesia (Select)
   
💡 Tips de Uso
1. Templates por Defecto: Establece un template estándar para agilizar
2. Campos Requeridos: Marca campos importantes como requeridos
3. Nombres Descriptivos: Usa nombres claros para los campos
4. Organización por Secciones: Agrupa campos lógicamente
5. Firma Digital: Activa firma para procedimientos invasivos