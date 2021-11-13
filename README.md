## key-gen 

The key-gen service will sign or provide secrets for pre-funded Tezos accounts. This service is helpful for testing and development workflows where the user needs to sign operations.

The service requires a main "funder account." Key-gen generates a new pool of accounts in the target chain and funds each from the main funder account. Key-gen will maintain the size of the address pools.

key-gen is used in Taquito's CI/CD integration tests and allows them to run in parallel, making CI/CD jobs finish sooner. The Taquito test suite will fetch a new secret from key-gen or request key-gen to sign an operation. 

## Configuration files

### Managing Authenticaion `accounts-config.json`

The key-gen API offers basic authentication which is configured in the `accounts-config.json` file. 

```json
{
  "flextesanet-t0k3n": { 			// The auth token exptected in the `Authorization:` HTTP header
    "flextesanet": { 				// The network name, corresponds to entries in `pools.config.json`
      "regular": "flextesanet", 		// Referts to a config entry in `pools-config.json`
      "ephemeral": "ephemeral-keys-flextesanet" // Refers to a config entry in `ephemeral-config.json`
    }
  }
}
```
