import { Router, type Request, type Response } from 'express';
import { getAuthUser, requireAuth } from '../middlewares/requireAuth';
import { prisma } from '../lib/prisma';
import { get } from 'http';
import { Role } from '../../generated/prisma/enums';

const router: Router = Router();

/**
 * @swagger
 * /api/columns/{projectId}:
 *   get:
 *     summary: Get all columns of a project
 *     tags: [Columns]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of columns
 *       400:
 *         description: Project ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/:projectId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const projectId = req.params.projectId as string;

	if (!projectId) {
		res.status(400).json({ message: 'Project ID is required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: {
				notIn: [Role.REQUEST]
			},
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const columns = await prisma.column.findMany({
		where: { projectId },
	});

	res.json({ columns });
});

/**
 * @swagger
 * /api/columns/{projectId}:
 *   post:
 *     summary: Create a new column in a project
 *     tags: [Columns]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Column created successfully
 *       400:
 *         description: Invalid project ID or column name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/:projectId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const projectId = req.params.projectId as string;

	if (!projectId) {
		res.status(400).json({ message: 'Project ID is required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: {
				in: [Role.ADMIN]
			},
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const { name } = req.body as {
		name: string;
	};

	if (!name) {
		res.status(400).json({ message: 'Name is required' });
		return;
	}

	const order = await prisma.column.count({
		where: { projectId },
	});

	const column = await prisma.column.create({
		data: {
			name,
			projectId,
			order,
		},
		select: {
			id: true,
			name: true,
			order: true,
			projectId: true,
		},
	});

	res.status(201).json({ column });
});

/**
 * @swagger
 * /api/columns/{projectId}/{columnId}:
 *   patch:
 *     summary: Update an existing column
 *     tags: [Columns]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       400:
 *         description: Missing project ID, column ID, or name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.patch('/:projectId/:columnId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId } = req.params as {
		projectId: string;
		columnId: string;
	};

	if (!projectId || !columnId) {
		res.status(400).json({ message: 'Project ID and Column ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: {
				in: [Role.ADMIN]
			},
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const { name } = req.body as {
		name?: string;
	};

	if (!name) {
		res.status(400).json({ message: 'Name is required' });
		return;
	}

	const column = await prisma.column.update({
		where: { id: columnId },
		data: { name },
		select: {
			id: true,
			name: true,
			order: true,
			projectId: true,
		},
	});

	res.json({ column });
});

/**
 * @swagger
 * /api/columns/{projectId}/{columnId}:
 *   delete:
 *     summary: Delete an existing column
 *     tags: [Columns]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Column deleted successfully
 *       400:
 *         description: Missing project ID or column ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.delete('/:projectId/:columnId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId } = req.params as {
		projectId: string;
		columnId: string;
	};

	if (!projectId || !columnId) {
		res.status(400).json({ message: 'Project ID and Column ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: {
				in: [Role.ADMIN]
			},
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	await prisma.column.delete({
		where: { id: columnId },
	});

	res.status(204).send();
});

export default router;
