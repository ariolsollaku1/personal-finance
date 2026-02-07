import { Router, Request, Response } from 'express';
import { categoryQueries } from '../db/queries.js';
import { sendSuccess, badRequest, notFound, conflict, internalError } from '../utils/response.js';
import {
  validateParams,
  validateBody,
  idParamSchema,
  createCategorySchema,
  updateCategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../validation/index.js';

const router = Router();

// GET /api/categories - List all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const categories = await categoryQueries.getAll(userId);
    sendSuccess(res, categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    internalError(res, 'Failed to fetch categories');
  }
});

// POST /api/categories - Create category
router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type } = req.body as CreateCategoryInput;

    // Check if category already exists
    const existing = await categoryQueries.getByName(userId, name);
    if (existing) {
      return conflict(res, 'Category already exists');
    }

    const id = await categoryQueries.create(userId, name, type);
    const category = await categoryQueries.getById(userId, id as number);

    sendSuccess(res, category, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    internalError(res, 'Failed to create category');
  }
});

// PUT /api/categories/:id - Rename category
router.put('/:id', validateParams(idParamSchema), validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
    const { name } = req.body as UpdateCategoryInput;

    const category = await categoryQueries.getById(userId, id);
    if (!category) {
      return notFound(res, 'Category not found');
    }

    // Check if new name already exists
    const existing = await categoryQueries.getByName(userId, name);
    if (existing && existing.id !== id) {
      return conflict(res, 'Category with this name already exists');
    }

    await categoryQueries.update(userId, id, name);
    const updatedCategory = await categoryQueries.getById(userId, id);

    sendSuccess(res, updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    internalError(res, 'Failed to update category');
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
    const category = await categoryQueries.getById(userId, id);

    if (!category) {
      return notFound(res, 'Category not found');
    }

    await categoryQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    internalError(res, 'Failed to delete category');
  }
});

export default router;
