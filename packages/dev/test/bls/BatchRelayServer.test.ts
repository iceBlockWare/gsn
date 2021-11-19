import { ServerTestEnvironment } from '../ServerTestEnvironment'
import { revert, snapshot } from '../TestUtils'
import { GSNConfig } from '@opengsn/provider'
import { HttpProvider } from 'web3-core'
import { RelayTransactionRequest } from '@opengsn/common/dist/types/RelayTransactionRequest'

contract.only('BatchRelayServer integration test', function (accounts: Truffle.Accounts) {
  let globalId: string
  let env: ServerTestEnvironment

  before(async function () {
    globalId = (await snapshot()).result
    const relayClientConfig: Partial<GSNConfig> = {}

    env = new ServerTestEnvironment(web3.currentProvider as HttpProvider, accounts)
    await env.init(relayClientConfig, undefined, undefined, true)
    await env.initBatching()
    await env.newServerInstance({
      runBatching: true,
      batchTargetGasLimit: '1000000',
      batchDurationMS: 120000,
      batchValidUntilBlocks: 1000
    })
    await env.clearServerStorage()
  })

  after(async function () {
    await revert(globalId)
    await env.clearServerStorage()
  })

  context('#createBatchedRelayTransaction()', function () {
    // TODO: use BatchRelayClient and some kind of Batch Test Environment to create this object
    let req: RelayTransactionRequest

    before(async function () {
      req = {
        relayRequest: {
          request: {
            to: env.testToken.address,
            data: '0xa9059cbb000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000000',
            from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            value: '0x0',
            nonce: '0',
            gas: '1000000',
            validUntil: '1000000000'
          },
          relayData: {
            gasPrice: '10000',
            relayWorker: env.relayServer.workerAddress,
            clientId: '1',
            pctRelayFee: '0x0',
            baseRelayFee: '0x0',
            paymaster: env.paymaster.address,
            forwarder: env.forwarder.address,
            transactionCalldataGasUsed: '5000',
            paymasterData: '0x'
          }
        },
        metadata: {
          maxAcceptanceBudget: '0xffffff',
          relayHubAddress: env.relayHub.address,
          signature: '["18c1fc456621fce987e6be181d2482a85b249a644dc4580741b21d5855dbd887","263a96fd96dea2c222f7de8ddd000f40839487b3929e5422affe553d65241430","1"]',
          approvalData: '0x',
          relayMaxNonce: 9007199254740991,
          authorizationElement: {
            authorizer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            blsPublicKey: [
              '0xbd2bcfd99edc43e08cef5acc5a95f2c921432320518ea76fb43e1e6b19ce17c',
              '0x3307076b9a9a0d87e109a074ea2f72a9a1eebbb257885eef549c8a6f4ef9c0a',
              '0x1e1beaf98704bdc762f1e1fba1945b81b64cc5d44341b328b65a733a5d7bb510',
              '0x1435bab42f8ccbac23a9c6c89097cee2d2525f24123f577ac71153e44cb93b9e'
            ],
            signature: '0x46fc4752cfdce593fa4b2a6f03bc85b08ff6c1f37daffa91320f4602da9bc8e73e9fcc0cb6b18b06a260abbd0c2002e91448b550ab8c55b8c4415f7530fdc5ba1c'
          }
        }
      }
    })

    it('should accept valid BatchRelayRequests and pass it to the BatchManager', async function () {
      assert.equal(env.relayServer.batchManager?.currentBatch.transactions.length, 0)
      const relayRequestID = await env.relayServer.createBatchedRelayTransaction(req)
      assert.equal(env.relayServer.batchManager?.currentBatch.transactions.length, 1)
      assert.equal(relayRequestID.length, 66)

      // forcing the single-transaction batch to be mined immediately
      const batchTxHash = await env.relayServer.batchManager?.broadcastCurrentBatch()
      const batchReceipt = await web3.eth.getTransactionReceipt(batchTxHash!)
      assert.equal(batchReceipt.logs.length, 1)
    })

    it('should trigger the broadcast of the batch from the worker handler', async function () {

    })
  })
})