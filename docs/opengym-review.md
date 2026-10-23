# openGym como referencia para BASE

Revisión: 23 de octubre de 2026. Se consultó [openGym, commit 93034a4](https://github.com/DuarteSantos8/openGym/tree/93034a419c42d4b4ca63439ff8b20dff31c1d78e): README, capturas de inicio, entrenamiento, plan y estadísticas, tokens de color, progresión y pruebas de descanso.

La auditoría aplicada, sus motivos y la validación están en [design-functional-audit.md](./design-functional-audit.md). Este documento distingue las ideas adoptadas de las que siguen pendientes. No se ha incorporado código, imágenes ni dependencias de openGym.

## Adoptado

| Idea | Aplicación en BASE |
| --- | --- |
| Prioridad clara durante el entrenamiento | Cabecera breve, contexto de sesión, imagen y objetivo juntos; finalizar accesible junto al selector de ejercicio. |
| Superficies tranquilas | Menos bordes y cajas anidadas, títulos con mayor jerarquía, verde reservado para acción, selección y datos. |
| Descanso de cada ejercicio | Activación y duración juntas en el ejercicio, disponibles al editar y al entrenar. El perfil ya no muestra un ajuste paralelo. Los valores anteriores siguen siendo compatibles. |
| Biblioteca por material y zona | Catálogo en su propio diálogo; filtros en un diálogo con aplicar y limpiar. La rueda navega entre secciones dentro del resultado. |
| Constancia visible | Calendario mensual navegable sin números en las celdas, con detalle real al tocar cada día. |
| Gráficas legibles | Peso y cintura con selector de medida, periodos de 30/90 días o todo, escala numérica, fechas y variación del periodo. |
| Historial útil a largo plazo | Búsqueda, mes y páginas de diez registros en entrenamientos, actividad y medidas. La descarga remota todavía no está paginada. |
| Organización por tarea | Plan: Semana/Rutinas/Tramos. Progreso: Resumen/Medidas/Historial. Perfil: Cuenta y datos/Apariencia y tacto. |

## Próximas funciones, por prioridad

1. Separar entrenamientos, actividades y medidas en documentos de Firebase, con consultas por fecha y cursores. Mantener Firebase como fuente de verdad y proteger los cambios por registro.
2. Identificar cada entrenamiento con un ID propio, para poder repetir una misma rutina el mismo día.
3. Explicar la progresión por ejercicio y hacer que las políticas respeten los objetivos configurados.
4. Permitir carga por serie, series de calentamiento y superseries. Son cambios en el modelo de entrenamiento, no solo nuevos controles.
5. Consultar evolución y marcas de un ejercicio a partir del historial, sin confundir un 1RM estimado con una marca real.
6. Pantalla encendida durante la sesión, aviso visual al acabar el descanso e importación con vista previa y control de duplicados.

No se propone reemplazar Firebase ni reconstruir funciones que BASE ya tiene, como historial editable, objetivos de series/repeticiones, descanso automático y exportación JSON.

Fuentes: [funciones](https://github.com/DuarteSantos8/openGym/blob/93034a419c42d4b4ca63439ff8b20dff31c1d78e/README.md), [tokens visuales](https://github.com/DuarteSantos8/openGym/blob/93034a419c42d4b4ca63439ff8b20dff31c1d78e/frontend/src/index.css), [progresión](https://github.com/DuarteSantos8/openGym/blob/93034a419c42d4b4ca63439ff8b20dff31c1d78e/frontend/src/lib/progression.js), [descanso](https://github.com/DuarteSantos8/openGym/blob/93034a419c42d4b4ca63439ff8b20dff31c1d78e/frontend/src/sheets.config-rest.test.jsx).
