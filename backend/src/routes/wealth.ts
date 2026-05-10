import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = Router()

// ============================================================================
// COLUMN MANAGEMENT ROUTES
// ============================================================================

router.use(requireAuth)

// GET /api/wealth/columns - Get all active columns for user
router.get('/columns', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id

    const { data, error } = await supabase
      .from('wealth_columns')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error('Error fetching wealth columns:', error)
    res.status(500).json({ error: 'Failed to fetch columns' })
  }
})

// POST /api/wealth/columns - Create new column
router.post('/columns', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { label, asset_type, color } = req.body

    if (!label) {
      return res.status(400).json({ error: 'Label is required' })
    }

    // Get max sort_order for this user
    const { data: existingColumns } = await supabase
      .from('wealth_columns')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextSortOrder = existingColumns && existingColumns.length > 0 
      ? existingColumns[0].sort_order + 1 
      : 0

    const { data, error } = await supabase
      .from('wealth_columns')
      .insert({
        user_id: userId,
        label,
        asset_type: asset_type || null,
        color: color || '#0099ff',
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error('Error creating wealth column:', error)
    res.status(500).json({ error: 'Failed to create column' })
  }
})

// PUT /api/wealth/columns/:id - Update column
router.put('/columns/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { id } = req.params
    const { label, color, sort_order, is_active, column_type } = req.body

    const updates: any = { updated_at: new Date().toISOString() }
    if (label !== undefined) updates.label = label
    if (color !== undefined) updates.color = color
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (is_active !== undefined) updates.is_active = is_active
    if (column_type !== undefined) updates.column_type = column_type

    const { data, error } = await supabase
      .from('wealth_columns')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error('Error updating wealth column:', error)
    res.status(500).json({ error: 'Failed to update column' })
  }
})

// DELETE /api/wealth/columns/:id - Soft delete column
router.delete('/columns/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { id } = req.params

    const { data, error } = await supabase
      .from('wealth_columns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('Error deleting wealth column:', error)
    res.status(500).json({ error: 'Failed to delete column' })
  }
})

// DELETE /api/wealth/columns/:id/permanent - Hard delete column + strip its data from all snapshots
router.delete('/columns/:id/permanent', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { id } = req.params

    // Remove column value from every snapshot row_data
    const { data: snapshots } = await supabase
      .from('wealth_snapshots')
      .select('id, row_data, manually_overridden')
      .eq('user_id', userId)

    if (snapshots && snapshots.length > 0) {
      for (const snap of snapshots) {
        const rd = { ...(snap.row_data || {}) }
        const mo = { ...(snap.manually_overridden || {}) }
        delete rd[id]
        delete mo[id]
        const total = Object.values(rd).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
        await supabase
          .from('wealth_snapshots')
          .update({ row_data: rd, manually_overridden: mo, total_inr: total })
          .eq('id', snap.id)
      }
    }

    // Hard delete the column
    const { error } = await supabase
      .from('wealth_columns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Error permanently deleting wealth column:', error)
    res.status(500).json({ error: 'Failed to permanently delete column' })
  }
})

// ============================================================================
// GRID DATA ROUTES
// ============================================================================

// GET /api/wealth/grid - Get full grid data
router.get('/grid', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id

    // Get active columns
    const { data: columns, error: colError } = await supabase
      .from('wealth_columns')
      .select('id, label, color, asset_type, column_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (colError) throw colError

    // Get all snapshots (rows)
    const { data: snapshots, error: snapError } = await supabase
      .from('wealth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })

    if (snapError) throw snapError

    // Pre-compute set of VALUE column ids for total calculation
    const valueColIds = new Set(
      (columns || []).filter((c: any) => c.column_type !== 'reference').map((c: any) => c.id)
    )

    // Transform snapshots into grid rows
    const rows = (snapshots || []).map((snapshot: any) => {
      const month = snapshot.snapshot_date.substring(0, 7) // YYYY-MM
      const monthDate = new Date(snapshot.snapshot_date)
      const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const rowData = snapshot.row_data || {}

      // Recalculate total excluding reference columns
      const total = Object.entries(rowData).reduce((sum: number, [k, v]: [string, any]) =>
        valueColIds.has(k) ? sum + (Number(v) || 0) : sum, 0)

      return {
        month,
        label,
        values: rowData,
        total,
        auto_calculated: snapshot.auto_calculated || false,
        notes: snapshot.notes || '',
        manually_overridden: snapshot.manually_overridden || {},
      }
    })

    res.json({
      columns: columns || [],
      rows,
    })
  } catch (error) {
    console.error('Error fetching wealth grid:', error)
    res.status(500).json({ error: 'Failed to fetch grid data' })
  }
})

// POST /api/wealth/grid/row - Create or update a month row
router.post('/grid/row', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { month, values, notes, auto_calculated } = req.body

    if (!month) {
      return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' })
    }

    // Calculate total — only sum VALUE columns (exclude reference columns)
    const { data: valueCols } = await supabase
      .from('wealth_columns')
      .select('id')
      .eq('user_id', userId)
      .eq('column_type', 'value')
      .eq('is_active', true)
    const valueColIds = new Set((valueCols || []).map((c: any) => c.id))
    const total = Object.entries(values || {}).reduce((sum: number, [k, v]: [string, any]) =>
      valueColIds.has(k) ? sum + (Number(v) || 0) : sum, 0)

    // Create snapshot_date (first day of month)
    const snapshot_date = `${month}-01`

    // Check if row exists
    const { data: existing } = await supabase
      .from('wealth_snapshots')
      .select('id')
      .eq('user_id', userId)
      .gte('snapshot_date', snapshot_date)
      .lt('snapshot_date', `${month}-32`)
      .single()

    let result

    if (existing) {
      // Update existing row
      const { data, error } = await supabase
        .from('wealth_snapshots')
        .update({
          row_data: values || {},
          total_inr: total,
          notes: notes || null,
          auto_calculated: auto_calculated || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from('wealth_snapshots')
        .insert({
          user_id: userId,
          snapshot_date,
          row_data: values || {},
          total_inr: total,
          notes: notes || null,
          auto_calculated: auto_calculated || false,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (error) {
    console.error('Error saving wealth grid row:', error)
    res.status(500).json({ error: 'Failed to save row' })
  }
})

// PATCH /api/wealth/grid/cell - Update single cell
router.patch('/grid/cell', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { month, column_id, value } = req.body

    if (!month || !column_id) {
      return res.status(400).json({ error: 'Month and column_id are required' })
    }

    const snapshot_date = `${month}-01`

    // Get existing snapshot
    const { data: snapshot, error: fetchError } = await supabase
      .from('wealth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapshot_date', snapshot_date)
      .lt('snapshot_date', `${month}-32`)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const row_data = snapshot?.row_data || {}
    const manually_overridden = snapshot?.manually_overridden || {}

    // Update cell value
    row_data[column_id] = Number(value) || 0
    manually_overridden[column_id] = true

    // Recalculate total
    const total = Object.values(row_data).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)

    let result

    if (snapshot) {
      // Update existing
      const { data, error } = await supabase
        .from('wealth_snapshots')
        .update({
          row_data,
          manually_overridden,
          total_inr: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', snapshot.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new snapshot
      const { data, error } = await supabase
        .from('wealth_snapshots')
        .insert({
          user_id: userId,
          snapshot_date,
          row_data,
          manually_overridden,
          total_inr: total,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (error) {
    console.error('Error updating wealth grid cell:', error)
    res.status(500).json({ error: 'Failed to update cell' })
  }
})

// DELETE /api/wealth/grid/rows - Delete ALL grid rows for user
router.delete('/grid/rows', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id

    const { error } = await supabase
      .from('wealth_snapshots')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting all wealth grid rows:', error)
    res.status(500).json({ error: 'Failed to delete all rows' })
  }
})

// DELETE /api/wealth/grid/row/:month - Delete a grid row by month (YYYY-MM)
router.delete('/grid/row/:month', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { month } = req.params
    const snapshot_date = `${month}-01`

    const { error } = await supabase
      .from('wealth_snapshots')
      .delete()
      .eq('user_id', userId)
      .gte('snapshot_date', snapshot_date)
      .lt('snapshot_date', `${month}-32`)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting wealth grid row:', error)
    res.status(500).json({ error: 'Failed to delete row' })
  }
})

// GET /api/wealth/grid/autocalc - Calculate current month values from assets
router.get('/grid/autocalc', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user?.id
    const { month } = req.query

    // Get active columns
    const { data: columns } = await supabase
      .from('wealth_columns')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Get all assets
    const { data: assets } = await supabase
      .from('wealth_assets')
      .select('*')
      .eq('user_id', userId)

    if (!columns || !assets) {
      return res.json({})
    }

    // Calculate values per column
    const calculated: Record<string, number> = {}

    for (const column of columns) {
      let columnTotal = 0

      // Filter assets by asset_type if column has one
      const relevantAssets = column.asset_type
        ? assets.filter((a: any) => a.asset_type === column.asset_type)
        : []

      // Sum up asset values (simplified - in production would fetch live prices)
      for (const asset of relevantAssets) {
        // For now, use placeholder calculation
        // In production, this would call priceService.calculateAssetValue()
        if (asset.balance_inr) {
          columnTotal += asset.balance_inr
        }
      }

      calculated[column.id] = columnTotal
    }

    res.json(calculated)
  } catch (error) {
    console.error('Error auto-calculating wealth grid:', error)
    res.status(500).json({ error: 'Failed to auto-calculate' })
  }
})

export default router
