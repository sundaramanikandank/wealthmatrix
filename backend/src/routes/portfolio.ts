import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth'

const router = Router()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null

router.use(requireAuth)

// GET /api/portfolio/strategies - Get all saved strategies for user
router.get('/strategies', async (_req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching strategies:', error)
    res.status(500).json({ error: 'Failed to fetch strategies' })
  }
})

// POST /api/portfolio/strategies - Create new strategy
router.post('/strategies', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, instrument, legs, notes } = req.body

    if (!name || !instrument || !legs) {
      return res.status(400).json({ error: 'Missing required fields: name, instrument, legs' })
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert({
        user_id: userId,
        name,
        instrument,
        legs,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data, message: 'Strategy saved successfully' })
  } catch (error) {
    console.error('Error creating strategy:', error)
    res.status(500).json({ error: 'Failed to create strategy' })
  }
})

// PUT /api/portfolio/strategies/:id - Update strategy name/notes
router.put('/strategies/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params
    const { name, notes } = req.body

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabase
      .from('strategies')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    res.json({ data, message: 'Strategy updated successfully' })
  } catch (error) {
    console.error('Error updating strategy:', error)
    res.status(500).json({ error: 'Failed to update strategy' })
  }
})

// DELETE /api/portfolio/strategies/:id - Delete strategy
router.delete('/strategies/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.json({ message: 'Strategy deleted successfully' })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    res.status(500).json({ error: 'Failed to delete strategy' })
  }
})

// GET /api/portfolio/paper - Get paper positions
router.get('/paper', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const status = req.query.status as string | undefined

    let query = supabase
      .from('paper_positions')
      .select('*')
      .eq('user_id', userId)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('entry_date', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    res.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching paper positions:', error)
    res.status(500).json({ error: 'Failed to fetch paper positions' })
  }
})

// POST /api/portfolio/paper - Create paper position
router.post('/paper', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { strategy_name, instrument, legs, entry_premium, notes } = req.body

    if (!strategy_name || !instrument || !legs) {
      return res.status(400).json({ error: 'Missing required fields: strategy_name, instrument, legs' })
    }

    const { data, error } = await supabase
      .from('paper_positions')
      .insert({
        user_id: userId,
        strategy_name,
        instrument,
        legs,
        entry_premium: entry_premium || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ data, message: 'Paper position created successfully' })
  } catch (error) {
    console.error('Error creating paper position:', error)
    res.status(500).json({ error: 'Failed to create paper position' })
  }
})

// PUT /api/portfolio/paper/:id - Update paper position (close position)
router.put('/paper/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params
    const { status, exit_premium, exit_date, notes } = req.body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (exit_premium !== undefined) updateData.exit_premium = exit_premium
    if (exit_date !== undefined) updateData.exit_date = exit_date
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabase
      .from('paper_positions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Paper position not found' })
    }

    res.json({ data, message: 'Paper position updated successfully' })
  } catch (error) {
    console.error('Error updating paper position:', error)
    res.status(500).json({ error: 'Failed to update paper position' })
  }
})

// DELETE /api/portfolio/paper/:id - Delete paper position
router.delete('/paper/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    const userId = res.locals.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('paper_positions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.json({ message: 'Paper position deleted successfully' })
  } catch (error) {
    console.error('Error deleting paper position:', error)
    res.status(500).json({ error: 'Failed to delete paper position' })
  }
})

export default router
