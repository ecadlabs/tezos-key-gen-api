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
    "granadanet": {
      "regular": "taquito-example-granadanet",
      "ephemeral": "ephemeral-keys-granadanet"
    },
    "edonet": {
      "regular": "taquito-example-edonet",
      "ephemeral": "ephemeral-keys-edonet"
    },
    "florencenet": {
      "regular": "taquito-example-florencenet",
      "ephemeral": "ephemeral-keys-florencenet"
    },
    "flextesanet": {
      "regular": "taquito-example-flextesanet",
      "ephemeral": "ephemeral-keys-flextesanet"
    }
  }
}
```
**ephemeral-config.json:**
```json
{
  "ephemeral-keys-granadanet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-granadanet"
  },
  "ephemeral-keys-edonet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-edonet"
  },
  "ephemeral-keys-florencenet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-florencenet"
  },
  "ephemeral-keys-flextesanet": {
    "maxAmount": 30,
    "expire": 300,
    "pool-id": "ephemeral-keys-flextesanet"
  }
}
```
**pools-config.json:**
```json
{
  "taquito-example-granadanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "https://api.tez.ie/rpc/granadanet",
    "redisListName": "taquito-example:granadanet:address-pool"
  },
  "ephemeral-keys-granadanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "https://api.tez.ie/rpc/granadanet",
    "redisListName": "ephemeral-keys:granadanet:address-pool"
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
  "taquito-example-florencenet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "https://api.tez.ie/rpc/florencenet",
    "redisListName": "taquito-example:florencenet:address-pool"
  },
  "ephemeral-keys-florencenet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "https://api.tez.ie/rpc/florencenet",
    "redisListName": "ephemeral-keys:florencenet:address-pool"
  },
  "taquito-example-flextesanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "batchSize": 2,
    "rpcUrl": "http://macmini:8732/",
    "redisListName": "taquito-example:flextesanet:address-pool"
  },
  "ephemeral-keys-flextesanet": {
    "funderPKH": "tz1Rb18fBaZxkzDgFGAbcBZzxLCYdxyLryVX",
    "remoteSignerUrl": "http://0.0.0.0:6732",
    "targetBuffer": 6,
    "batchSize": 3,
    "tzAmount": 2,
    "autoRefillDurationMS": 30000,
    "rpcUrl": "http://macmini:8732/",
    "redisListName": "ephemeral-keys:flextesanet:address-pool"
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
To call the local key-gen: http://localhost:3000/granadanet/ephemeral/
