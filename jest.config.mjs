import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Apunta al directorio raíz de la aplicación Next.js
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  // Usa jsdom para simular el entorno del navegador en tests de componentes
  testEnvironment: 'jest-environment-jsdom',

  // Mapeo de alias de módulos (@/*) para que Jest los resuelva igual que TypeScript
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Archivos de configuración que se ejecutan después de que Jest inicializa el entorno de test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Patrones para detectar archivos de test
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Extensiones de módulos que Jest debe procesar
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Cobertura de código
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**', // Excluir páginas de Next.js de la cobertura
  ],
}

export default createJestConfig(config)
