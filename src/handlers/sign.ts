import { HttpResponseError } from '@taquito/http-utils'
import { decoders } from '@taquito/local-forging'
import { Uint8ArrayConsumer } from '@taquito/local-forging'
import { OperationContentsAndResultReveal } from '@taquito/rpc'
import { InMemorySigner } from '@taquito/signer'
import { hex2buf } from '@taquito/utils'
import { Request, Response } from 'express'
import { OperationContentsAndResultOrigination, OperationContentsAndResultTransaction, OperationObject } from '@taquito/rpc'
import { pools } from '../pools'
import { TezosToolkit } from '@taquito/taquito'
import { isAuthorized } from './is-authorized'
import { logger } from '../logger'

export const pk = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).send()
    return;
  }

  const ephemeralPool = pools.getEphemeralPool(req.user, req.params.network)

  if (!ephemeralPool) {
    res.status(404).send();
    return
  }

  // Check if key exists (or is not expired)

  const id = req.params.id;

  const { secret } = await ephemeralPool.get(id);

  const signer = new InMemorySigner(secret);

  res.status(200).send({ public_key: await signer.publicKey() })
}

export const sign = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).send()
    return;
  }

  const ephemeralPool = pools.getEphemeralPool(req.user, req.params.network)

  if (!ephemeralPool) {
    res.status(404).send();
    return
  }

  const Tezos = new TezosToolkit();
  Tezos.setRpcProvider(ephemeralPool.getRPC());

  // Check if key exists (or is not expired)

  const id = req.params.id;

  const { secret, amount } = await ephemeralPool.get(id);

  const signer = new InMemorySigner(secret);

  const key = await signer.publicKeyHash();
  // const secretKey = 'edsk';
  const allowed = Number(amount);
  const balance = await Tezos.tz.getBalance(key)
  const bytes = JSON.parse(req.body);
  // Unforge request

  // If decoded successfully it is an OperationObject compliant json object
  let managerOp: OperationObject;
  try {
    const consumer = new Uint8ArrayConsumer(hex2buf(bytes))
    consumer.consume(1)
    managerOp = decoders['manager'](consumer as any) as OperationObject
  } catch (ex) {
    res.status(400).send();
    return
  }

  const chainID = await Tezos.rpc.getChainId();
  try {
    const simulation = await Tezos.rpc.runOperation({
      chain_id: chainID,
      operation: {
        ...managerOp,
        signature: 'edsigtkpiSSschcaCt9pUVrpNPf7TTcgvgDEDD6NCEHMy8NNQJCGnMfLZzYoQj74yLjo9wx6MPVV29CvVzgi7qEcEUok3k7AuMg'
      } as any
    })

    const allowedOperation: (OperationContentsAndResultOrigination | OperationContentsAndResultReveal | OperationContentsAndResultTransaction)[] = [];
    for (const content of simulation.contents) {
      if (content.kind === 'transaction' || content.kind === 'origination' || content.kind === 'reveal') {
        allowedOperation.push(content as any);
      } else {
        res.status(403).send('Kind not allowed with ephemeral keys');
        return;
      }
    }

    // Calculate balance update
    const balanceChange = allowedOperation.reduce((prev, op) => {
      const opResultBU = (op.metadata.operation_result as any)['balance_updates']

      return prev + op.metadata.balance_updates.reduce((prevSum, update) => {
        return update.contract === key ? prevSum + Number.parseInt(update.change, 10) : prevSum
      }, 0) + (Array.isArray(opResultBU) ? opResultBU.reduce((prevSum, update) => {
        return update.contract === key ? prevSum + Number.parseInt(update.change, 10) : prevSum
      }, 0) : 0)
    }, 0)


    // Check if balance allowed is higher than balance updates
    if (balance.plus(balanceChange).lt(allowed)) {
      res.status(400).send('Not enough balance');
      return
    }

    // If true sign and decrement balance allowed
    await ephemeralPool.decr(id, balanceChange)

    const { prefixSig } = await signer.sign(bytes)
    res.status(200).send({ signature: prefixSig });
  } catch (ex) {
    logger.error(ex.message);
    if (ex instanceof HttpResponseError) {
      res.status(ex.status).send(ex.body);
      return
    }
    res.status(500).send();
  }
}

export const provisionEphemeralKey = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).send()
    return;
  }

  const ephemeralPool = pools.getEphemeralPool(req.user, req.params.network)

  if (!ephemeralPool) {
    res.status(404).send();
    return
  }

  const result = await ephemeralPool.create();

  if (!result) {
    res.status(503).send();
    return
  }

  res.status(200).send(result);
}
