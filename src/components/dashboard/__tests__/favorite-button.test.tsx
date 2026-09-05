import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FavoriteButton from '../favorite-button'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

afterEach(() => jest.restoreAllMocks())
test('only marks a favorite after the server confirms it', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true })
  render(<FavoriteButton applicationId="app-id" name="Reto30" />)
  await userEvent.click(screen.getByRole('button', { name: 'Añadir a favoritos: Reto30' }))
  expect(await screen.findByRole('button', { name: 'Quitar de favoritos: Reto30' })).toHaveAttribute('aria-pressed', 'true')
  expect(global.fetch).toHaveBeenCalledWith('/api/citizen/applications', expect.objectContaining({ body: JSON.stringify({ application_id: 'app-id', action: 'favorite', favorite: true }) }))
})
test('keeps state unchanged and permits retry after a network failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
  render(<FavoriteButton applicationId="app-id" name="Reto30" />)
  await userEvent.click(screen.getByRole('button', { name: 'Añadir a favoritos: Reto30' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button')).toBeEnabled()
})
