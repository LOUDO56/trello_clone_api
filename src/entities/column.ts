import { Router, type Request, type Response } from 'express';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
	res.json({ resource: 'columns', items: [] });
});

export default router;
