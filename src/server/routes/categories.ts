import { Router, Request, Response } from 'express';
import { categoryQueries } from '../db/queries.js';

const router = Router();

// GET /api/categories - List all categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await categoryQueries.getAll();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const categoryType = type || 'expense';
    if (!['income', 'expense'].includes(categoryType)) {
      return res.status(400).json({ error: 'Invalid category type' });
    }

    // Check if category already exists
    const existing = await categoryQueries.getByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Category already exists', category: existing });
    }

    const id = await categoryQueries.create(name, categoryType);
    const category = await categoryQueries.getById(id as number);

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Rename category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await categoryQueries.getById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists
    const existing = await categoryQueries.getByName(name);
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    await categoryQueries.update(id, name);
    const updatedCategory = await categoryQueries.getById(id);

    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const category = await categoryQueries.getById(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await categoryQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
