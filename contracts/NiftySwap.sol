// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

import { IMultiwrap } from "@thirdweb-dev/contracts/contracts/interfaces/IMultiwrap.sol";

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface INiftySwap {

    struct Swap {
        IMultiwrap.WrappedContents bundleOffered;
        IMultiwrap.WrappedContents bundleWanted;
        address offeror;
    }

    event Swapped(uint256 swapId, Swap swapInfo);
    event Offered(uint256 indexed swapId, address indexed _offeror, IMultiwrap.WrappedContents _bundleOffered, IMultiwrap.WrappedContents _bundleWanted);

    /// @dev Performs a swap between two bundles.
    function swap(uint256 _swapId) external;

    /// @dev Stores an offer.
    function offer(
        address _offeror,
        IMultiwrap.WrappedContents memory _bundleOffered,
        IMultiwrap.WrappedContents memory _bundleWanted
    ) external;
}

contract NiftySwap is INiftySwap, ERC1155Holder {
    
    uint256 public nextSwapId;
    IMultiwrap multwrap;

    mapping(uint256 => Swap) public swapInfo;

    constructor(address _multiwrap) {
        multwrap = IMultiwrap(_multiwrap);
    }
    
    /// @dev Stores an offer.
    function offer(
        address _offeror,
        IMultiwrap.WrappedContents memory _bundleOffered,
        IMultiwrap.WrappedContents memory _bundleWanted
    ) 
        external
    {

        uint256 id = nextSwapId;
        nextSwapId += 1;

        swapInfo[id] = Swap({
            bundleOffered: _bundleOffered,
            bundleWanted: _bundleWanted,
            offeror: _offeror
        });

        emit Offered(id, _offeror, _bundleOffered, _bundleWanted);
    }

    /// @dev Performs a swap between two bundles.
    function swap(uint256 _swapId) external {

        Swap memory swapInfoForTrade = swapInfo[_swapId];

        verifyOwnership(msg.sender, swapInfoForTrade.bundleWanted);

        uint256 tokenIdOfWrappedOffered = multwrap.wrap(swapInfoForTrade.bundleOffered, 1, "");
        uint256 tokenIdOfWrappedWanted = multwrap.wrap(swapInfoForTrade.bundleWanted, 1, "");

        multwrap.unwrap(tokenIdOfWrappedOffered, 1, msg.sender);
        multwrap.unwrap(tokenIdOfWrappedWanted, 1, swapInfoForTrade.offeror);

        emit Swapped(_swapId, swapInfoForTrade);
    }

     /// @dev Verifies ownership of wrapped contents.
    function verifyOwnership(address _party, IMultiwrap.WrappedContents memory _bundle) public view {
        
        uint256 i;
        uint256 j;

        bool  isValidData;
        
        // ERC1155 tokens
        if(_bundle.erc1155AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc1155AssetContracts.length; i += 1) {
                if(!isValidData) {
                    break;
                }
                
                IERC1155 assetContract1155 = IERC1155(_bundle.erc1155AssetContracts[i]);
                isValidData = assetContract1155.isApprovedForAll(msg.sender, address(this));
                
            }
            require(isValidData, "not owned 1155");
        }

        // ERC721 tokens
        if(_bundle.erc721AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc721AssetContracts.length; i += 1) {
                
                if(!isValidData) {
                    break;
                }

                IERC721 assetContract721 = IERC721(_bundle.erc721AssetContracts[i]);
                
                for(j = 0; j < _bundle.erc1155TokensToWrap[i].length; j += 1) {
                    address owner = assetContract721.ownerOf(_bundle.erc721TokensToWrap[i][j]);
                    isValidData = owner ==  _party;

                    if(!isValidData) {
                        break;
                    }
                }
            }
            require(isValidData, "not owned 721");
        }

        // ERC20 tokens
        if(_bundle.erc20AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc20AssetContracts.length; i += 1) {
                
                if(!isValidData) {
                    break;
                }

                IERC20 assetContract20 = IERC20(_bundle.erc20AssetContracts[i]);

                uint256 bal = assetContract20.balanceOf(_party);
                isValidData = bal >=  _bundle.erc20AmountsToWrap[i];
            }
            require(isValidData, "not owned 20");
        }
    }


}