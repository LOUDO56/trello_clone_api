import { Router, type Request, type Response } from 'express';
import { getAuthUser, requireAuth } from '../middlewares/requireAuth';
import { prisma } from '../lib/prisma';
import { Role } from '../../generated/prisma/client';

const router: Router = Router();

/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}:
 *   get:
 *     summary: Get all tasks in a column
 *     tags: [Tasks]
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
 *       200:
 *         description: A list of tasks
 *       400:
 *         description: Missing project ID or column ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/:projectId/:columnId', requireAuth, async (req: Request, res: Response) => {

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
			role: { notIn: [Role.REQUEST] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const tasks = await prisma.task.findMany({
		where: { columnId },
	});

	res.json({ tasks });
});

/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}:
 *   post:
 *     summary: Create a new task in a column
 *     tags: [Tasks]
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
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Missing title, project ID, or column ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Column not found
 */
router.post('/:projectId/:columnId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId } = req.params as {
		projectId: string;
		columnId: string;
	};

/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}/{taskId}:
 *   patch:
 *     summary: Update an existing task
 *     tags: [Tasks]
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
 *       - in: path
 *         name: taskId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               done:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Missing path parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
	if (!projectId || !columnId) {
		res.status(400).json({ message: 'Project ID and Column ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: { in: [Role.MEMBER, Role.ADMIN] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const column = await prisma.column.findFirst({
		where: { id: columnId, projectId },
	});

	if (!column) {
		res.status(404).json({ message: 'Column not found' });
		return;
	}

	const { title, description } = req.body as {
		title: string;
		description?: string;
	};

	if (!title) {
		res.status(400).json({ message: 'Title is required' });
		return;
	}

	const task = await prisma.task.create({
		data: { title, description: description ?? null, columnId },
	});

	res.status(201).json({ task });
});

router.patch('/:projectId/:columnId/:taskId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId, taskId } = req.params as {
		projectId: string;
		columnId: string;
		taskId: string;
	};

	if (!projectId || !columnId || !taskId) {
		res.status(400).json({ message: 'Project ID, Column ID and Task ID are required' });
		return;
	}
/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
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
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Task deleted successfully
 *       400:
 *         description: Missing path parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: { notIn: [Role.REQUEST] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}/{taskId}/assign:
 *   patch:
 *     summary: Assign a task to a user
 *     tags: [Tasks]
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
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to assign the task to (Only admins can specify this)
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       400:
 *         description: Invalid target user or missing parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
	const task = await prisma.task.findFirst({
		where: { id: taskId, columnId, column: { projectId } },
	});

	if (!task) {
		res.status(404).json({ message: 'Task not found' });
		return;
	}

	const isAdmin = userInProject.role === Role.ADMIN;
	const isAssignedUser = task.assignedUserId === user.id;

	if (!isAdmin && !isAssignedUser) {
		res.status(403).json({ message: 'Access denied: only admin or assigned user can update this task' });
		return;
	}

	const { title, description, done } = req.body as {
		title?: string;
		description?: string;
		done?: boolean;
	};

	const updated = await prisma.task.update({
		where: { id: taskId },
		data: {
			...(title !== undefined && { title }),
			...(description !== undefined && { description }),
			...(done !== undefined && { done }),
		},
	});

	res.json({ task: updated });
});

router.delete('/:projectId/:columnId/:taskId', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId, taskId } = req.params as {
		projectId: string;
		columnId: string;
		taskId: string;
	};

	if (!projectId || !columnId || !taskId) {
		res.status(400).json({ message: 'Project ID, Column ID and Task ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: { notIn: [Role.REQUEST] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const task = await prisma.task.findFirst({
		where: { id: taskId, columnId, column: { projectId } },
	});

	if (!task) {
		res.status(404).json({ message: 'Task not found' });
		return;
	}

	const isAdmin = userInProject.role === Role.ADMIN;
	const isAssignedUser = task.assignedUserId === user.id;

	if (!isAdmin && !isAssignedUser) {
/**
 * @swagger
 * /api/tasks/{projectId}/{columnId}/{taskId}/assign:
 *   delete:
 *     summary: Unassign a task
 *     tags: [Tasks]
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
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task unassigned successfully
 *       400:
 *         description: Missing path parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (only admins can unassign)
 *       404:
 *         description: Task not found
 */
		res.status(403).json({ message: 'Access denied: only admin or assigned user can delete this task' });
		return;
	}

	await prisma.task.delete({ where: { id: taskId } });

	res.status(204).send();
});

router.patch('/:projectId/:columnId/:taskId/assign', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId, taskId } = req.params as {
		projectId: string;
		columnId: string;
		taskId: string;
	};

	if (!projectId || !columnId || !taskId) {
		res.status(400).json({ message: 'Project ID, Column ID and Task ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: { in: [Role.MEMBER, Role.ADMIN] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied' });
		return;
	}

	const task = await prisma.task.findFirst({
		where: { id: taskId, columnId, column: { projectId } },
	});

	if (!task) {
		res.status(404).json({ message: 'Task not found' });
		return;
	}

	const isAdmin = userInProject.role === Role.ADMIN;

	let targetUserId: string;

	if (isAdmin) {
		const { userId } = req.body as { userId?: string };
		targetUserId = userId ?? user.id;

		const targetInProject = await prisma.userProject.findFirst({
			where: {
				projectId,
				userId: targetUserId,
				role: { in: [Role.MEMBER, Role.ADMIN] },
			},
		});

		if (!targetInProject) {
			res.status(400).json({ message: 'Target user is not a member of this project' });
			return;
		}
	} else {
		if (task.assignedUserId !== null) {
			res.status(403).json({ message: 'Task is already assigned; only an admin can change the assignment' });
			return;
		}
		targetUserId = user.id;
	}

	const updated = await prisma.task.update({
		where: { id: taskId },
		data: { assignedUserId: targetUserId },
	});

	res.json({ task: updated });
});

router.delete('/:projectId/:columnId/:taskId/assign', requireAuth, async (req: Request, res: Response) => {

	const user = getAuthUser(req);

	const { projectId, columnId, taskId } = req.params as {
		projectId: string;
		columnId: string;
		taskId: string;
	};

	if (!projectId || !columnId || !taskId) {
		res.status(400).json({ message: 'Project ID, Column ID and Task ID are required' });
		return;
	}

	const userInProject = await prisma.userProject.findFirst({
		where: {
			projectId,
			userId: user.id,
			role: { in: [Role.ADMIN] },
		},
	});

	if (!userInProject) {
		res.status(403).json({ message: 'Access denied: only admin can remove task assignment' });
		return;
	}

	const task = await prisma.task.findFirst({
		where: { id: taskId, columnId, column: { projectId } },
	});

	if (!task) {
		res.status(404).json({ message: 'Task not found' });
		return;
	}

	const updated = await prisma.task.update({
		where: { id: taskId },
		data: { assignedUserId: null },
	});

	res.json({ task: updated });
});

export default router;
