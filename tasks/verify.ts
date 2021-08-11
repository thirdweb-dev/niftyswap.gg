import hre from 'hardhat'

// Test NFT
async function CoolCats() {

  await hre.run("verify:verify", {
    address: "0xB467a2b26E61fAd4D8B043B79E24c6d4e6Fa5a71",
    constructorArguments: [
    
    ]
  });
}

async function verify() {
  await CoolCats()
}

verify()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })