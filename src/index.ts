import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import userRouter from './entities/user';
import projectRouter from './entities/project';
import columnRouter from './entities/column';
import taskRouter from './entities/task';
import { swaggerSpec } from './lib/swagger';
import { Request, Response } from 'express';

const app = express();
const prefix = "/api";

app.use(express.json());
app.use(cookieParser());

app.get(prefix, (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.use(prefix + '/users', userRouter);
app.use(prefix + '/projects', projectRouter);
app.use(prefix + '/columns', columnRouter);
app.use(prefix + '/tasks', taskRouter);
app.use(prefix + '/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});