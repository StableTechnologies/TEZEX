// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SimpleToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */
contract SimpleToken is Context, ERC20 {
    /**
     * @dev Constructor that gives _msgSender() all of existing tokens.
     */
    constructor() public ERC20("SimpleToken", "SIM") {
        _setupDecimals(0);
        _mint(_msgSender(), 10000 * (10**uint256(decimals())));
    }
}
