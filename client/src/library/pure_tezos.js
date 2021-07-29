import {
    ConseilDataClient,
    ConseilOperator,
    ConseilSortDirection,
    TezosConseilClient,
    TezosLanguageUtil,
    TezosMessageUtils,
    TezosNodeReader,
} from "conseiljs";

import { JSONPath } from "jsonpath-plus";
import { TezosOperationType } from "@airgap/beacon-sdk";

export default class PureTezos {
    constructor(tezos, account, priceContract, rpc, conseilServer, mutex) {
        this.account = account; // tezos wallet address
        this.tezos = tezos; //tezos beacon-sdk instance
        this.rpc = rpc; // rpc server address for network interaction
        this.conseilServer = conseilServer; // conseil server setting
        this.priceContract = priceContract; // tezos harbinger oracle contract details {address:string, mapID:nat}
        this.mutex = mutex; // mutex
    }

    /**
     * Get the tezos balance for an account
     *
     * @param address tezos address for the account
     */
    async balance(address) {
        return await TezosNodeReader.getSpendableBalanceForAccount(
            this.rpc,
            address
        );
    }

    /**
     * Get the tezos fa1.2 token balance for an account
     *
     * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
     * @param address tezos address for the account
     */
    async tokenBalance(tokenContract, address) {
        const key = TezosMessageUtils.encodeBigMapKey(
            Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
        );
        let tokenData = undefined;
        try {
            tokenData = await TezosNodeReader.getValueForBigMapKey(
                this.rpc,
                tokenContract.mapID,
                key
            );
        } catch (err) {
            if (!Object.prototype.hasOwnProperty.call(err, "httpStatus") && err.httpStatus === 404)
                throw err;
        }

        let balance =
            tokenData === undefined
                ? "0"
                : JSONPath({ path: "$.args[0].int", json: tokenData })[0];
        return balance;
    }

    /**
     * Get the tezos fa1.2 token allowance for swap contract by an account
     *
     * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param address tezos address for the account
     */
    async tokenAllowance(tokenContract, swapContract, address) {
        const key = TezosMessageUtils.encodeBigMapKey(
            Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
        );
        const tokenData = await TezosNodeReader.getValueForBigMapKey(
            this.rpc,
            tokenContract.mapID,
            key
        );
        let allowances =
            tokenData === undefined
                ? undefined
                : JSONPath({ path: "$.args[1]", json: tokenData })[0];
        const allowance =
            allowances === undefined
                ? []
                : allowances.filter(
                    (allow) => allow.args[0].string === swapContract.address
                );
        return allowance.length === 0 ? "0" : allowance[0].args[1].int;
    }

    /**
     * Approve tokens for the swap contract
     *
     * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param amount the quantity of fa1.2 tokens to be approved
     */
    async approveToken(tokenContract, swapContract, amount) {
        const allow = await this.tokenAllowance(
            tokenContract,
            swapContract,
            this.account
        );
        let ops = [];
        if (parseInt(allow) > 0) {
            ops.push({
                amtInMuTez: 0,
                entrypoint: "approve",
                parameters: `(Pair "${swapContract.address}" 0)`,
                to: tokenContract.address,
            });
        }
        ops.push({
            amtInMuTez: 0,
            entrypoint: "approve",
            parameters: `(Pair "${swapContract.address}" ${amount})`,
            to: tokenContract.address,
        });
        const res = await this.interact(ops);
        if (res.status !== "applied") {
            throw new Error("TEZOS TX FAILED");
        }
        return res;
    }

    /**
    * Initiate a swap offer on the tezos chain
    *
    * @param swapContract tezos swap contract details {address:string, mapID:nat}
    * @param hashedSecret hash of the swap
    * @param pair  swap pair used
    * @param asset asset in the pair being traded
    * @param refundTimestamp time after which the swap exires
    * @param amount value of the swap in fa1.2 tokens or mutez
    * @param expectedValue value expected in return in coiunter asset units
    * @param mutez amount in mutez being sent (default=0)
    */

    async offer(
        swapContract,
        hashedSecret,
        pair,
        asset,
        refundTimestamp,
        amount,
        expectedValue,
        mutez = 0
    ) {
        const res = await this.interact([
            {
                to: swapContract.address,
                amtInMuTez: mutez,
                entrypoint: "offer",
                parameters: `(Pair (Pair "${asset}" (Pair ${expectedValue} "${pair}")) (Pair "${refundTimestamp}" (Pair ${hashedSecret} ${amount})))`,
            },
        ]);
        if (res.status !== "applied") {
            throw new Error("TEZOS TX FAILED");
        }
        return res;
    }

    /**
     * Accept an existing swap offer on the tezos chain
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param hashedSecret hash of the swap
     * @param pair  swap pair used
     * @param asset asset in the pair being traded
     * @param amount value of the swap in fa1.2 tokens or mutez
     * @param mutez amount in mutez being sent (default=0)
     */

    async take(swapContract, hashedSecret, pair, asset, amount, mutez = 0) {
        const res = await this.interact([
            {
                to: swapContract.address,
                amtInMuTez: mutez,
                entrypoint: "take",
                parameters: `(Pair (Pair "${asset}" "${pair}") (Pair ${hashedSecret} ${amount}))`,
            },
        ]);
        if (res.status !== "applied") {
            throw new Error("TEZOS TX FAILED");
        }
        return res;
    }

    /**
     * Refund the swap if possible
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param hashedSecret hash of the swap being refunded
     */
    async refund(swapContract, hashedSecret) {
        const res = await this.interact([
            {
                to: swapContract.address,
                amtInMuTez: 0,
                entrypoint: "refund",
                parameters: `${hashedSecret}`,
            },
        ]);
        if (res.status !== "applied") {
            throw new Error("TEZOS TX FAILED");
        }
        return res;
    }

    /**
     * Get reward basis points for responding to swaps
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     */
    async getReward(swapContract) {
        const storage = await TezosNodeReader.getContractStorage(
            this.rpc,
            swapContract.address
        );
        return {
            commission: parseInt(
                JSONPath({
                    path: "$.args[3].int",
                    json: storage,
                })[0]
            ),
            reward: parseInt(
                JSONPath({
                    path: "$.args[1].args[1].int",
                    json: storage,
                })[0]
            ),
        };
    }

    /**
     * Get the current asset pair price from the harbinger oracle
     *
     * @param asset asset pair eg. ETH-USD as supported by harbinger
     */
    async getPrice(asset) {
        const packedKey = TezosMessageUtils.encodeBigMapKey(
            Buffer.from(TezosMessageUtils.writePackedData(asset, "string"), "hex")
        );
        let jsonData = undefined;
        try {
            jsonData = await TezosNodeReader.getValueForBigMapKey(
                this.rpc,
                this.priceContract.mapID,
                packedKey
            );
        } catch (err) {
            if (!Object.prototype.hasOwnProperty.call(err, "httpStatus") && err.httpStatus === 404)
                throw err;
        }

        return parseInt(
            JSONPath({
                path: "$.args[0].args[0].int",
                json: jsonData,
            })[0]
        );
    }

    parseSwapValue(michelsonData) {
        const michelineData =
            TezosLanguageUtil.translateMichelsonToMicheline(michelsonData);
        const jsonData = JSON.parse(michelineData);
        return {
            hashedSecret:
                "0x" +
                JSONPath({
                    path: "$.bytes",
                    json: jsonData[2],
                })[0],
            initiator: TezosMessageUtils.readAddress(JSONPath({
                path: "$.args[1].args[1].bytes",
                json: jsonData[0],
            })[0]),
            pair: JSONPath({
                path: "$.args[0].string",
                json: jsonData[1],
            })[0],
            asset: JSONPath({
                path: "$.args[0].args[0].string",
                json: jsonData[0],
            })[0],
            commission: JSONPath({
                path: "$.args[0].args[1].int",
                json: jsonData[0],
            })[0],
            refundTimestamp: Number(
                JSONPath({
                    path: "$.args[1].int",
                    json: jsonData[1],
                })[0]
            ),
            value: JSONPath({ path: "$.int", json: jsonData[3] })[0],
            expectedValue: JSONPath({
                path: "$.args[1].args[0].int",
                json: jsonData[0],
            })[0],
        };
    }

    /**
     * Get details of a particular swap
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param hashedSecret hash of the swap requested
     * @param key_hash key hash for the bigmap to query
     *
     * @return the swap details if available
     */
    async getSwap(swapContract, hashedSecret, key_hash = undefined) {
        let packedKey = "";
        if (key_hash === undefined) {
            hashedSecret = hashedSecret.substring(2);
            packedKey = TezosMessageUtils.encodeBigMapKey(
                Buffer.from(TezosMessageUtils.writePackedData(hashedSecret, "bytes"), "hex")
            );
        } else {
            packedKey = key_hash;
        }

        let jsonData = undefined;
        try {
            jsonData = await TezosNodeReader.getValueForBigMapKey(
                this.rpc,
                swapContract.mapID,
                packedKey
            );
        } catch (err) {
            if (!Object.prototype.hasOwnProperty.call(err, "httpStatus") && err.httpStatus === 404)
                throw err;
        }

        if (jsonData === undefined) return jsonData;
        return {
            hashedSecret:
                "0x" +
                JSONPath({
                    path: "$.args[2].bytes",
                    json: jsonData,
                })[0],
            initiator: JSONPath({
                path: "$.args[0].args[2].string",
                json: jsonData,
            })[0],
            pair: JSONPath({
                path: "$.args[1].args[0].string",
                json: jsonData,
            })[0],
            asset: JSONPath({
                path: "$.args[0].args[0].args[0].string",
                json: jsonData,
            })[0],
            commission: JSONPath({
                path: "$.args[0].args[0].args[1].int",
                json: jsonData,
            })[0],
            refundTimestamp: Number(
                Math.floor(
                    new Date(
                        JSONPath({
                            path: "$.args[1].args[1].string",
                            json: jsonData,
                        })[0]
                    ).getTime() / 1000
                )
            ),
            value: JSONPath({ path: "$.args[3].int", json: jsonData })[0],
            expectedValue: JSONPath({
                path: "$.args[0].args[1].int",
                json: jsonData,
            })[0],
        };
    }

    /**
     * Get the list of all active swaps
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @return a list of all active swaps with their details
     */
    async getAllSwaps(swapContract) {
        const data = await ConseilDataClient.executeEntityQuery(
            this.conseilServer,
            "tezos",
            this.conseilServer.network,
            "big_map_contents",
            {
                fields: [
                    "key",
                    "value",
                ],
                predicates: [
                    {
                        field: "big_map_id",
                        operation: ConseilOperator.EQ,
                        set: [swapContract.mapID.toString()],
                        inverse: false,
                    },
                    {
                        field: "value",
                        operation: ConseilOperator.ISNULL,
                        set: [""],
                        inverse: true,
                    },
                ],
                orderBy: [{ field: "key", direction: ConseilSortDirection.DESC }],
                aggregation: [],
                limit: 1000,
            }
        );
        let swaps = [];
        data.forEach((e) => {
            if (e.value !== null) swaps.push(this.parseSwapValue(e.value));
        });
        return swaps;
    }

    /**
     * Get the list of all active swaps initiated by a specific user
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param account tezos address of the user whose swaps are to be retrieved
     *
     * @return a list of all active swaps initiated by a specific user
     */
    async getUserSwaps(swapContract, account) {
        const swaps = await this.getAllSwaps(swapContract);
        return swaps.filter((swp) => swp.initiator === account);
    }

    /**
     * Get all swaps waiting for a response matching the min expire time requested
     *
     * @param swapContract tezos swap contract details {address:string, mapID:nat}
     * @param minTimeToExpire minimum time left for swap to expire in seconds
     *
     * @return a list of waiting swaps with details
     */
    async getWaitingSwaps(swapContract, minTimeToExpire) {
        const swaps = await this.getAllSwaps(swapContract);
        return swaps.filter(
            (swp) =>
                swp.initiator !== this.account &&
                Math.trunc(Date.now() / 1000) < swp.refundTimestamp - minTimeToExpire
        );
    }

    /**
     * Send a tx to the blockchain
     *
     * @param operations List of operations needed to be sent to the chain
     * @param extraGas extra gas to add for the tx (user choice)
     * @param extraStorage extra storage to add for the tx (user choice)
     *
     * @return operation result
     */
    async interact(operations, extraGas = 500, extraStorage = 50) {
        await this.mutex.acquire();
        try {
            let ops = [];
            operations.forEach((op) => {
                ops.push({
                    kind: TezosOperationType.TRANSACTION,
                    amount: op.amtInMuTez,
                    destination: op.to,
                    source: this.account,
                    parameters: {
                        entrypoint: op.entrypoint,
                        value: JSON.parse(
                            TezosLanguageUtil.translateParameterMichelsonToMicheline(
                                op.parameters
                            )
                        ),
                    },
                });
            });
            const result = await this.tezos.requestOperation({
                operationDetails: ops,
            });
            console.log(result);
            const groupid = result["transactionHash"]
                .replace(/"/g, "")
                .replace(/\n/, ""); // clean up RPC output
            const confirm = await TezosConseilClient.awaitOperationConfirmation(
                this.conseilServer,
                this.conseilServer.network,
                groupid,
                2
            );
            return confirm;
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            this.mutex.release();
        }
    }
}
