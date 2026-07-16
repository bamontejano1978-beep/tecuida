/* eslint-disable @typescript-eslint/no-require-imports */
// Importa matchers adicionales de @testing-library/jest-dom para todos los tests
// p. ej. toBeInTheDocument(), toHaveStyle(), toHaveClass(), etc.
import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'
import { clearImmediate, setImmediate } from 'node:timers'

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  clearImmediate,
  setImmediate,
})

const {
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
} = require('next/dist/compiled/@edge-runtime/primitives') as typeof import('next/dist/compiled/@edge-runtime/primitives')

// Jest ejecuta los tests `node` dentro de un contexto aislado que no hereda
// las primitivas Fetch de Node, aunque estén disponibles en el proceso padre.
// NextResponse las necesita durante la carga de los route handlers.
if (typeof globalThis.Request === 'undefined') {
  Object.assign(globalThis, {
    Headers: EdgeHeaders,
    Request: EdgeRequest,
    Response: EdgeResponse,
  })
}
