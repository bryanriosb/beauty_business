import { environment as devEnvironment } from '@/environment/dev'
import { environment as staEnvironment } from '@/environment/sta'
import { environment as proEnvironment } from '@/environment/pro'

// Función para obtener el nombre de la rama (simulada o desde una variable de entorno)
const getNodeEnvName = (): string => {
  return process.env.NODE_ENV || 'production'
}

// Seleccionar el entorno basado en la rama
export const selectedEnvironment = (() => {
  const nodeEnvName = getNodeEnvName()

  switch (nodeEnvName) {
    case 'development':
      return devEnvironment
    case 'production':
      return proEnvironment
    default:
      return staEnvironment
  }
})()
