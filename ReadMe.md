## How to set up the key-gen locally
### Prerequisite
docker-compose
### Create (or make sure you have) the following files in your TEZOS-KEY-GEN-API folder
**docker-compose.yml:**
```yaml
version: '3'
services:
  redis:
    image: bitnami/redis
    ports:
      - 6379:6379
    environment:
      - REDIS_PASSWORD=password123
    volumes:
      - /bitnami/redis/data
  signatory:
    image: ecadlabs/signatory:latest
    ports:
      - 6732:6732
    volumes:
      - ./signatory.yaml:/etc/signatory.yaml
      - ./key_gen_funder.key:/etc/key_gen_funder.key
```
**signatory.yaml:**
```yaml
server:
  # Default port 6732
  address: :6732
  # Default port 9583
  utility_address: :9583
vaults:
  local_file_keys:
    driver: file
    config:
      # tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX
      file: /etc/key_gen_funder.key
# List enabled public keys hashes here
tezos:
  tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX:
    allowed_operations:
      # List of [generic, block, endorsement]
      - generic
      - block
      - endorsement
    allowed_kinds:
      # List of [endorsement, ballot, reveal, transaction, origination, delegation, seed_nonce_revelation, activate_account]
      - transaction
      - endorsement
      - reveal
```
**accounts-config.json:**
```json
{
  "taquito-example": {
    "delphinet": {
      "regular": "taquito-example-delphinet",
      "ephemeral": "ephemeral-keys-delphinet"
    },
    "edonet": {
      "regular": "taquito-example-edonet",
      "ephemeral": "ephemeral-keys-edonet"
    },
    "falphanet": {
      "regular": "taquito-example-falphanet",
      "ephemeral": "ephemeral-keys-falphanet"
    }
  }
}
```
**ephemeral-config.json:**
```json
{
  "ephemeral-keys-delphinet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-delphinet"
  },
  "ephemeral-keys-edonet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-edonet"
  },
  "ephemeral-keys-falphanet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-falphanet"
  }
}
```
**pools-config.json:**
```json
{
  "taquito-example-delphinet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "https://api.tez.ie/rpc/delphinet",
    "redisListName": "taquito-example:delphinet:address-pool"
  },
  "ephemeral-keys-delphinet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "https://api.tez.ie/rpc/delphinet",
    "redisListName": "ephemeral-keys:delphinet:address-pool"
  },
  "taquito-example-edonet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "https://api.tez.ie/rpc/edonet",
    "redisListName": "taquito-example:edonet:address-pool"
  },
  "ephemeral-keys-edonet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "https://api.tez.ie/rpc/edonet",
    "redisListName": "ephemeral-keys:edonet:address-pool"
  },
  "taquito-example-falphanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "https://api.tez.ie/rpc/falphanet",
    "redisListName": "taquito-example:falphanet:address-pool"
  },
  "ephemeral-keys-falphanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "https://api.tez.ie/rpc/falphanet",
    "redisListName": "ephemeral-keys:falphanet:address-pool"
  }
}
```
**key_gen_funder.key:**
```
[{ "name": "key_gen_funder", "value": "unencrypted:edskRonBXEZFZPjsMiqsa9YaECifKjHJCGiUeLmyT5Fc6aF4ppgDRcUsdfkp8X8pvD1RcZ8jShDqSjXGj5rNxdatHEeQznFw5C" }]
```
## Commands
To start redis and signatory containers, run `docker-compose up`
In the script section of package.json, replace the path: `"start": "ts-node index.ts"` by `"start": "ts-node src/index.ts"`
To start the key-gen on your local environment run `npm install`, `npm run build` and `npm run start`
To call the local key-gen: http://localhost:3000/delphinet/ephemeral/
