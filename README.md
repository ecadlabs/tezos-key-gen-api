
The Taquito integration-tests rely on a service called [tezos-key-gen-api][tezos-key-gen-api] which allows the integration tests to either fetch secrets for pre-funded accounts or to send operations to the key-gen service for signing with a pre-funded account. This service allows the Taquito integration tests to run in parrallel, and thus allowing the entire test-suite to complete faster.

The key-gen service will sign or provide secrets for prefunded Tezos accounts. This service is useful for testing and development workflows where the user needs to sign operations.

The service requires a main "funder account". Key-gen generates a new pool of accounts in the target chain, and funds each one from the main funder account. Key-gen will maintain the size of the address pools.

This service is used to speed up Taquito's integration tests. The Taquito test suite will fetch a new secret, or request an operation to be signed, for each of its tests. This allows Taquito to run many integration tests in parallel, instead of sequentially, as would be required if run with a single implicit account.


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
