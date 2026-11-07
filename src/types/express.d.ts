declare global {
  namespace Express {
    interface Request {
      user?: any
      auth?: any
      validated?: Record<string, any>
    }
  }
}

export {}
