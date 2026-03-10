import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';

import userRouter from './entities/user';
import projectRouter from './entities/project';
import columnRouter from './entities/column';
import taskRouter from './entities/task';
import { Request, Response } from 'express';

const app = express();
const prefix = "/api";

app.use(express.json());
app.use(cookieParser());

app.get(prefix, (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.use(prefix + '/user', userRouter);
app.use(prefix + '/project', projectRouter);
app.use(prefix + '/column', columnRouter);
app.use(prefix + '/task', taskRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});