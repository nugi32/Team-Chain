import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { STATE_VAR_ADDRESS } from "./AddressConfig.js";

const ARTIFACT_PATH = "../../artifact/stateVariable.json";

async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(STATE_VAR_ADDRESS, artifact.abi, signer);
}

export async function _getMinDeadline(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMinRevisionTimeInHour();
    return data;
}

export async function _getMaxRevisionTime(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMaxRevision();
    return data;
}

export async function _getMaxReward(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMaxReward();
    return data;
}



export async function isRegistered(Contract, addr) {
      const user = await Contract.Users(addr);
      const isRegistered = user[5];

      return {
        isRegistered,
        message: isRegistered
          ? "Team Chain: Your address IS registered."
          : "Team Chain: Your address is NOT registered."
      };
}