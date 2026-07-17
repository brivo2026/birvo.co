import type { SafetyAssessment, SafetyFlag } from '@birvo/contracts';

interface SafetyRule {
  flag: SafetyFlag;
  patterns: RegExp[];
}

// Reglas deterministas y auditables usadas por MockAiProvider (y como base
// mínima que cualquier proveedor real debe respetar) para decidir cuándo la
// IA NO debe responder automáticamente. Ver ADR-0005.
const SAFETY_RULES: SafetyRule[] = [
  {
    flag: 'threat',
    patterns: [/\b(amenaz|matar|violencia|golpe|arma)\w*/i],
  },
  {
    flag: 'emergency',
    patterns: [/\b(emergencia|incendio|accidente grave|ambulancia)\w*/i],
  },
  {
    flag: 'crisis_language',
    patterns: [/\b(suicid|quitarme la vida|no quiero vivir|autolesi)\w*/i],
  },
  {
    flag: 'medical_information',
    patterns: [/\b(diagn[oó]stico|s[ií]ntomas|medicamento|dosis|enfermedad|receta m[eé]dica)\w*/i],
  },
  {
    flag: 'legal_information',
    patterns: [/\b(demanda|abogado|denuncia legal|contrato legal|querella)\w*/i],
  },
  {
    flag: 'financial_sensitive',
    patterns: [/\b(n[uú]mero de tarjeta|cvv|clave banc|transferencia bancaria|datos de mi cuenta)\w*/i],
  },
  {
    flag: 'sensitive_complaint',
    patterns: [/\b(reclamo formal|fraude|estafa|discriminaci[oó]n|acoso)\w*/i],
  },
  {
    flag: 'data_deletion_request',
    patterns: [/\b(eliminar mis datos|borrar mi informaci[oó]n|derecho al olvido)\w*/i],
  },
];

export function classifySafety(text: string, excludedTopics: string[] = []): SafetyAssessment {
  const flags: SafetyFlag[] = [];

  for (const rule of SAFETY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      flags.push(rule.flag);
    }
  }

  const normalizedText = text.toLowerCase();
  const excludedTopicHit = excludedTopics.find((topic) =>
    normalizedText.includes(topic.toLowerCase()),
  );

  if (flags.length > 0) {
    return {
      isSafeToAutomate: false,
      flags,
      reason: `Se detectaron señales sensibles (${flags.join(', ')}); requiere atención humana.`,
    };
  }

  if (excludedTopicHit) {
    return {
      isSafeToAutomate: false,
      flags: [],
      reason: `El mensaje toca un tema excluido de automatización: "${excludedTopicHit}".`,
    };
  }

  return { isSafeToAutomate: true, flags: [] };
}

export function matchesEscalationKeyword(text: string, escalationKeywords: string[]): string | undefined {
  const normalizedText = text.toLowerCase();
  return escalationKeywords.find((keyword) => normalizedText.includes(keyword.toLowerCase()));
}
