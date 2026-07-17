import { classifySafety, matchesEscalationKeyword } from './safety-classifier';

describe('classifySafety', () => {
  it('permite automatizar un mensaje neutro', () => {
    const result = classifySafety('Hola, quiero saber el precio del plan Pro');
    expect(result.isSafeToAutomate).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it('bloquea mensajes con lenguaje de crisis', () => {
    const result = classifySafety('ya no quiero vivir, ayuda');
    expect(result.isSafeToAutomate).toBe(false);
    expect(result.flags).toContain('crisis_language');
  });

  it('bloquea mensajes con información médica', () => {
    const result = classifySafety('¿qué dosis de mi medicamento debo tomar?');
    expect(result.isSafeToAutomate).toBe(false);
    expect(result.flags).toContain('medical_information');
  });

  it('bloquea mensajes con datos financieros sensibles', () => {
    const result = classifySafety('mi número de tarjeta es 4111 1111 1111 1111');
    expect(result.isSafeToAutomate).toBe(false);
    expect(result.flags).toContain('financial_sensitive');
  });

  it('bloquea solicitudes de eliminación de datos', () => {
    const result = classifySafety('quiero eliminar mis datos de su plataforma');
    expect(result.isSafeToAutomate).toBe(false);
    expect(result.flags).toContain('data_deletion_request');
  });

  it('respeta los temas excluidos configurados por la organización', () => {
    const result = classifySafety('tengo una consulta sobre salud', ['salud']);
    expect(result.isSafeToAutomate).toBe(false);
  });
});

describe('matchesEscalationKeyword', () => {
  it('detecta una palabra de escalamiento configurada', () => {
    const match = matchesEscalationKeyword('esto es urgente, necesito ayuda ya', ['urgente', 'emergencia']);
    expect(match).toBe('urgente');
  });

  it('devuelve undefined si no hay coincidencia', () => {
    const match = matchesEscalationKeyword('hola, buenos días', ['urgente', 'emergencia']);
    expect(match).toBeUndefined();
  });
});
