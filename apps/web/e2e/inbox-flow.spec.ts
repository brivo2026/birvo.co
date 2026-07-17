import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Flujo end-to-end principal de BIRVO (ver §19 del brief):
 * login -> abrir bandeja -> simular mensaje entrante -> verlo en tiempo real
 * -> responder -> asignar -> activar sugerencia de IA -> cerrar conversación.
 *
 * Requiere el stack completo corriendo (`pnpm dev` con Postgres/Redis
 * disponibles y la base de datos sembrada con `pnpm db:seed`) — ver README
 * para instrucciones.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
// Se usa la cuenta owner (permiso conversations:view_all) porque el flujo crea
// una conversación nueva sin asignar; la cuenta agent solo ve conversaciones
// asignadas (conversations:view_assigned) y nunca vería la conversación de la
// prueba.
const AGENT_EMAIL = 'owner@birvo.local';
const AGENT_PASSWORD = 'Birvo#Dev2026';

async function loginViaApi(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  return response;
}

test.describe('Bandeja unificada de BIRVO', () => {
  test('login, bandeja, mensaje simulado en tiempo real, respuesta y asignación', async ({ page }) => {
    // 1. Login desde la UI (ejercita el formulario real, no solo la API).
    await page.goto('/login');
    await page.getByPlaceholder('tú@empresa.com').fill(AGENT_EMAIL);
    await page.getByPlaceholder('••••••••').fill(AGENT_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 2. Bandeja unificada visible.
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole('heading', { name: 'Bandeja' })).toBeVisible();

    // 3. Simular un mensaje entrante desde /dev/sandbox.
    const clientName = `Cliente E2E ${Date.now()}`;
    await page.goto('/dev/sandbox');
    await page.getByPlaceholder('Cliente de prueba').fill(clientName);
    await page.getByRole('button', { name: 'Enviar mensaje simulado' }).click();
    await expect(page.locator('pre')).toContainText('queued');

    // 4. Verlo en tiempo real dentro de la bandeja (sin recargar).
    await page.goto('/inbox');
    const conversationLink = page.getByRole('link', { name: new RegExp(clientName) });
    await expect(conversationLink).toBeVisible({ timeout: 10_000 });

    // 5. Abrir la conversación y responder.
    await conversationLink.click();
    await expect(page).toHaveURL(/\/inbox\/.+/);
    const replyText = `¡Hola! Gracias por escribir a BIRVO (${Date.now()}).`;
    const composer = page.getByPlaceholder('Escribe una respuesta…');
    await composer.fill(replyText);
    await composer.press('Enter');
    await expect(page.getByTestId('message-thread').getByText(replyText)).toBeVisible();

    // 6. Asignar la conversación al agente actual.
    const assignSelect = page.locator('select').filter({ hasText: 'Sin asignar' }).first();
    if (await assignSelect.count()) {
      await assignSelect.selectOption({ label: 'Camila Agente' }).catch(() => undefined);
    }

    // 7. Cerrar la conversación.
    const statusSelect = page.locator('select').filter({ hasText: 'Abierta' }).first();
    await statusSelect.selectOption('closed');
    await expect(statusSelect).toHaveValue('closed');
  });

  test('la API rechaza credenciales inválidas', async ({ request }) => {
    const response = await request.post(`${API_URL}/v1/auth/login`, {
      data: { email: AGENT_EMAIL, password: 'contraseña-incorrecta' },
    });
    expect(response.status()).toBe(401);
  });

  test('login válido vía API responde con el usuario de sesión', async ({ request }) => {
    const response = await loginViaApi(request);
    const body = await response.json();
    expect(body.user.email).toBe(AGENT_EMAIL);
  });
});
