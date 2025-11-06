'use server'

export async function authenticate(
  credentials: Record<'username' | 'password', string> | undefined
) {
  try {
    if (!credentials) return null

    const USERNAME = process.env.AUTH_USERNAME
    const PASSWORD = process.env.AUTH_PASSWORD
    const username = credentials.username
    const password = credentials.password


    if (USERNAME !== username) return null
    if (PASSWORD !== password) return null

    const userSessionData = {
      id: '81261a8e-49b3-47cd-934d-71ef09c0e4d9',
      username: username,
      name: 'Administrador',
      role: 'admin',
    }
    return userSessionData
  } catch (err) {
    console.error('Cannot singn in:', err)
  }
}
