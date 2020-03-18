let faucetKey = {
  "mnemonic": [
    "still",
    "taste",
    "large",
    "report",
    "animal",
    "clay",
    "despair",
    "actual",
    "away",
    "sauce",
    "heart",
    "soccer",
    "quality",
    "battle",
    "timber"
  ],
  "secret": "93e1c7ddca2f97e2ec4e8dabdd860328c08937f5",
  "amount": "27443578402",
  "pkh": "tz1Qnx9tUnxtQ4v3BpoqgjijVkJ14cGZSaeE",
  "password": "Q8MSkuWgqJ",
  "email": "kntjngde.xxrexlbx@tezos.example.org"
}

export class Config {
  faucetKey() {
    return faucetKey;
  }

  targetBuffer = Number(process.env['TARGET_BUFFER'] || 100);
  batchSize = Number(process.env['BATCH_SIZE'] || 20);
  tzAmount = Number(process.env['FUNDING_AMOUNT'] || 10);
  rpcUrl = process.env['RPC_URL'] || 'https://api.tez.ie/rpc/babylonnet'
  lastJobKey = process.env['LAST_JOB_KEY'] || 'last_job_level'
  listName = process.env['SECRET_KEY_LIST_NAME'] || 'secret_keys_list'
  redisPassword = process.env['REDIS_PASSWORD'] || 'password123'
  redisHost = process.env['REDIS_HOST'] || 'localhost'
  redisPort = process.env['REDIS_PASSWORD'] || '6379'
  apiKeys = ['ligo-ide', 'taquito-example']
}


export const config = new Config();
