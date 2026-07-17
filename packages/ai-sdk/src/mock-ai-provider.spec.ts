import { MockAiProvider } from './mock-ai-provider';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('genera una respuesta segura para un saludo simple', async () => {
    const result = await provider.generateReply({
      conversationId: 'conv-1',
      history: [{ senderType: 'contact', content: 'Hola, buenos días', createdAt: new Date() }],
      contactName: 'Laura',
      escalationKeywords: [],
      excludedTopics: [],
    });

    expect(result.safety.isSafeToAutomate).toBe(true);
    expect(result.text).toContain('Laura');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('no genera respuesta automatizable ante contenido sensible', async () => {
    const result = await provider.generateReply({
      conversationId: 'conv-2',
      history: [{ senderType: 'contact', content: 'quiero denunciar un fraude, es una reclamación formal', createdAt: new Date() }],
      contactName: 'Carlos',
      escalationKeywords: [],
      excludedTopics: [],
    });

    expect(result.safety.isSafeToAutomate).toBe(false);
    expect(result.text).toBe('');
  });

  it('respeta las palabras de escalamiento configuradas', async () => {
    const result = await provider.generateReply({
      conversationId: 'conv-3',
      history: [{ senderType: 'contact', content: 'esto es urgente por favor', createdAt: new Date() }],
      contactName: 'Valentina',
      escalationKeywords: ['urgente'],
      excludedTopics: [],
    });

    expect(result.safety.isSafeToAutomate).toBe(false);
  });

  it('transcribeAudio devuelve un resultado simulado determinista', async () => {
    const result = await provider.transcribeAudio({ audioBuffer: Buffer.from('x'), mimeType: 'audio/ogg' });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.provider).toBe('mock');
  });
});
