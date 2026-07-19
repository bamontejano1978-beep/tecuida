import { expect, test } from '@playwright/test'

async function expectBasicAccessibility(page: import('@playwright/test').Page) {
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('h1')).toHaveCount(1)
  const images = page.locator('img')
  for (let index = 0; index < await images.count(); index++) {
    await expect(images.nth(index)).toHaveAttribute('alt')
  }
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id))
  expect(new Set(ids).size).toBe(ids.length)
}

test('la portada pública carga y conserva navegación accesible', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/TE CUIDA/i)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectBasicAccessibility(page)
})

test('la política de privacidad es accesible desde móvil y escritorio', async ({ page }) => {
  await page.goto('/privacidad')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/privacidad/i)
  await expectBasicAccessibility(page)
})

test('una ruta desconocida ofrece una salida útil', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe-e2e')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('link', { name: /volver|inicio/i }).first()).toBeVisible()
})

test('la entrada canónica de aplicaciones mantiene identidad y manifest', async ({ page }) => {
  test.skip(!process.env.E2E_APP_PATH, 'Requiere una aplicación real del entorno objetivo')
  const appPath = process.env.E2E_APP_PATH!
  await page.goto(appPath)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toContain('/apps/')
  const manifestResponse = await page.request.get(manifestHref!)
  expect(manifestResponse.ok()).toBe(true)
})
