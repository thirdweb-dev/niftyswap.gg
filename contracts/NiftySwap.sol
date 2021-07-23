// SPDX-License-Identifier: GPL 3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract NiftySwap {
  
  uint public nextSwapId;
  
  struct TradeableNFT {
    address ownerAtTrade;
    address nftContract;
    uint nftTokenId;
  }

  /// @dev NFT contract => tokenId => Swap ID
  mapping(address => mapping(uint => uint)) public swapId;

  /// @dev Swap ID => NFT
  mapping(uint => TradeableNFT) public tradeableNFT;

  /// @dev Swap ID of NFT to trade => Swap ID of NFT wanted => Interested in trade.
  mapping(uint => mapping(uint => bool)) public interestInTrade;

  /// @dev Events.
  event AvailableForTrade(address indexed owner, address indexed nftContract, uint indexed tokenId, uint swapId);
  event InterestInTrade(uint indexed swapIdOfWanted, uint indexed swapIdToTrade);
  event Trade(
      address indexed nftWanted,
      uint tokenIdOfWanted,
      address ownerOfWanted,
      uint swapIdOfWanted,

      address indexed nftTraded,
      uint tokenIdOfTraded,
      address ownerOfTraded,
      uint swapIdToTrade
    );

  modifier onlyTradeable(address _nftContract, uint _tokenId) {

    require(
      swapId[_nftContract][_tokenId] == 0 || tradeableNFT[swapId[_nftContract][_tokenId]].ownerAtTrade != msg.sender, 
      "NiftySwap: The NFT is already up for trade."
    );

    require(
      IERC721(_nftContract).supportsInterface(type(IERC721).interfaceId) || 
      IERC721(_nftContract).supportsInterface(type(IERC721Metadata).interfaceId),
      "NiftySwap: The NFT contract must implement ERC 721." 
    );

    require(IERC721(_nftContract).ownerOf(_tokenId) == msg.sender, "NiftySwap: Must own the NFT to trade it.");

    require(
      IERC721(_nftContract).getApproved(_tokenId) == address(this) || IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)),
      "NiftySwap: Must approve this contract to transfer the NFT."
    );

    _;
  }

  modifier onlyValidTrade(uint _swapIdNftWanted, uint _swapIdNftToTrade) {
    
    require(
      IERC721(
        tradeableNFT[_swapIdNftWanted].nftContract
      ).ownerOf(tradeableNFT[_swapIdNftWanted].nftTokenId) == tradeableNFT[_swapIdNftWanted].ownerAtTrade,
      "NiftySwap: The owner of the NFT wanted has transfered away their NFT."
    );

    require(
      IERC721(
        tradeableNFT[_swapIdNftWanted].nftContract
      ).getApproved(tradeableNFT[_swapIdNftWanted].nftTokenId) == address(this) ||
      
      IERC721(
        tradeableNFT[_swapIdNftWanted].nftContract
      ).isApprovedForAll(tradeableNFT[_swapIdNftWanted].ownerAtTrade, address(this)),
      "NiftySwap: This contract is no longer approved to transfer the NFT wanted."
    );

    require(
      IERC721(
        tradeableNFT[_swapIdNftToTrade].nftContract
      ).ownerOf(tradeableNFT[_swapIdNftToTrade].nftTokenId) == msg.sender,
      "NiftySwap: Cannot trade an NFT you did not own when it was put up for trade."
    );

    require(
      IERC721(
        tradeableNFT[_swapIdNftToTrade].nftContract
      ).getApproved(tradeableNFT[_swapIdNftToTrade].nftTokenId) == address(this) ||
      
      IERC721(
        tradeableNFT[_swapIdNftToTrade].nftContract
      ).isApprovedForAll(tradeableNFT[_swapIdNftToTrade].ownerAtTrade, address(this)),
      "NiftySwap: Must approve this contract to transfer the NFT to trade it."
    );
    
    _;
  }

  constructor() {}

  /**
   **   External functions.
  */

  /// @dev Signal that an NFT is available for trading.
  function putUpForTrade(address _nftContract, uint _tokenId) external onlyTradeable(_nftContract, _tokenId) {

    // Get swap ID
    uint id = _swapId();

    // Signal interest to trade.
    tradeableNFT[id] = TradeableNFT({
      ownerAtTrade: msg.sender,
      nftContract: _nftContract,
      nftTokenId: _tokenId
    });

    swapId[_nftContract][_tokenId] = id;

    emit AvailableForTrade(msg.sender, _nftContract, _tokenId, id);
  }

  /// @dev Signal interest to trade an NFT available for trade. If both parties signal interest, the NFTs are swapped.
  function signalInterest(uint _swapIdNftWanted, uint _swapIdNftToTrade, bool _interest) external {

    require(
      _swapIdNftWanted < nextSwapId && _swapIdNftToTrade < nextSwapId,
      "NiftySwap: Invalid swap ID provided."
    );
    require(
      tradeableNFT[_swapIdNftToTrade].ownerAtTrade == msg.sender, 
      "NiftySwap: Cannot signal interest to trade an NFT you do not own or did not put up for sale."
    );

    // If both parties signal interest, swap the NFTs.
    if(interestInTrade[_swapIdNftWanted][_swapIdNftToTrade] && _interest) {
      interestInTrade[_swapIdNftWanted][_swapIdNftToTrade] = false;
      trade(_swapIdNftWanted, _swapIdNftToTrade);
    } else {
      interestInTrade[_swapIdNftToTrade][_swapIdNftWanted] = true;
      emit InterestInTrade(_swapIdNftWanted, _swapIdNftToTrade);
    }
  }

  /**
   **   Internal functions.
  */

  /// @dev Trades one NFT for another.
  function trade(uint _swapIdNftWanted, uint _swapIdNftToTrade) internal onlyValidTrade(_swapIdNftWanted, _swapIdNftToTrade) {

    // Transfer NFT to trade.
    IERC721(tradeableNFT[_swapIdNftToTrade].nftContract).transferFrom(
      tradeableNFT[_swapIdNftToTrade].ownerAtTrade,
      tradeableNFT[_swapIdNftWanted].ownerAtTrade,
      tradeableNFT[_swapIdNftToTrade].nftTokenId
    );

    // Transfer NFT wanted.
    IERC721(tradeableNFT[_swapIdNftWanted].nftContract).transferFrom(
      tradeableNFT[_swapIdNftWanted].ownerAtTrade,
      tradeableNFT[_swapIdNftToTrade].ownerAtTrade,
      tradeableNFT[_swapIdNftWanted].nftTokenId
    );

    emit Trade(
      tradeableNFT[_swapIdNftWanted].nftContract,
      tradeableNFT[_swapIdNftWanted].nftTokenId, 
      tradeableNFT[_swapIdNftWanted].ownerAtTrade,
      _swapIdNftWanted, 
      
      tradeableNFT[_swapIdNftToTrade].nftContract,
      tradeableNFT[_swapIdNftToTrade].nftTokenId, 
      tradeableNFT[_swapIdNftToTrade].ownerAtTrade,
      _swapIdNftToTrade
    );
  }

  function _swapId() internal returns (uint id) {
    id = nextSwapId;
    nextSwapId++;
  }
}