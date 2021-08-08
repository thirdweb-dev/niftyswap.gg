// SPDX-License-Identifier: GPL 3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

import "./NiftySwap.sol";
import "./CrossNiftySwap.sol";

contract NiftySwapFactory {

  /// @dev NiftySwap for swapping NFTs across NFT collections.
  address public crossNiftySwap;

  /// @dev Mapping from NFT collection => NiftySwap for that collection
  mapping(address => address) public swapRegistry;

  /// @dev Events
  event NiftySwapCreated(address nft, address niftyswap);

  modifier onlyValidNFT(address _nftContract) {
    require(
      IERC721(_nftContract).supportsInterface(type(IERC721).interfaceId) || 
      IERC721(_nftContract).supportsInterface(type(IERC721Metadata).interfaceId),
      "NiftySwapFactory: The NFT contract must implement ERC 721." 
    );

    _;
  }

  constructor() {}

  /// @dev Deploys a niftyswap for an NFT collection.
  function createNiftySwap(address _nft) external onlyValidNFT(_nft) {

    // Deploy with CREATE2
    bytes memory niftySwapBytecode = abi.encodePacked(type(NiftySwap).creationCode);
    bytes32 niftySwapSalt = keccak256(abi.encode(block.number, msg.sender));

    address niftyswap = Create2.deploy(0, niftySwapSalt, niftySwapBytecode);

    // Update niftyswap registry
    swapRegistry[_nft] = niftyswap;

    emit NiftySwapCreated(_nft, niftyswap);
  }

  /// @dev Deploys `crossNiftySwap` for swapping NFTs across NFT collections.
  function createCrossSwap() external {
    
    // Deploy with CREATE2
    bytes memory crossSwapBytecode = abi.encodePacked(type(NiftySwap).creationCode);
    bytes32 crossSwapSalt = keccak256(abi.encode(block.number, msg.sender));
    
    crossNiftySwap = Create2.deploy(0, crossSwapSalt, crossSwapBytecode);
  }
}