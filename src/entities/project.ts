import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth } from '../middlewares/requireAuth';
import { Role } from '../../generated/prisma/enums';

const router: Router = Router();

/**
 * @swagger
 * /api/projects/:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: A list of all projects
 */
router.get('/', async (req: Request, res: Response) => {
	const projects = await prisma.project.findMany();
	res.json({ projects });
});

/**
 * @swagger
 * /api/projects/create:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
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
 *         description: Project created successfully
 *       400:
 *         description: Name is required
 *       401:
 *         description: Unauthorized
 */
router.post('/create', requireAuth, async (req: Request, res: Response) => {
	const user = getAuthUser(req);
/**
 * @swagger
 * /api/projects/{projectId}/join:
 *   post:
 *     summary: Request to join a project
 *     tags: [Projects]
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
 *         description: Joined project successfully / request sent
 *       400:
 *         description: Invalid project ID or already a member/pending request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */

	const { name } = req.body as {
		name: string;
	};

	if (!name) {
		res.status(400).json({ message: 'Name is required' });
		return;
	}

	const project = await prisma.project.create({
		data: {
			name,
			ownerId: user.id,
		},
		select: {
			id: true,
			name: true,
			ownerId: true,
		},
	});

	await prisma.userProject.create({
		data: {
			userId: user.id,
			projectId: project.id,
			role: Role.ADMIN,
		},
	});

	res.status(201).json({ project });

});

router.post('/:projectId/join', requireAuth, async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const projectId = req.params.projectId as string;

	if (!projectId) {
		res.status(400).json({ message: 'Project ID is required' });
		return;
	}

	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});

	if (!project) {
		res.status(404).json({ message: 'Project not found' });
		return;
	}
	
	const existingMembership = await prisma.userProject.findUnique({
		where: {
			userId_projectId: {
				userId: user.id,
				projectId: project.id,
/**
 * @swagger
 * /api/projects/{projectId}/accept:
 *   post:
 *     summary: Accept a pending join request as an admin
 *     tags: [Projects]
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
 *         description: Join request accepted
 *       400:
 *         description: Invalid project ID or no pending request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
			},
		},
	});

	if (existingMembership) {
		if (existingMembership.role === Role.REQUEST) {
			res.status(400).json({ message: 'Join request already pending' });
		} else {
			res.status(400).json({ message: 'Already a member of this project' });
		}
		return;
	}

	await prisma.userProject.create({
		data: {
			userId: user.id,
			projectId: project.id,
			role: Role.REQUEST,
		},
	});

	res.json({ message: 'Joined project successfully' });
});
/**
 * @swagger
 * /api/projects/{projectId}/change-role:
 *   post:
 *     summary: Change the role of a user in a project
 *     tags: [Projects]
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
 *               - targetUserId
 *               - newRole
 *             properties:
 *               targetUserId:
 *                 type: string
 *               newRole:
 *                 type: string
 *                 enum: [ADMIN, MEMBER, REQUEST]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only project admins can change roles
 *       404:
 *         description: Project or user membership not found
 */

router.post('/:projectId/accept', requireAuth, async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const projectId = req.params.projectId as string;

	if (!projectId) {
		res.status(400).json({ message: 'Project ID is required' });
		return;
	}

	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});

	if (!project) {
		res.status(404).json({ message: 'Project not found' });
		return;
	}

	const requesterMembership = await prisma.userProject.findUnique({
		where: {
			userId_projectId: { userId: user.id, projectId: project.id },
		},
	});

	if (!requesterMembership || requesterMembership.role !== Role.ADMIN) {
		res.status(403).json({ message: 'Only project admins can accept join requests' });
		return;
	}

	const { targetUserId } = (req.body || {}) as { targetUserId?: string };

	if (targetUserId) {
		const pending = await prisma.userProject.findUnique({
			where: { userId_projectId: { userId: targetUserId, projectId: project.id } },
		});
		if (!pending || pending.role !== Role.REQUEST) {
			res.status(400).json({ message: 'No pending join request found for this user' });
			return;
		}
		await prisma.userProject.update({
			where: { userId_projectId: { userId: targetUserId, projectId: project.id } },
			data: { role: Role.MEMBER },
		});
	} else {
		try {
			await prisma.userProject.updateMany({
				where: { projectId: project.id, role: Role.REQUEST },
				data: { role: Role.MEMBER },
			});
		} catch (error) {
			console.error("Error updating userProject:", error);
			res.status(500).json({ message: 'Internal server error', error });
			return;
		}
	}

	res.json({ message: 'Join request(s) accepted' });
});

router.post('/:projectId/change-role', requireAuth, async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const projectId = req.params.projectId as string;
	const { targetUserId, newRole } = req.body as {
		targetUserId: string;
		newRole: Role;
	};

	if (!projectId || !targetUserId || !newRole) {
		res.status(400).json({ message: 'Project ID, target user ID and new role are required' });
		return;
	}

	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});

	if (!project) {
		res.status(404).json({ message: 'Project not found' });
		return;
	}

	const requesterMembership = await prisma.userProject.findUnique({
		where: {
			userId_projectId: {
				userId: user.id,
				projectId: project.id,
			},
		},
	});

	if (!requesterMembership || requesterMembership.role !== Role.ADMIN) {
		res.status(403).json({ message: 'Only project admins can change roles' });
		return;
	}

	const targetMembership = await prisma.userProject.findUnique({
		where: {
			userId_projectId: {
				userId: targetUserId,
				projectId: project.id,
			},
		},
	});

	if (!targetMembership) {
		res.status(404).json({ message: 'Target user is not a member of this project' });
		return;
	}

	await prisma.userProject.update({
		where: {
			userId_projectId: {
				userId: targetUserId,
				projectId: project.id,
			},
		},
		data: {
			role: newRole,
		},
	});

	res.json({ message: 'User role updated successfully' });
});

export default router;
