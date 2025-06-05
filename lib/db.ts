import { Pool } from 'pg'

let pool: Pool | null = null

export async function getDb(): Promise<Pool> {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'schedulen'}`
    
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
    
    await initDatabase()
  }
  return pool
}

async function initDatabase() {
  if (!pool) return

  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS date_options (
        id SERIAL PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        datetime TEXT NOT NULL,
        formatted TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        comment TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS availabilities (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        date_option_id INTEGER NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
        availability TEXT NOT NULL CHECK (availability IN ('available', 'maybe', 'unavailable', 'unknown'))
      );
    `)

    // Add comment column to existing participants table if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE participants ADD COLUMN IF NOT EXISTS comment TEXT;
      `)
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Comment column already exists or error adding it:', error)
    }

    // Add password column to existing events table if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS password TEXT;
      `)
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Password column already exists or error adding it:', error)
    }

    // Create confirmed_dates table if it doesn't exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS confirmed_dates (
          id SERIAL PRIMARY KEY,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          date_option_id INTEGER NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
          confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, date_option_id)
        );
      `)
    } catch (error) {
      console.log('Confirmed dates table might already exist:', error)
    }
  } finally {
    client.release()
  }
}

export interface Event {
  id: string
  title: string
  description: string
  password?: string
  dateOptions: DateOption[]
  participants: Participant[]
  createdAt: string
  confirmedDateOptionIds?: number[]
}

export interface DateOption {
  id?: number
  datetime: string
  formatted: string
}

export interface Participant {
  id?: number
  name: string
  availabilities: Record<string, string>
  comment?: string
  submittedAt: string
}

export interface EventRow {
  id: string
  title: string
  description: string
  password: string | null
  created_at: string
}

export interface DateOptionRow {
  id: number
  event_id: string
  datetime: string
  formatted: string
}

export interface ParticipantRow {
  id: number
  event_id: string
  name: string
  comment: string | null
  submitted_at: string
}

export interface AvailabilityRow {
  id: number
  participant_id: number
  date_option_id: number
  availability: string
}

export interface ConfirmedDateRow {
  id: number
  event_id: string
  date_option_id: number
  confirmed_at: string
}