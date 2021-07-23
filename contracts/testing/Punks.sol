// SPDX-License-Identifier: GPL 3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract Punks is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId("Punks", "PUNK", "ipfs://dummy") {}
}