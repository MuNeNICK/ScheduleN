import { getDb, Event, EventRow, DateOptionRow, ParticipantRow, AvailabilityRow, Participant, ConfirmedDateRow } from './db'

export async function createEvent(eventData: Omit<Event, 'createdAt'>): Promise<string> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    await client.query(
      'INSERT INTO events (id, title, description, password) VALUES ($1, $2, $3, $4)',
      [eventData.id, eventData.title, eventData.description || '', eventData.password || null]
    )

    for (const dateOption of eventData.dateOptions) {
      await client.query(
        'INSERT INTO date_options (event_id, datetime, formatted, start_time, end_time) VALUES ($1, $2, $3, $4, $5)',
        [eventData.id, dateOption.datetime, dateOption.formatted, dateOption.startTime || null, dateOption.endTime || null]
      )
    }
    
    await client.query('COMMIT')
    return eventData.id
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getEvent(id: string): Promise<Event | null> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    const eventResult = await client.query<EventRow>('SELECT * FROM events WHERE id = $1', [id])
    if (eventResult.rows.length === 0) return null
    
    const event = eventResult.rows[0]
    
    const dateOptionsResult = await client.query<DateOptionRow>(
      'SELECT * FROM date_options WHERE event_id = $1 ORDER BY id',
      [id]
    )
    
    const participantsResult = await client.query<ParticipantRow>(
      'SELECT * FROM participants WHERE event_id = $1 ORDER BY id',
      [id]
    )
    
    const participants: Participant[] = []
    
    for (const participant of participantsResult.rows) {
      const availabilitiesResult = await client.query<AvailabilityRow & { date_option_id: number }>(
        `SELECT a.*, d.id as date_option_id 
         FROM availabilities a
         JOIN date_options d ON a.date_option_id = d.id
         WHERE a.participant_id = $1`,
        [participant.id]
      )
      
      const availabilities: Record<string, string> = {}
      for (const avail of availabilitiesResult.rows) {
        availabilities[avail.date_option_id.toString()] = avail.availability
      }
      
      participants.push({
        id: participant.id,
        name: participant.name,
        availabilities,
        comment: participant.comment || undefined,
        submittedAt: participant.submitted_at
      })
    }
    
    // Get confirmed dates
    const confirmedDatesResult = await client.query<ConfirmedDateRow>(
      'SELECT * FROM confirmed_dates WHERE event_id = $1',
      [id]
    )
    const confirmedDateOptionIds = confirmedDatesResult.rows.map(row => row.date_option_id)
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      password: event.password || undefined,
      dateOptions: dateOptionsResult.rows.map(row => ({
        id: row.id,
        datetime: row.datetime,
        formatted: row.formatted,
        startTime: row.start_time || undefined,
        endTime: row.end_time || undefined
      })),
      participants,
      createdAt: event.created_at,
      confirmedDateOptionIds: confirmedDateOptionIds.length > 0 ? confirmedDateOptionIds : undefined
    }
  } finally {
    client.release()
  }
}

export async function addParticipant(
  eventId: string,
  name: string,
  availabilities: Record<string, string>,
  comment?: string
): Promise<void> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const participantResult = await client.query<{ id: number }>(
      'INSERT INTO participants (event_id, name, comment) VALUES ($1, $2, $3) RETURNING id',
      [eventId, name, comment || null]
    )
    
    const participantId = participantResult.rows[0].id
    
    for (const [dateOptionId, availability] of Object.entries(availabilities)) {
      if (availability) {
        await client.query(
          'INSERT INTO availabilities (participant_id, date_option_id, availability) VALUES ($1, $2, $3)',
          [participantId, parseInt(dateOptionId), availability]
        )
      }
    }
    
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateEvent(id: string, updates: Partial<Pick<Event, 'title' | 'description' | 'password' | 'dateOptions'>>): Promise<void> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Build update query dynamically based on what fields are being updated
    const updateFields: string[] = []
    const updateValues: (string | null)[] = []
    let paramCount = 1

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount}`)
      updateValues.push(updates.title)
      paramCount++
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount}`)
      updateValues.push(updates.description)
      paramCount++
    }

    if (updates.password !== undefined) {
      updateFields.push(`password = $${paramCount}`)
      updateValues.push(updates.password || null)
      paramCount++
    }

    if (updateFields.length > 0) {
      updateValues.push(id)
      await client.query(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      )
    }

    if (updates.dateOptions !== undefined) {
      // 既存の日時オプションとその回答を取得
      const existingOptionsResult = await client.query<{ id: number, datetime: string }>(
        'SELECT id, datetime FROM date_options WHERE event_id = $1',
        [id]
      )
      const existingOptions = existingOptionsResult.rows
      
      // 既存の回答を一時的に保存
      const existingAvailabilities: { [datetime: string]: { participant_id: number, availability: string }[] } = {}
      
      for (const option of existingOptions) {
        const availabilitiesResult = await client.query<{ participant_id: number, availability: string }>(
          'SELECT participant_id, availability FROM availabilities WHERE date_option_id = $1',
          [option.id]
        )
        existingAvailabilities[option.datetime] = availabilitiesResult.rows
      }
      
      // 削除された日時オプションの参加者回答を削除
      const newDatetimes = new Set(updates.dateOptions.map(opt => opt.datetime))
      for (const existingOption of existingOptions) {
        if (!newDatetimes.has(existingOption.datetime)) {
          await client.query(
            'DELETE FROM availabilities WHERE date_option_id = $1',
            [existingOption.id]
          )
        }
      }
      
      // 全ての日時オプションを削除して再作成
      await client.query('DELETE FROM date_options WHERE event_id = $1', [id])
      
      // 新しい日時オプションを作成し、既存の参加者回答を復元
      for (const dateOption of updates.dateOptions) {
        const insertResult = await client.query<{ id: number }>(
          'INSERT INTO date_options (event_id, datetime, formatted, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [id, dateOption.datetime, dateOption.formatted, dateOption.startTime || null, dateOption.endTime || null]
        )
        const newOptionId = insertResult.rows[0].id
        
        // 同じ日時の既存回答があれば復元
        const savedAvailabilities = existingAvailabilities[dateOption.datetime]
        if (savedAvailabilities) {
          for (const avail of savedAvailabilities) {
            await client.query(
              'INSERT INTO availabilities (participant_id, date_option_id, availability) VALUES ($1, $2, $3)',
              [avail.participant_id, newOptionId, avail.availability]
            )
          }
        }
      }
    }
    
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    await client.query('DELETE FROM events WHERE id = $1', [id])
  } finally {
    client.release()
  }
}

export async function validateEventPassword(eventId: string, password: string): Promise<boolean> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    const eventResult = await client.query<EventRow>('SELECT password FROM events WHERE id = $1', [eventId])
    if (eventResult.rows.length === 0) return false
    
    const event = eventResult.rows[0]
    
    // If no password is set, access is allowed
    if (!event.password) return true
    
    // Check if provided password matches
    return event.password === password
  } finally {
    client.release()
  }
}

export async function isEventPasswordProtected(eventId: string): Promise<boolean> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    const eventResult = await client.query<EventRow>('SELECT password FROM events WHERE id = $1', [eventId])
    if (eventResult.rows.length === 0) return false
    
    const event = eventResult.rows[0]
    return !!event.password
  } finally {
    client.release()
  }
}

export async function getAllEvents(): Promise<Event[]> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    const eventsResult = await client.query<EventRow>('SELECT * FROM events ORDER BY created_at DESC')
    
    const events: Event[] = []
    
    for (const eventRow of eventsResult.rows) {
      const event = await getEvent(eventRow.id)
      if (event) {
        events.push(event)
      }
    }
    
    return events
  } finally {
    client.release()
  }
}

export async function toggleEventDateConfirmation(eventId: string, dateOptionId: number): Promise<{ confirmed: boolean }> {
  const pool = await getDb()
  const client = await pool.connect()
  
  try {
    // Check if this date is already confirmed
    const existingResult = await client.query<ConfirmedDateRow>(
      'SELECT * FROM confirmed_dates WHERE event_id = $1 AND date_option_id = $2',
      [eventId, dateOptionId]
    )
    
    if (existingResult.rows.length > 0) {
      // If already confirmed, remove it
      await client.query(
        'DELETE FROM confirmed_dates WHERE event_id = $1 AND date_option_id = $2',
        [eventId, dateOptionId]
      )
      return { confirmed: false }
    } else {
      // If not confirmed, add it
      await client.query(
        'INSERT INTO confirmed_dates (event_id, date_option_id) VALUES ($1, $2)',
        [eventId, dateOptionId]
      )
      return { confirmed: true }
    }
  } finally {
    client.release()
  }
}