// SPDX-License-Identifier: APACHE
pragma experimental ABIEncoderV2;
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
@title Cross Chain Atomic Swap contract for erc20 tokens
@author Soumya Ghosh Dastidar
*/

contract TokenSwap is ReentrancyGuard {
    // possible states of a swap
    enum State {Empty, Waiting, Initiated}

    // swap structure with extra metadata to form a doubly LinkedList
    struct Swap {
        bytes32 prevHash; // previous swap hash for LL
        bytes32 nextHash; // next swap hash for LL
        bytes32 hashedSecret; // current swap hash
        address payable initiator; // ethereum addr of initiator
        address payable participant; // ethereum addr of counter-party for this swap
        uint256 refundTimestamp; // unix time(sec) after which the swap expires
        uint256 value; // value of the swap in erc20 tokens
        State state; // current state of swap
        string initiator_tez_addr; // initiator's tezos address
    }

    // first swap in the swap list
    bytes32 public head;
    // count of swaps
    uint256 public count;
    // admin account
    address payable admin;
    // contract active state
    bool public active;
    // ERC20 contract
    IERC20 private token;

    // map of all swaps
    mapping(bytes32 => Swap) public swaps;

    // even triggered when swap is redeemed
    event Redeemed(bytes32 indexed _hashedSecret, bytes32 _secret);

    constructor(address _erc20) public {
        token = IERC20(_erc20);
        head = bytes32(0);
        count = 0;
        active = false;
        admin = msg.sender;
    }

    // ensures only initiator can call a function
    modifier onlyByInitiator(bytes32 _hashedSecret) {
        require(
            msg.sender == swaps[_hashedSecret].initiator,
            "sender is not the initiator"
        );
        _;
    }

    // ensures only admin can call a function
    modifier onlyByAdmin() {
        require(msg.sender == admin, "sender is not the admin");
        _;
    }

    // checks whether a swap can be initiated
    modifier isInitiable(
        bytes32 _hashedSecret,
        address _participant,
        uint256 _refundTimestamp
    ) {
        require(_participant != address(0), "invalid participant address");
        require(
            swaps[_hashedSecret].state == State.Empty,
            "swap for this hash is already initiated"
        );
        require(
            block.timestamp < _refundTimestamp,
            "refundTimestamp has already come"
        );
        _;
    }

    // ensures the currest swap state matches the required `state`
    modifier checkState(bytes32 _hashedSecret, State state) {
        require(swaps[_hashedSecret].state == state, "state mismatch");
        _;
    }

    // checks whether the swap can be redeemed
    modifier isRedeemable(bytes32 _hashedSecret, bytes32 _secret) {
        require(
            block.timestamp < swaps[_hashedSecret].refundTimestamp,
            "refundTimestamp has already come"
        );
        require(
            sha256(abi.encodePacked(sha256(abi.encodePacked(_secret)))) ==
                _hashedSecret,
            "secret is not correct"
        );
        _;
    }

    // checks whether the swap can bve refunded
    modifier isRefundable(bytes32 _hashedSecret) {
        require(
            swaps[_hashedSecret].state == State.Waiting ||
                swaps[_hashedSecret].state == State.Initiated,
            "state mismatch"
        );
        require(
            block.timestamp >= swaps[_hashedSecret].refundTimestamp,
            "refundTimestamp has not come"
        );
        _;
    }

    // checks if the contract is active
    modifier contractIsActive() {
        require(active == true, "contract is deactivated");
        _;
    }

    /**
        @notice Toggle contract active state

        @param _active boolean value [tru:active, false:inactive] representing contract state
     */
    function toggleContractState(bool _active) public onlyByAdmin {
        active = _active;
    }

    /**
        @notice Initiate new swap without counterParty details

        @param _hashedSecret hash of the current swap secret
        @param _initiator_tez_addr tezos address of the current swap initiator
        @param  _amount amount of erc20 tokens exchanged in the swap
        @param _refundTimestamp unix time(sec) after which the swap expires
     */
    function initiateWait(
        bytes32 _hashedSecret,
        string memory _initiator_tez_addr,
        uint256 _amount,
        uint256 _refundTimestamp
    )
        public
        nonReentrant
        contractIsActive
        isInitiable(_hashedSecret, msg.sender, _refundTimestamp)
    {
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );
        swaps[_hashedSecret].value = _amount;
        swaps[_hashedSecret].hashedSecret = _hashedSecret;
        swaps[_hashedSecret].participant = msg.sender;
        swaps[_hashedSecret].initiator = msg.sender;
        swaps[_hashedSecret].initiator_tez_addr = _initiator_tez_addr;
        swaps[_hashedSecret].refundTimestamp = _refundTimestamp;
        swaps[_hashedSecret].state = State.Waiting;
        swaps[_hashedSecret].prevHash = bytes32(0);
        swaps[_hashedSecret].nextHash = bytes32(0);

        if (head == bytes32(0)) {
            head = _hashedSecret;
        } else {
            swaps[_hashedSecret].nextHash = head;
            swaps[head].prevHash = _hashedSecret;
            head = _hashedSecret;
        }
        count += 1;
    }

    /**
        @notice Add counter-party details to an existing(initiated) swap

        @param _hashedSecret hashed secret of the swap being updated
        @param _participant participant/counter-party ethereum address
     */
    function addCounterParty(
        bytes32 _hashedSecret,
        address payable _participant
    )
        public
        contractIsActive
        checkState(_hashedSecret, State.Waiting)
        onlyByInitiator(_hashedSecret)
    {
        swaps[_hashedSecret].participant = _participant;
        swaps[_hashedSecret].state = State.Initiated;
    }

    /**
        @notice Redeem the swap if possible

        @param _hashedSecret hashed secret of the swap being redeemed
        @param _secret secret for the swap which produced the corresponding hashedSecret
     */
    function redeem(bytes32 _hashedSecret, bytes32 _secret)
        public
        nonReentrant
        checkState(_hashedSecret, State.Initiated)
        isRedeemable(_hashedSecret, _secret)
    {
        require(
            token.transfer(
                swaps[_hashedSecret].participant,
                swaps[_hashedSecret].value
            ),
            "redeem failed"
        );

        if (
            swaps[_hashedSecret].prevHash == bytes32(0) &&
            swaps[_hashedSecret].nextHash == bytes32(0)
        ) {
            head = bytes32(0);
        } else if (swaps[_hashedSecret].prevHash == bytes32(0)) {
            head = swaps[_hashedSecret].nextHash;
            swaps[head].prevHash = bytes32(0);
        } else if (swaps[_hashedSecret].nextHash == bytes32(0)) {
            swaps[swaps[_hashedSecret].prevHash].nextHash = bytes32(0);
        } else {
            swaps[swaps[_hashedSecret].prevHash].nextHash = swaps[_hashedSecret]
                .nextHash;
            swaps[swaps[_hashedSecret].nextHash].prevHash = swaps[_hashedSecret]
                .prevHash;
        }

        delete swaps[_hashedSecret];
        count -= 1;
        emit Redeemed(_hashedSecret, _secret);
    }

    /**
        @notice Refund the swap if possible

        @param _hashedSecret hashed secret of the swap being refunded
     */
    function refund(bytes32 _hashedSecret)
        public
        nonReentrant
        isRefundable(_hashedSecret)
    {
        require(
            token.transfer(
                swaps[_hashedSecret].initiator,
                swaps[_hashedSecret].value
            ),
            "redeem failed"
        );

        if (
            swaps[_hashedSecret].prevHash == bytes32(0) &&
            swaps[_hashedSecret].nextHash == bytes32(0)
        ) {
            head = bytes32(0);
        } else if (swaps[_hashedSecret].prevHash == bytes32(0)) {
            head = swaps[_hashedSecret].nextHash;
            swaps[head].prevHash = bytes32(0);
        } else if (swaps[_hashedSecret].nextHash == bytes32(0)) {
            swaps[swaps[_hashedSecret].prevHash].nextHash = bytes32(0);
        } else {
            swaps[swaps[_hashedSecret].prevHash].nextHash = swaps[_hashedSecret]
                .nextHash;
            swaps[swaps[_hashedSecret].nextHash].prevHash = swaps[_hashedSecret]
                .prevHash;
        }

        delete swaps[_hashedSecret];
        count -= 1;
    }

    /**
        @notice Return a list of all current Swaps

        @return Swap array/list of all swaps present in the contract storage
     */
    function getAllSwaps() public view returns (Swap[] memory) {
        Swap[] memory sps = new Swap[](count);
        if (head == bytes32(0)) return sps;
        Swap memory sp = swaps[head];
        uint256 i = 0;
        while (sp.nextHash != bytes32(0)) {
            sps[i] = sp;
            i += 1;
            sp = swaps[sp.nextHash];
        }
        sps[i] = sp;
        return sps;
    }
}
