import { Request, Response } from 'express';
import { pools } from "../pools";
import { isAuthorized } from './is-authorized';


export const count = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).send()
    return;
  }

  const queue = pools.getPool(req.user, req.params.network);

  if (!queue) {
    res.status(404).send()
    return;
  }

  res.send({
    balance: await queue.getFundingBalance(),
    count: await queue.size()
  });
}

export const popKeys = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).send()
    return;
  }

  const queue = pools.getPool(req.user, req.params.network);

  if (!queue) {
    res.status(404).send()
    return;
  }

  const result = await queue.pop();

  if (!result) {
    res.status(503).send();
  } else {
    res.send(result);
  }
}
