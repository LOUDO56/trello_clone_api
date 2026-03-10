import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { Role } from '../generated/prisma/enums';

const API_URL = 'http://localhost:3000/api';

describe('Trello Clone API Tests', () => {
	let adminCookie: string;
	let memberCookie: string;
	let otherUserCookie: string;

	let adminId: string;
	let memberId: string;
	let otherUserId: string;
	let projectId: string;
	let columnId: string;
	let taskId: string;

	beforeAll(async () => {
		// Nettoyage de la base de données avant les tests
		await prisma.task.deleteMany();
		await prisma.column.deleteMany();
		await prisma.userProject.deleteMany();
		await prisma.project.deleteMany();
		await prisma.user.deleteMany();

		const registerAndGetCookie = async (username: string, email: string) => {
			const res = await request(API_URL).post('/users/register').send({
				username,
				email,
				password: 'password123',
			});
			const cookie = res.headers['set-cookie'][0];
			return { cookie, id: res.body.user.id };
		};

		const admin = await registerAndGetCookie('AdminUser', 'admin@test.com');
		adminCookie = admin.cookie;
		adminId = admin.id;

		const member = await registerAndGetCookie('MemberUser', 'member@test.com');
		memberCookie = member.cookie;
		memberId = member.id;

		const other = await registerAndGetCookie('OtherUser', 'other@test.com');
		otherUserCookie = other.cookie;
		otherUserId = other.id;
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	// --- PROJETS ---

	it('On doit pouvoir lister tous les projets (même en anonyme)', async () => {
		const res = await request(API_URL).get('/projects');
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('projects');
	});

	it('On peut créer un projet si on est connecté (on devient admin du projet)', async () => {
		const res = await request(API_URL)
			.post('/projects/create')
			.set('Cookie', adminCookie)
			.send({ name: 'Projet Test' });
		
		expect(res.status).toBe(201);
		expect(res.body.project).toHaveProperty('id');
		projectId = res.body.project.id;

		const membership = await prisma.userProject.findFirst({
			where: { projectId, userId: adminId },
		});
		expect(membership?.role).toBe(Role.ADMIN);
	});

	it('On peut demander à rejoindre un projet si on est connecté', async () => {
		const res = await request(API_URL)
			.post(`/projects/${projectId}/join`)
			.set('Cookie', memberCookie);
		
		expect(res.status).toBe(200);

		const membership = await prisma.userProject.findFirst({
			where: { projectId, userId: memberId },
		});
		expect(membership?.role).toBe(Role.REQUEST);
	});

	it('On ne peut voir les colonnes et les taches que du projet ou l on est attaché (statut membre ou admin)', async () => {
		let res = await request(API_URL)
			.get(`/columns/${projectId}`)
			.set('Cookie', adminCookie);
		expect(res.status).toBe(200);

		res = await request(API_URL)
			.get(`/columns/${projectId}`)
			.set('Cookie', memberCookie);
		expect(res.status).toBe(403); // Refusé

		res = await request(API_URL)
			.get(`/columns/${projectId}`)
			.set('Cookie', otherUserCookie);
		expect(res.status).toBe(403); // Refusé
	});

	it('Un admin peut valider une demande à rejoindre un projet (statut demande vers membre)', async () => {
		const res = await request(API_URL)
			.post(`/projects/${projectId}/accept`)
			.set('Cookie', adminCookie);
		if (res.status !== 200) console.error(res.body);
		expect(res.status).toBe(200);

		// Désormais "member" a le statut MEMBER
		const membership = await prisma.userProject.findFirst({
			where: { projectId, userId: memberId },
		});
		expect(membership?.role).toBe(Role.MEMBER);
	});

	it('Un admin peut changer le statut d un membre (membre->admin ou admin->membre)', async () => {
		let res = await request(API_URL)
			.post(`/projects/${projectId}/change-role`)
			.set('Cookie', adminCookie)
			.send({ targetUserId: memberId, newRole: Role.ADMIN });
		expect(res.status).toBe(200);

		let membership = await prisma.userProject.findFirst({
			where: { projectId, userId: memberId },
		});
		expect(membership?.role).toBe(Role.ADMIN);

		res = await request(API_URL)
			.post(`/projects/${projectId}/change-role`)
			.set('Cookie', adminCookie)
			.send({ targetUserId: memberId, newRole: Role.MEMBER });
		expect(res.status).toBe(200);
	});

	// --- COLONNES ---

	it('Un admin peut créer/modifier/supprimer des colonnes', async () => {
		// Création
		const createRes = await request(API_URL)
			.post(`/columns/${projectId}`)
			.set('Cookie', adminCookie)
			.send({ name: 'A faire' });
		expect(createRes.status).toBe(201);
		columnId = createRes.body.column.id;

		const failCreate = await request(API_URL)
			.post(`/columns/${projectId}`)
			.set('Cookie', memberCookie)
			.send({ name: 'En cours' });
		expect(failCreate.status).toBe(403);

		const editRes = await request(API_URL)
			.patch(`/columns/${projectId}/${columnId}`)
			.set('Cookie', adminCookie)
			.send({ name: 'To Do' });
		expect(editRes.status).toBe(200);
		expect(editRes.body.column.name).toBe('To Do');
	});

	it('Un membre ou admin peut lister les colonnes', async () => {
		const res = await request(API_URL)
			.get(`/columns/${projectId}`)
			.set('Cookie', memberCookie);
		expect(res.status).toBe(200);
		expect(res.body.columns.length).toBe(1);
	});

	// --- TACHES ---

	it('Tous les utilisateurs membre ou admin peuvent créer des tache', async () => {
		const res = await request(API_URL)
			.post(`/tasks/${projectId}/${columnId}`)
			.set('Cookie', memberCookie)
			.send({ title: 'Tâche créée par membre', description: 'Une description' });
		
		expect(res.status).toBe(201);
		taskId = res.body.task.id;
	});

	it('Un membre ou admin peut lister les tâches', async () => {
		const resAdmin = await request(API_URL)
			.get(`/tasks/${projectId}/${columnId}`)
			.set('Cookie', adminCookie);
		expect(resAdmin.status).toBe(200);

		const resMember = await request(API_URL)
			.get(`/tasks/${projectId}/${columnId}`)
			.set('Cookie', memberCookie);
		expect(resMember.status).toBe(200);
		expect(resMember.body.tasks.length).toBe(1);
	});

	it('Un utilisateur membre peut s assigner une tache qui n appartient à personne', async () => {
		const res = await request(API_URL)
			.patch(`/tasks/${projectId}/${columnId}/${taskId}/assign`)
			.set('Cookie', memberCookie);
			
		expect(res.status).toBe(200);
		expect(res.body.task.assignedUserId).toBe(memberId);
	});

	it('Un admin peut assigner une tache à un membre, changer l assignation ou supprimer l assignation', async () => {
		let res = await request(API_URL)
			.patch(`/tasks/${projectId}/${columnId}/${taskId}/assign`)
			.set('Cookie', adminCookie)
			.send({ userId: adminId });
		expect(res.status).toBe(200);
		expect(res.body.task.assignedUserId).toBe(adminId);

		res = await request(API_URL)
			.delete(`/tasks/${projectId}/${columnId}/${taskId}/assign`)
			.set('Cookie', adminCookie);
		expect(res.status).toBe(200);
		expect(res.body.task.assignedUserId).toBeNull();
	});

	it('Un admin ou un utilisateur à qui la tache est attribué peut modifier/supprimer la tache', async () => {
		await request(API_URL)
			.patch(`/tasks/${projectId}/${columnId}/${taskId}/assign`)
			.set('Cookie', adminCookie)
			.send({ userId: memberId });

		let res = await request(API_URL)
			.patch(`/tasks/${projectId}/${columnId}/${taskId}`)
			.set('Cookie', memberCookie)
			.send({ title: 'Tâche modifiée par assigné' });
		expect(res.status).toBe(200);
		expect(res.body.task.title).toBe('Tâche modifiée par assigné');

		res = await request(API_URL)
			.delete(`/tasks/${projectId}/${columnId}/${taskId}`)
			.set('Cookie', adminCookie);
		expect(res.status).toBe(204);
	});

	it('Nettoyage et fin des tests: Admin peut supprimer la colonne', async () => {
		const res = await request(API_URL)
			.delete(`/columns/${projectId}/${columnId}`)
			.set('Cookie', adminCookie);
		
		expect(res.status).toBe(204);
	});
});
