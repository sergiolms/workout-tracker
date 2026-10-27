# Economía del gimnasio virtual · v1

27 de octubre de 2026. Reglas implementadas en la rama de gamificación. El catálogo y los parámetros son comunes al simulador y a la aplicación.

## Objetivos de equilibrio

- Poder hacer una primera compra después del primer entrenamiento.
- Tener compras pequeñas frecuentes y equipamiento que permita ahorrar unas semanas.
- Dar el mismo acceso económico a fuerza, actividad o movilidad cuando aportan la misma contribución al juego.
- Evitar que para decorar un gimnasio haya que entrenar todos los días.
- Conservar las compras y el saldo durante las pausas.
- Permitir experimentar con la distribución sin pagar por mover objetos.

Son decisiones de diseño del juego. La contribución económica no mide esfuerzo físico, calorías, salud ni intensidad del entrenamiento.

## 1. Créditos que se ganan

Hasta **30 créditos base por día**, compartidos entre las modalidades. El primer día de la semana que alcanza al menos media contribución añade **30 créditos de bienvenida semanal**. El total semanal tiene un límite de **150 créditos**.

| Registro | Una contribución completa | Contribución parcial |
| --- | --- | --- |
| Fuerza | Realizar las series de trabajo previstas al comenzar | Series realizadas / series previstas |
| Actividad | Registrar 20 minutos en total | Minutos / 20 |
| Movilidad | Realizar 4 movimientos distintos | Movimientos distintos / 4 |

Las contribuciones de las tres modalidades se suman hasta 1 por día. Por ejemplo, media sesión y 10 minutos de actividad completan la contribución del día. Dos movimientos y 10 minutos también. El mismo movimiento no cuenta otra vez por aparecer en la rutina corta y en la larga.

Fórmula del crédito base diario: `floor(30 × min(1, contribución acumulada del día))`. Se redondea el total del día; marcar los movimientos por separado no pierde créditos por redondeo.

La bienvenida semanal se concede al llegar a media contribución en un día: 15 créditos base. Por ejemplo, 10 minutos registrados aportarían 15 créditos más los 30 de bienvenida si es el primer día que cumple la condición. No se obtiene por abrir la app.

Los 20 minutos y 4 movimientos son parámetros contables de esta versión, no recomendaciones de entrenamiento. Las series previstas deben estar congeladas en un snapshot válido: una sesión vacía no concede nada, y editar la rutina después no cambia la recompensa de aquella sesión.

### Ingresos resultantes

| Frecuencia de contribuciones completas | Créditos por semana |
| --- | ---: |
| 1 día | 60 |
| 2 días | 90 |
| 3 días | 120 |
| 4 días | 150 |
| 7 días | 150 |

Tres días de movilidad pueden generar lo mismo que tres días de fuerza. Combinar modalidades en un solo día no multiplica el límite. La XP y las estadísticas del entrenamiento continúan por sus propias reglas; gastar créditos no reduce el nivel.

El bonus económico no depende de editar un objetivo semanal. Las metas personales pueden conceder logros y piezas especiales, pero no otra bolsa de dinero. Los límites se explican en «Cómo ganar créditos» y no se representan como barras que haya que llenar.

## 2. Punto de partida

Habitación, suelo básico, esterilla sencilla y un par de mancuernas gratuitos. Todos se pueden organizar desde el inicio. No se regalan créditos al crear una cuenta ni al conectar el diario local: así no aparece una recompensa repetible por cambiar de modo.

La primera sesión completa aporta 60 créditos, contando la bienvenida semanal. Permite elegir entre varios detalles o ahorrar para equipo. El catálogo de pago ofrece variantes del equipamiento básico, no una condición para poder entrenar o personalizar algo.

## 3. Precios

| Tipo | Ejemplos | Precio |
| --- | --- | ---: |
| Detalles pequeños | Planta, reloj, lámina | 20–40 |
| Personalización | Espejo, iluminación, esterilla alternativa | 40–80 |
| Equipo pequeño | Kettlebells | 90 |
| Acabados | Suelo y paredes alternativos | 90–160 |
| Equipo intermedio | Banco ajustable, mancuernero | 150–180 |
| Equipo grande | Plataforma, rack, bicicleta | 240–360 |
| Estaciones | Poleas, cinta de correr | 420–480 |
| Espacio | Primera ampliación | 400 |
| Espacio | Segunda ampliación | 900 |
| Espacio | Segunda sala | 1.800 |

Las ampliaciones siguen un orden; comprar una segunda sala presupone haber obtenido las ampliaciones anteriores. Las piezas especiales de logros no tienen precio ni se pueden devolver a cambio de créditos.

Los precios permanecen visibles y estables en la versión del catálogo. No suben al detectar que el usuario ha acumulado saldo ni por alcanzar otro nivel.

## 4. Qué ritmo de compras produce

Con tres días completos por semana se ingresan **120 créditos**. Esta simulación compra por orden una planta, un espejo, un banco, suelo de madera, un rack y la ampliación; después continúa con más equipamiento y espacio.

| Compra dentro de esa secuencia | Cuándo alcanza el saldo |
| --- | --- |
| Planta y espejo | Semana 1 |
| Banco ajustable | Semana 2 |
| Suelo de madera | Semana 4 |
| Rack | Semana 6 |
| Primera ampliación | Semana 9 |
| Estación de poleas, después de un mancuernero | Semana 14 |
| Segunda ampliación | Semana 22 |
| Segunda sala, después de otras compras | Semana 41 |

No hay que esperar nueve semanas obligatoriamente para ampliar. Si se ahorra exclusivamente para la primera ampliación, bastan cuatro semanas con ese patrón. La tabla incluye el coste de ir decorando y equipando antes.

Con dos días completos por semana, la misma secuencia alcanza el banco en la semana 3 y la primera ampliación en la 12. Una persona que registra un día por semana puede seguir haciendo compras pequeñas; la misma secuencia de grandes compras tarda más. Estos plazos describen calendarios repetidos, no predicciones individuales.

### Longevidad

El catálogo tiene 26 artículos, con un coste conjunto de **6.425 créditos**. Comprar una unidad de cada entrada requiere unas 54 semanas con ingresos de 120, o 43 con el máximo de 150. Incluye la vitrina de 120 créditos y tres conjuntos de ropa de 30, 60 y 90 créditos. Esto no incluye los objetos gratuitos ni los premios de logros.

Es un horizonte de catálogo, no una garantía de retención. Quien solo quiera unas piezas alcanzará antes su gimnasio preferido. Para varios años hacen falta nuevas piezas y libertad para diseñar; no se alargará artificialmente la duración mediante alquileres o pérdida de saldo.

## 5. Comprar, probar y devolver

- Previsualizar, mover, orientar y guardar en el inventario cuesta 0.
- Los objetos comprados se pueden devolver por el 100 % de su precio efectivamente pagado. La devolución retira ese ejemplar y solo se ejecuta una vez.
- La ficha de compra conserva el precio pagado y la versión del catálogo. Un cambio de precio futuro no permite devolverlo por más de lo pagado.
- Las ampliaciones se confirman con una vista previa del coste y espacio. El modelo no presupone que se puedan reducir habitaciones ya ocupadas.
- El saldo no caduca y una pausa no deteriora el gimnasio.
- No se concede XP ni dinero por comprar, devolver o mover cosas. Los logros de colección, si se añaden, contarían objetos en propiedad, no transacciones repetidas.

Devolver objetos permite experimentar. Completar simultáneamente una colección sigue exigiendo disponer de su valor total; comprar y devolver cada pieza por turnos no equivale a tener la colección.

## 6. Registros, correcciones y sincronización

El saldo procede de concesiones únicas, compras y devoluciones. No se guarda como dos contadores independientes que se suman al sincronizar dispositivos.

Cada contribución tiene un origen estable y un día de recompensa, fijados al concederla por primera vez. Se actualiza su contribución acreditada únicamente cuando aumenta, dentro de los límites del día y de la semana. Una semana conserva el máximo ya concedido; volver a guardar el mismo estado o un estado menor no vuelve a concederlo.

Corregir o borrar un entrenamiento no retira muebles ni produce una deuda. Tampoco permite cobrarlo de nuevo: la concesión y su origen permanecen. Cambiar una fecha no mueve una recompensa ya concedida a otro periodo para volver a cobrarla. Los límites y la deduplicación mitigan duplicados y errores; no prueban que se haya hecho realmente un ejercicio autorregistrado.

El reconocimiento comienza al inicializar automáticamente el progreso al abrir el diario. El histórico anterior cuenta para los hitos y sus trofeos mediante reconocimiento automático; no acuña créditos ni XP retroactivos. Las importaciones no acuñan créditos automáticamente. Solo puntúan entradas nuevas desde la activación, con fecha entre el día de activación y hoy. Las sesiones de fuerza requieren las series previstas congeladas al comenzar. Una entrada preexistente o importada permanece excluida aunque después se edite. La zona horaria de las semanas es la del diario, no la de cada dispositivo.

Comprar exige comprobar saldo, registrar la compra y crear el ejemplar en una sola transacción. Devolver exige marcar la compra como devuelta y reembolsar una sola vez. El modo local usa IndexedDB; con cuenta, Firebase confirma el gasto. Con cuenta, sin conexión se puede consultar la sala, pero comprar y modificar su distribución requiere confirmación en Firebase. En modo local todo funciona sin conexión.

Al incorporar un diario local o una copia, el gimnasio se importa mediante una elección explícita. Sustituye al actual, sin sumar saldos, y conserva el gimnasio anterior para restaurarlo desde Perfil → Logros. El historial importado no vuelve a conceder créditos.

## 7. Qué se ha comprobado

La [simulación reproducible](simulation.md) analiza diez patrones, los 128 calendarios posibles de días completos, 896 aumentos de actividad y 100 ciclos de compra/devolución. Comprueba límites, igualdad entre modalidades con la misma contribución, conservación de saldo, pausas y concesiones repetidas.

Se ejecuta con:

```sh
node scripts/simulate-gym-economy.mjs
```

Los valores están en [economy.json](../../lib/gym/economy.json). Los consume también el motor de la app en `lib/gym/engine.ts`.

Además de la simulación, `lib/gym.test.mjs` prueba deduplicación, correcciones, límites, importación y transacciones concurrentes de IndexedDB y del repositorio paginado con un backend transaccional en memoria. `tests/virtual-gym.test.mjs` recorre la app real desde Perfil, compra, recarga y devuelve. Estas pruebas no sustituyen al emulador oficial de Firestore. El equilibrio de motivación y variedad necesita además observar uso real; no se demuestra con una simulación.


## XP y niveles

Cada día concede hasta 100 XP usando la misma contribución combinada y limitada a 1 que los créditos. La XP no tiene el tope económico semanal. El nivel L comienza en `25 × (L − 1)² + 75 × (L − 1)` XP acumulada. Gastar, devolver y mover objetos no cambia la experiencia.

Se conserva el máximo ya reconocido de cada origen. Las pausas y correcciones no retiran nivel ni objetos. Los logros de sesiones, minutos de actividad, días de movilidad y semanas activas desbloquean piezas gratuitas; no otorgan otra bolsa de créditos.
