# Gimnasio virtual de Zero to Hero

Dirección de producto del 27 de octubre de 2026. La primera versión está implementada en la rama de gamificación; [detalles de implementación](virtual-gym-implementation.md) y [economía](economy/README.md) describen el alcance actual.

Esta dirección sustituye al brazo como representación central de la gamificación. El usuario propone un gimnasio isométrico y una tienda que acepta únicamente créditos ganados entrenando.

## El ciclo

Entrenas → guardas la sesión → recibes XP y créditos → eliges un objeto → lo colocas en tu gimnasio.

- **XP:** trayectoria acumulada y nivel. No se gasta al comprar.
- **Créditos:** saldo disponible para adquirir objetos del catálogo interno. Se ganan con las sesiones, actividades y movilidad elegibles; las cantidades deben equilibrarse antes de implementarlas.
- **Logros:** reconocen hitos y pueden conceder un objeto especial o acceso a una variante visual. No vuelven a conceder XP por la misma actividad.

Los créditos no tienen conversión a dinero real. El entrenamiento y todas las funciones actuales siguen disponibles desde el principio, independientemente de los objetos que se posean.

## El espacio inicial

Una habitación pequeña, con equipamiento básico gratuito y espacio para colocar la primera adquisición. El usuario puede personalizarla desde el inicio. La primera compra debería estar al alcance de la primera sesión elegible.

El dibujo usa una cámara isométrica fija. Los muebles ocupan celdas; se compran ejemplares concretos y se pueden mover, orientar y guardar en el inventario. Retirar algo del suelo no lo elimina ni obliga a comprarlo de nuevo.

Catálogo inicial propuesto:

- Equipo: esterillas, bancos, mancuernas, rack y estaciones.
- Superficies: suelo, paredes y colores de acabado.
- Detalles: reloj, espejo, iluminación y objetos pequeños.
- Logros: placas o recuerdos que se pueden exponer.
- Ampliaciones: más superficie o una segunda zona, ligadas a hitos de progresión.

El equipo virtual es una elección visual. Comprar una máquina no exige hacer ese ejercicio ni modifica el plan real del usuario.

## Cómo dura en el tiempo

El progreso deja de ser una secuencia cerrada de cinco dibujos. Hay decisiones de compra y composición: ahorrar para un objeto, cambiar la distribución, completar un conjunto o ampliar una zona.

Los hitos grandes abren posibilidades; las sesiones entre hitos permiten adquirir detalles. Los objetos anteriores se conservan y pueden formar parte de un nuevo diseño. El espacio no se deteriora durante una pausa.

La variedad procede de piezas modulares reutilizables, orientaciones y materiales. A largo plazo harían falta nuevas colecciones o piezas: no debemos prometer contenido infinito con un catálogo fijo. Conviene preparar una guía de arte y un formato de catálogo que permita añadirlo sin rehacer el motor.

## Economía

Ya existe una [propuesta de economía v1 con catálogo y simulación](economy/README.md). Los importes de ese documento sustituyen a los precios ilustrativos del boceto; siguen siendo una propuesta sin implementar.

Antes de fijar precios, simular usuarios que registran fuerza, actividad o movilidad, con distintas frecuencias. El objetivo es permitir decisiones frecuentes al principio y compras de mayor alcance después, sin que un objeto corriente requiera meses.

La recompensa reconoce el entrenamiento realizado. No aumenta por subir kilos ni por registrar más peso corporal. Una sesión parcial puede generar una contribución proporcional, con reglas claras y límites de repetición. No se muestran máximos diarios como objetivos que haya que alcanzar.

Los importes del boceto son ejemplos visuales, no precios aprobados.

Cada concesión tiene una identidad estable vinculada al registro de origen. Guardar otra vez, editar desde otro dispositivo o importar una copia no concede de nuevo la misma recompensa. La política exacta para correcciones se cerrará antes de implementar: propuesta de conservar las compras y evitar saldos negativos por corregir un entrenamiento.

## Tienda y edición

La tienda permite ver el objeto, su tamaño en celdas y el coste. Se puede previsualizar en la habitación antes de confirmar la compra. Los objetos en propiedad se distinguen del catálogo; las decoraciones repetibles indican cuántos ejemplares se tienen.

«Organizar» abre un modo de edición separado de la tienda. En móvil se toca un objeto y se elige mover, orientar o guardar. Arrastrar puede ser un atajo, pero no la única manera de colocarlo. Hay que validar límites y solapamientos, y ofrecer deshacer mientras se organiza.

El gimnasio aparece en Progreso, con acceso compacto desde Hoy. La edición no se superpone a las series ni se abre automáticamente al terminar un ejercicio. El resumen de sesión puede mostrar los créditos ganados y un acceso voluntario al espacio.

## Datos y sincronización

- El catálogo, los precios versionados y los recursos gráficos son comunes y estáticos.
- Cada diario conserva únicamente concesiones de créditos, compras, inventario, distribución y ajustes privados.
- El saldo se deriva de créditos concedidos menos compras confirmadas. No se resuelve combinando dos contadores independientes de PC y móvil.
- Una compra debe comprobar saldo, registrar el gasto y crear el objeto en una misma transacción. Las concesiones y compras tienen identificadores estables para reintentar sin duplicarlas.
- En modo local, IndexedDB es la autoridad. Con cuenta, las transacciones de Firebase confirman las compras. React Query muestra el estado y las previsualizaciones pendientes.
- Las compras simultáneas y la compra sin conexión necesitan una política explícita de confirmación o reserva antes de construir la tienda. Los movimientos de objetos ya adquiridos pueden guardarse localmente y reconciliarse después.
- Tras incorporar un diario local a una cuenta hay que deduplicar concesiones y compras; no basta con sumar saldos. Una colisión de distribución debe conservar los objetos en el inventario.

## Enfoque técnico y artístico

Una vista isométrica no exige un motor 3D. Primera opción a evaluar: escena 2D con piezas prerenderizadas, cámara fija y cuadrícula lógica. Requiere probar orden de dibujo, zonas de interacción y orientaciones en móvil.

El boceto generado solo sirve para evaluar el aspecto. No es todavía un juego funcional ni un conjunto de sprites listo para integrar. La producción necesita recursos separados y consistentes, tamaños, puntos de anclaje, máscaras de selección y variantes de orientación.

La interfaz conserva los colores y componentes del tema actual. Los fondos de las ilustraciones y su integración deben revisarse tanto en claro como en oscuro. Movimiento reducido, controles alternativos al arrastre y etiquetas para inventario y saldo forman parte de la primera entrega.

## Primera entrega propuesta

Una habitación, un catálogo pequeño de objetos y materiales, inventario, compra transaccional y colocación. Un puñado de logros puede conceder objetos especiales. La ampliación del gimnasio y las colecciones posteriores se apoyan en ese mismo sistema.

Antes de implementar: aprobar la dirección del boceto, fijar el equilibrio entre recompensas y precios y resolver las reglas de compras pendientes, correcciones e incorporación local/nube.
