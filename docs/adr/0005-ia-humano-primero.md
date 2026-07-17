# ADR-0005: Modelo operativo de IA "humano primero, IA como respaldo"

## Estado
Aceptado

## Contexto
BIRVO no debe convertirse en un bot que reemplace al equipo humano; la IA es un respaldo ante
demoras, no el canal de atención por defecto.

## Decisión
- La IA solo actúa tras un temporizador de inactividad configurable por organización
  (`inactivityMinutes`), y ese temporizador se cancela si un agente responde antes.
- Dos modos: `suggestion` (crea una sugerencia visible al agente, no la envía) y `automatic`
  (envía la respuesta si cumple `confidenceThreshold`, `businessHours`,
  `maximumAutomaticReplies` y no toca `excludedTopics`/`escalationKeywords`).
- Un clasificador de seguridad (`SafetyClassifier`, parte de `packages/ai-sdk`) evalúa cada
  mensaje entrante antes de permitir cualquier respuesta automática. Si detecta amenazas,
  emergencias, información médica/legal/financiera sensible, reclamaciones delicadas,
  solicitudes de eliminación de datos o lenguaje de crisis, marca la conversación como
  `requires_human` e inhibe cualquier automatización, independientemente del modo configurado.
- Toda ejecución de IA queda registrada en `AiExecution` con proveedor, modelo, versión de
  prompt, entrada, salida, tiempo, tokens/consumo estimado, resultado y la decisión de
  seguridad tomada.

## Consecuencias
- El `MockAiProvider` implementa reglas simples y deterministas de clasificación de seguridad
  para que el MVP sea evaluable sin depender de un LLM real.
- Cambiar de proveedor de IA (p. ej. a OpenAI) es una implementación adicional de la interfaz
  `AiProvider`, seleccionable por `AI_PROVIDER` sin tocar el dominio.
