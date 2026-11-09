declare global {
  namespace Express {
    interface Request {
      user?: any
      auth?: any
      service?: { clientId: string; scopes: string[] }
      validated?: Record<string, any>
    }
  }
}

export {}
