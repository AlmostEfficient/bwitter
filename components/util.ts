import {
	AnchorProvider, BN, Program, utils, web3
} from '@project-serum/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import {  Connection, PublicKey } from '@solana/web3.js';

const idl = require('../public/idl.json');
const utf8 = utils.bytes.utf8

export function getProgram(anchorWallet: AnchorWallet) {
  const network = "http://127.0.0.1:8899";
  const connection = new Connection(network, "processed");
  const provider = new AnchorProvider(
    connection, anchorWallet, {"preflightCommitment": "processed"},
  );
  return new Program(idl, idl.metadata.address, provider);
}

export async function getHasAccount(anchorWallet: AnchorWallet) {
  const program = getProgram(anchorWallet)
  try {
    await getStateAccount(anchorWallet.publicKey, program);
    // since we didn't throw an error, we must have an account
    return true;
  } catch (err) {
    console.log(err);
  }
  // since we errored out, we don't have an account
  return false;
}

export async function getStatePDA(publicKey: PublicKey, program: Program) {
  let [statePDA] = await web3.PublicKey.findProgramAddress(
    [utf8.encode('state'), publicKey.toBuffer()],
    program.programId,
  )
  return statePDA;
}

export async function getStateAccount(publicKey: PublicKey, program: Program) {
    const statePDA = await getStatePDA(publicKey, program);
    const stateAccount = await program.account.stateAccount.fetch(statePDA);
    return stateAccount;
}

export async function getTweetPDA(publicKey: PublicKey, program: Program, tweetCount: number) { 
  // note that the 8 here refers to 8 bit for each index, so this is a 64 bit
  let [tweetPDA] = await web3.PublicKey.findProgramAddress(
    [utf8.encode('tweet'), publicKey.toBuffer(), new BN(tweetCount).toArrayLike(Buffer, "be", 8)],
    program.programId,
  )
  return tweetPDA;
}

export async function getTweetAccount(publicKey: PublicKey, program: Program, tweetCount: number) {
  const tweetPDA = await getTweetPDA(publicKey, program, tweetCount);
  const tweetAccount = await program.account.tweetAccount.fetch(tweetPDA);
  return tweetAccount;
}

export async function getFollowPDA(publicKey: PublicKey, program: Program, followCount: number) {
  // note that the 8 here refers to 8 bit for each index, so this is a 64 bit
  let [followPDA] = await web3.PublicKey.findProgramAddress(
    [utf8.encode('follow'), publicKey.toBuffer(), new BN(followCount).toArrayLike(Buffer, "be", 8)],
    program.programId,
  )
  return followPDA
}

export async function getFollowAccount(publicKey: PublicKey, program: Program, followCount: number) {
  // note that the 8 here refers to 8 bit for each index, so this is a 64 bit
  const followPDA = await getFollowPDA(publicKey, program, followCount);
  const followAccount = await program.account.followAccount.fetch(followPDA);
  return followAccount;
}