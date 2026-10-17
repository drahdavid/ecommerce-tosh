import 'dotenv/config'

// Los tests de integración nunca usan la base de desarrollo.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/tosh_test'
process.env.MP_ACCESS_TOKEN = ''
process.env.RESEND_API_KEY = ''
