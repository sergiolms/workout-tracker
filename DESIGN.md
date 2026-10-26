# Zero to Hero: diario de entrenamiento

Dirección revisada el 26 de octubre de 2026 a partir de las dos propuestas del usuario. Se adopta la primera paleta con ajustes de contraste en textos secundarios. La referencia funcional sigue siendo openGym; su aspecto no se copia.

Lectura: aplicación de registro para entrenar desde el móvil, con lenguaje de diario deportivo. ENERGY 2 / RHYTHM 2 / MOTION 2.

- El fondo claro es blanco salvia `#F5F7F1`, con superficies blancas y texto pino `#24352B`. El oscuro usa verde tinta `#111B18`, superficies `#1D2B25` y texto `#EDF5EE`. Las listas siguen siendo planas y las superficies marcan grupos reales.
- El verde mineral `#416F59`, ligeramente más profundo que el `#477B63` propuesto, y menta `#8DC9A8` en oscuro, identifican acciones, selección y gráficas. El dorado es secundario y se reserva para hitos y avisos, sin convertir todos los controles en elementos de colores distintos.
- El texto secundario claro se oscurece a `#5E6E60` para conservar contraste también sobre controles; el de la propuesta original no alcanza AA sobre el fondo claro. El dorado tampoco se usa como texto pequeño sobre blanco.
- La marca visible es «Zero to Hero», con «to» más ligero para que el nombre se lea de un vistazo en móvil. El símbolo de pulso existente se conserva y adopta la nueva paleta.
- La tipografía del sistema mantiene legibilidad y teclado nativo. Las cifras de carga, tiempo y semana tienen jerarquía sobre los textos auxiliares.
- Las pestañas subrayadas representan secciones; no se encajonan en otro control flotante.
- Filas, márgenes y separadores organizan historiales, rutinas y ajustes. Las superficies se reservan para el ejercicio actual, una gráfica o un diálogo.
- El panel de semana usa la superficie del tema activo; la cifra grande y la jerarquía sitúan al usuario en su programa sin insertar un panel oscuro en el tema claro. Los registros individuales permanecen en el flujo del diario.
- Los campos numéricos permiten escribir y ajustar. Los ajustes poco frecuentes se revelan a petición, sin esconder las acciones de entrenamiento.
- La guía alfabética usa marcas estables y letras como referencias. No hay inercia artificial ni giro automático; arrastrar solo cambia la posición del catálogo.
- El movimiento conserva la relación espacial: subrayado y navegación se deslizan, los detalles se despliegan y los checks dibujan su confirmación. Se respeta movimiento reducido.
- Los diálogos heredan el tema de la app, reciben el foco y permiten salir con Escape. Los controles principales tienen un área táctil de al menos 44 px.
- Todos los paneles montados en portales heredan el contexto de tema: menús y submenús, selectores, combobox, popover, ayudas, confirmaciones, paneles laterales y toasts. No capturan el tema solo al abrirse. Los campos usan superficies semánticas; la frontera de un input no se reutiliza como su fondo.
- Los avisos usan `--warning` y los errores `--destructive` con su propio color de texto sobre fondos sólidos. La prueba de contraste verifica esos estados en ambos temas y el hover de los botones mantiene el fondo opaco.
- Las demostraciones usan datos en memoria y lo indican. Las cifras del usuario proceden de sus registros.
