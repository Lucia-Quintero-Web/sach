# 📖 MANUAL OPERATIVO S.A.C.H. - NIVEL NEO-MEDICAL PERFORMANCE
**Sistema de Administración Clínica Híbrida · JVCreative Standard**

Este manual detalla el funcionamiento maestro del ecosistema S.A.C.H., desarrollado exclusivamente para la **Dra. Lucía Quintero**. Siga estas instrucciones para operar el sistema bajo el estándar de máximo rendimiento.

---

## 🔐 1. MÓDULO DE ACCESO (SISTEMA MULTILOCK)
El acceso está blindado para garantizar que solo el personal autorizado interactúe con los expedientes clínicos.

*   **Inicio de Sesión:** Al abrir la aplicación, el sistema despliega un escudo de seguridad (Login Neo-Medical).
*   **Selección de Usuario:** El usuario selecciona su nombre del listado oficial (**Dra. Lucía**, **Staff** o **ADMINISTRADORSACH**).
*   **Validación:** Se debe ingresar la clave de seguridad única. El sistema valida contra la base de datos de Supabase en tiempo real y otorga privilegios según el rango:
    *   **ADMIN:** Control total de tarifas, reportes y usuarios.
    *   **STAFF/ODONTÓLOGO:** Gestión de agenda y pacientes.
*   **Cierre de Sesión (Alarma):** El botón "Salir" (icono de puerta) borra los datos de la memoria volátil (`sessionStorage`) y bloquea el acceso de inmediato, protegiendo la información ante descuidos.

---

## 🦷 2. GESTIÓN CLÍNICA (EL ODONTOGRAMA UNIVERSAL 52)
El corazón visual de S.A.C.H. ahora soporta la transición completa de dentición.

*   **Perfil del Paciente:** Al cargar un paciente, el sistema detecta automáticamente su edad y sugiere el modo de dentición ideal.
*   **Selector de Dentición (Modos):**
    *   **Adulto:** Muestra las 32 piezas permanentes.
    *   **Niño (Pediatría):** Muestra las 20 piezas temporales (deciduas).
    *   **Mixto:** Muestra las **52 piezas simultáneamente**, permitiendo marcar diagnósticos en piezas de leche y permanentes al mismo tiempo.
*   **Diagnóstico Visual:** Selector táctil para marcar:
    *   🔴 **Caries:** Hallazgo activo.
    *   🔵 **Obturaciones:** Tratamientos ya realizados.
    *   ❌ **Ausencias / Coronas:** Piezas faltantes o rehabilitadas.
*   **Simbología Global:** Capas especiales para **Ortodoncia** (Arco metálico) y **Ortopedia** (Sombreado palatino) que se superponen al estado individual sin alterar los diagnósticos base.

---

## 💰 3. PRESUPUESTO DINÁMICO Y FLEXIBLE
Elimine el error humano y maximice la transparencia con el motor de cálculo JVCreative.

*   **Generación Automática:** Cada hallazgo marcado en el odontograma se traduce instantáneamente en una línea de presupuesto con su costo base.
*   **Edición en Tiempo Real:** La Dra. Lucía (o el Admin) puede modificar el campo "Valor" de cualquier tratamiento directamente en la tabla para aplicar descuentos o ajustes según el caso.
*   **Recálculo Instantáneo:** El sistema suma el "Total del Tratamiento" y deduce los abonos realizados para mostrar el "Saldo Pendiente" sin necesidad de recargar.
*   **Persistencia:** Use el botón "Guardar Presupuesto" para sincronizar permanentemente los cambios en la nube.

---

## 📜 4. HISTORIA CLÍNICA Y EVOLUCIÓN (TIMELINE)
Registro documental infalible para seguimiento a largo plazo.

*   **Línea del Tiempo:** Visualización cronológica de todas las intervenciones realizadas al paciente.
*   **Notas de Evolución:** Seccion para comentarios manuales detallados, resultados de citas o emergencias. Estas notas son editables para permitir correcciones posteriores.
*   **Fidelidad Documental:** Todos los cambios en presupuestos y abonos se consolidan en el reporte final para evitar discrepancias.

---

## ⚙️ 5. PANEL DE AJUSTES Y CONTROL (SOLO ADMIN)
El panel de mando estratégico exclusivo para la administración.

*   **Gestión de Tarifario:** Modifique los precios base de todos los tratamientos. Estos cambios afectarán a los *nuevos* presupuestos, protegiendo el historial de los antiguos.
*   **Control de Personal:**
    *   **Registro:** Creación de nuevos odontólogos colaboradores en el sistema.
    *   **Claves:** Gestión y cambio de contraseñas de acceso para todo el personal.
*   **Borrado Seguro:** Función de limpieza profunda para eliminar expedientes obsoletos en "Cascada" (elimina registros de BD y archivos adjuntos en el Storage).

---

## 📄 6. SALIDA DE DATOS Y WHATSAPP
El poder de la marca JVCreative en las manos del paciente.

*   **Generador PDF High-Fidelity:** Crea un documento profesional que incluye el logo de la clínica, la representación visual del Odontograma y el presupuesto detallado.
*   **Envío Directo:** El botón "WhatsApp" unifica el PDF y el mensaje personalizado para enviarlo al paciente con un solo clic, mejorando la tasa de aceptación de presupuestos.

---

**ESTÁNDAR DE EXCELENCIA JVCREATIVE**
*Este sistema ha sido diseñado para operar en el nivel Neo-Medical Performance.*
*Si requiere asistencia técnica, el equipo de soporte JV está a un clic de distancia.*
