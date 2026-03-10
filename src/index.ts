import express from 'express';
import userRouter from './entities/user';
import projectRouter from './entities/project';
import columnRouter from './entities/column';
import taskRouter from './entities/task';
import { Request, Response } from 'express';

const app = express();
const prefix = "/api";

app.use(express.json());

app.get(prefix, (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.use(prefix + '/users', userRouter);
app.use(prefix + '/projects', projectRouter);
app.use(prefix + '/columns', columnRouter);
app.use(prefix + '/tasks', taskRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});