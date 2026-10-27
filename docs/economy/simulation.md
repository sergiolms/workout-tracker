# Simulación de la economía del gimnasio

Generado desde `lib/gym/economy.json` con `node scripts/simulate-gym-economy.mjs`. Propuesta, no economía implementada ni validada con usuarios.

Cada patrón repite el mismo calendario durante semanas de siete días. El primer día que llega a media contribución recibe el bonus semanal de 30 créditos, una sola vez. No depende del objetivo personal configurado. No se simulan compras con dinero real ni puntuación de capacidad física.

## Ingresos y ahorro sin otras compras

| Patrón | Créditos/semana | Ingreso en 52 semanas | Banco (150) | Ampliación (400) | Sala (1.800) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fuerza 1 día | 60 | 3120 | 3 sem. | 7 sem. | 30 sem. |
| Fuerza 2 días | 90 | 4680 | 2 sem. | 5 sem. | 20 sem. |
| Fuerza 3 días | 120 | 6240 | 2 sem. | 4 sem. | 15 sem. |
| Fuerza 4 días | 150 | 7800 | 1 sem. | 3 sem. | 12 sem. |
| Actividad 20 min, 3 días | 120 | 6240 | 2 sem. | 4 sem. | 15 sem. |
| Actividad 20 min, 7 días | 150 | 7800 | 1 sem. | 3 sem. | 12 sem. |
| Movilidad 4 movimientos, 3 días | 120 | 6240 | 2 sem. | 4 sem. | 15 sem. |
| Mixto 3 días: media sesión y 10 min | 120 | 6240 | 2 sem. | 4 sem. | 15 sem. |
| Actividad 10 min, 2 días | 60 | 3120 | 3 sem. | 7 sem. | 30 sem. |
| Tres modalidades cada día, 7 días | 150 | 7800 | 1 sem. | 3 sem. | 12 sem. |

Los plazos anteriores son ahorro exclusivo para ese artículo. No representan un gimnasio decorado que además compra otros objetos.

## Compra progresiva

Prioridad fija: planta → espejo → banco → suelo de madera → rack → primera ampliación → mancuernero → poleas → segunda ampliación → lámina → iluminación → bicicleta → segunda sala. Se compra en cuanto alcanza el saldo. No se revende nada.

| Objeto | 1 día completo/semana | 2 días completos/semana | 3 días completos/semana | 4 días completos/semana |
| --- | ---: | ---: | ---: | ---: |
| Planta | Sem. 1 | Sem. 1 | Sem. 1 | Sem. 1 |
| Espejo | Sem. 2 | Sem. 1 | Sem. 1 | Sem. 1 |
| Banco ajustable | Sem. 4 | Sem. 3 | Sem. 2 | Sem. 2 |
| Suelo de madera | Sem. 7 | Sem. 5 | Sem. 4 | Sem. 3 |
| Rack | Sem. 12 | Sem. 8 | Sem. 6 | Sem. 5 |
| Primera ampliación | Sem. 18 | Sem. 12 | Sem. 9 | Sem. 8 |
| Mancuernero | Sem. 21 | Sem. 14 | Sem. 11 | Sem. 9 |
| Estación de poleas | Sem. 28 | Sem. 19 | Sem. 14 | Sem. 12 |
| Segunda ampliación | Sem. 43 | Sem. 29 | Sem. 22 | Sem. 18 |
| Lámina | Sem. 44 | Sem. 29 | Sem. 22 | Sem. 18 |
| Iluminación | Sem. 45 | Sem. 30 | Sem. 23 | Sem. 18 |
| Bicicleta | Sem. 51 | Sem. 34 | Sem. 26 | Sem. 21 |
| Segunda sala | Sem. 81 | Sem. 54 | Sem. 41 | Sem. 33 |

## Horizonte del catálogo

Los 26 artículos y ampliaciones cuestan 6425 créditos en total. Con 120 créditos semanales, comprar una unidad de todo exige al menos 54 semanas de ingresos; con el máximo de 150, 43. No incluye objetos iniciales gratuitos ni piezas concedidas por logros. Comprar solo lo que se desea reduce ese plazo.

El catálogo fijo se termina. La economía no soluciona por sí sola la retención a varios años: hacen falta libertad de diseño y nuevas piezas, sin inflar los precios de lo que ya existe.

## Verificación matemática

Se comprobaron 128 calendarios semanales, 896 aumentos de actividad, 100 ciclos de compra/devolución, igualdad entre modalidades con la misma contribución, límites, pausas y repetición de concesiones.

Estas comprobaciones no prueban deduplicación de registros reales, transacciones concurrentes, cambios de fecha entre semanas, incorporación local/nube ni resistencia a manipulación del cliente. Las pruebas del motor y de persistencia se describen en [la implementación](../virtual-gym-implementation.md).
