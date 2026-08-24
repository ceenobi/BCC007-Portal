import axios from 'axios'
import axiosRetry from 'axios-retry'
import { env } from './keys'
import logger from './logger'

export const PAYSTACK_SECRET_KEY = env.paystackSecretKey
export const PAYSTACK_BASE_URL = 'https://api.paystack.co'

const REQUEST_TIMEOUT_MS = 15_000
const MAX_RETRIES = 2

let paystackInstance: any = null

export const getPaystack = () => {
  if (!paystackInstance) {
    const secret = env.paystackSecretKey
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is not defined. Please add it to your .env file')
    }
    logger.info("Paystack key configured")
    paystackInstance = axios.create({
      baseURL: PAYSTACK_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    })
    axiosRetry(paystackInstance, {
      retries: MAX_RETRIES,
      // exponentialDelay already prefers the Retry-After header when present
      retryDelay: axiosRetry.exponentialDelay,
      shouldResetTimeout: true,
      retryCondition: (error) => {
        if (error.config?.method !== 'get') return false
        if (!error.response) return true
        return error.response.status === 429 || error.response.status >= 500
      },
    })
  }
  return paystackInstance
}
