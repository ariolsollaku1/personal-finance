import { Router, Request, Response } from 'express';
import { categoryQueries } from '../db/queries.js';

const router = Router();

// GET /api/categories - List all categories
router.get('/', (_req: Request, res: Response) => {
  try {
    const categories = categoryQueries.getAll();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create category
router.post('/', (req: Request, res: Response) => {
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
    const existing = categoryQueries.getByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Category already exists', category: existing });
    }

    const id = categoryQueries.create(name, categoryType);
    const category = categoryQueries.getById(id as number);

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Rename category
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = categoryQueries.getById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists
    const existing = categoryQueries.getByName(name);
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    categoryQueries.update(id, name);
    const updatedCategory = categoryQueries.getById(id);

    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const category = categoryQueries.getById(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    categoryQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
